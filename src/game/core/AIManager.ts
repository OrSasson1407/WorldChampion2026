import { GameState } from './GameState';
import { SimulationManager } from './SimulationManager';
import { EspionageType, TreatyType, ResourceType, AIPersonality, EventCategory } from './Models';
import { EventGenerator } from './EventGenerator';

interface PersonalityWeights {
  warChance: number;
  techChance: number;
  espionageChance: number;
  allianceChance: number;
  tradeChance: number;
  electionFocus: number;
}

const PERSONALITY_WEIGHTS: Record<AIPersonality, PersonalityWeights> = {
  [AIPersonality.AGGRESSIVE]: { warChance: 0.12, techChance: 0.10, espionageChance: 0.18, allianceChance: 0.03, tradeChance: 0.05, electionFocus: 0.3 },
  [AIPersonality.DEFENSIVE]:  { warChance: 0.02, techChance: 0.15, espionageChance: 0.08, allianceChance: 0.15, tradeChance: 0.08, electionFocus: 0.6 },
  [AIPersonality.ECONOMIC]:   { warChance: 0.01, techChance: 0.25, espionageChance: 0.05, allianceChance: 0.08, tradeChance: 0.20, electionFocus: 0.5 },
};

// How many turns a grudge against a past aggressor lingers after the war ends.
const GRUDGE_DECAY_TURNS = 8;
// How many turns the world takes to ramp from calm to fully escalated.
const ESCALATION_TURNS = 40;
// A target is only considered "beatable" if their power (plus allies) doesn't
// exceed this multiple of the AI's own military power.
const MAX_WINNABLE_POWER_RATIO = 1.5;

function hashCountryId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export class AIManager {
    // Phase 7 step 35: personality profile, explicit on the country if set, otherwise derived deterministically
    public static getPersonality(countryId: string, explicit?: AIPersonality): AIPersonality {
        if (explicit) return explicit;
        const values = [AIPersonality.AGGRESSIVE, AIPersonality.DEFENSIVE, AIPersonality.ECONOMIC];
        return values[hashCountryId(countryId) % values.length];
    }

    private static monthsUntil(fromDate: string, toDate: string): number {
        const [fy, fm] = fromDate.split('-').map(Number);
        const [ty, tm] = toDate.split('-').map(Number);
        return (ty - fy) * 12 + (tm - fm);
    }

    private static isAllied(state: GameState, a: string, b: string): boolean {
        return Object.values(state.treaties).some(t =>
            t.active &&
            (t.type === TreatyType.ALLIANCE || t.type === TreatyType.DEFENSE_PACT) &&
            t.memberCountryIds.includes(a) && t.memberCountryIds.includes(b)
        );
    }

    private static getAllies(state: GameState, countryId: string): string[] {
        const allies = new Set<string>();
        for (const treaty of Object.values(state.treaties)) {
            if (!treaty.active) continue;
            if (treaty.type !== TreatyType.ALLIANCE && treaty.type !== TreatyType.DEFENSE_PACT) continue;
            if (!treaty.memberCountryIds.includes(countryId)) continue;
            for (const m of treaty.memberCountryIds) {
                if (m !== countryId) allies.add(m);
            }
        }
        return Array.from(allies);
    }

    private static combinedMilitaryPower(state: GameState, countryIds: string[]): number {
        return countryIds.reduce((sum, id) => sum + (state.countries[id]?.militaryPower ?? 0), 0);
    }

    // Strength- and alliance-aware target selection: prefers weaker, unallied,
    // winnable targets, and heavily favors a standing rival if one exists.
    private static pickWarTarget(
        state: GameState,
        countryId: string,
        candidates: string[],
        allowUpwardStrikes: boolean
    ): string | null {
        const country = state.countries[countryId];
        let best: string | null = null;
        let bestScore = -Infinity;

        for (const targetId of candidates) {
            if (AIManager.isAllied(state, countryId, targetId)) continue;

            const target = state.countries[targetId];
            if (!target) continue;

            const isRival = country.aiRivalId === targetId;
            const powerRatio = (target.militaryPower + 1) / (country.militaryPower + 1);

            // Skip targets stronger than us unless we're aggressive/desperate for
            // revenge against a known rival.
            if (powerRatio > 1.1 && !isRival && !allowUpwardStrikes) continue;

            // Never pick a fight we can't realistically win, even accounting for
            // the target's defensive allies.
            const targetAllyPower = AIManager.combinedMilitaryPower(state, AIManager.getAllies(state, targetId));
            const effectiveTargetPower = target.militaryPower + targetAllyPower;
            if (effectiveTargetPower > country.militaryPower * MAX_WINNABLE_POWER_RATIO) continue;

            const relation = country.diplomacy[targetId] || 0;
            let score = (1 / powerRatio) - relation / 100;
            if (isRival) score += 2;

            if (score > bestScore) {
                bestScore = score;
                best = targetId;
            }
        }
        return best;
    }

    // Tracks whether this country is currently being attacked, and updates its
    // persistent grudge/rival memory accordingly. Grudges linger for a few
    // turns after peace so retaliation still feels earned, then fade.
    private static updateMemory(state: GameState, countryId: string): boolean {
        const country = state.countries[countryId];
        const warAgainstMe = Object.values(state.wars).find(w => w.defenderId === countryId);

        if (warAgainstMe) {
            if (country.aiRivalId !== warAgainstMe.attackerId) {
                country.aiRivalId = warAgainstMe.attackerId;
                country.aiGrudgeTurns = GRUDGE_DECAY_TURNS;
                const attackerName = state.countries[warAgainstMe.attackerId]?.name ?? 'an aggressor';
                EventGenerator.emit(state, countryId, EventCategory.MILITARY, `${country.name} will not forget ${attackerName}'s aggression.`, 2);
            }
            return true;
        }

        if (country.aiRivalId) {
            country.aiGrudgeTurns = (country.aiGrudgeTurns ?? 0) - 1;
            if (country.aiGrudgeTurns <= 0) {
                country.aiRivalId = undefined;
                country.aiGrudgeTurns = undefined;
            }
        }
        return false;
    }

    // Assigns a persistent multi-turn goal instead of re-rolling behavior every
    // single turn, so AI intent is legible across a stretch of the game.
    private static updateGoal(country: import('./Models').Country, weights: PersonalityWeights): void {
        const inDeficit = country.expenses > country.income;
        if (!country.aiGoal || (country.aiGoalTurns ?? 0) <= 0) {
            const roll = Math.random();
            if (inDeficit || country.treasury < 3000000) {
                country.aiGoal = 'REBUILD';
            } else if (roll < weights.warChance * 3) {
                country.aiGoal = 'EXPAND';
            } else {
                country.aiGoal = 'CONSOLIDATE';
            }
            country.aiGoalTurns = 4 + Math.floor(Math.random() * 4);
        } else {
            country.aiGoalTurns = (country.aiGoalTurns ?? 1) - 1;
        }
    }

    public static makeDecisions(simulation: SimulationManager, state: GameState): void {
        // 0..1 ramp: the world gets tenser as the game goes on rather than every
        // turn feeling like an independent coin flip.
        const escalation = Math.min(state.currentTurn / ESCALATION_TURNS, 1);

        for (const countryId in state.countries) {
            const country = state.countries[countryId];
            if (!country.isAI) continue;
            if (country.occupationStatus !== 'INDEPENDENT') continue;

            const personality = AIManager.getPersonality(countryId, country.aiPersonality);
            const baseWeights = PERSONALITY_WEIGHTS[personality];
            const weights: PersonalityWeights = {
                ...baseWeights,
                warChance: baseWeights.warChance * (1 + escalation * 0.6),
                espionageChance: baseWeights.espionageChance * (1 + escalation * 0.3),
            };

            const targetCountryIds = Object.keys(state.countries)
                .filter(id => id !== countryId && state.countries[id].occupationStatus === 'INDEPENDENT');
            if (targetCountryIds.length === 0) continue;

            const underAttack = AIManager.updateMemory(state, countryId);
            AIManager.updateGoal(country, weights);

            const inDeficit = country.expenses > country.income;
            const canAffordRisk = !inDeficit || personality === AIPersonality.ECONOMIC;

            // 1. Declare war? Strength-aware, alliance-aware, biased by goal and grudge.
            if (country.aiGoal !== 'REBUILD' && canAffordRisk && country.treasury > 10000000) {
                const allowUpwardStrikes = personality === AIPersonality.AGGRESSIVE || !!country.aiRivalId;
                const warTarget = AIManager.pickWarTarget(state, countryId, targetCountryIds, allowUpwardStrikes);
                if (warTarget) {
                    const isRivalStrike = warTarget === country.aiRivalId;
                    const warRoll = isRivalStrike ? weights.warChance * 2.5 : weights.warChance;
                    if (Math.random() < warRoll) {
                        simulation.declareWar(countryId, warTarget);
                    }
                }
            }

            const targetId = targetCountryIds[Math.floor(Math.random() * targetCountryIds.length)];

            // 2. Improve tech? Skipped while in deficit (unless economically minded).
            if (canAffordRisk && Math.random() < weights.techChance && country.treasury > 2000000) {
                simulation.investInTech(countryId);
            }

            // 3. Perform espionage? Prioritize a standing rival over a random pick.
            if (Math.random() < weights.espionageChance && country.treasury > 1000000) {
                const espionageTarget = country.aiRivalId ?? targetId;
                const types = Object.values(EspionageType);
                const randomType = types[Math.floor(Math.random() * types.length)];
                simulation.runEspionage(countryId, espionageTarget, randomType);
            }

            const relation = country.diplomacy[targetId] || 0;

            // 4. Seek an alliance? Never with a country we're actively feuding with.
            if (Math.random() < weights.allianceChance && relation > 30 && targetId !== country.aiRivalId) {
                if (!AIManager.isAllied(state, countryId, targetId)) {
                    simulation.signTreaty(TreatyType.ALLIANCE, [countryId, targetId]);
                }
            }

            // 5. Pursue a trade agreement? Economic personalities chase the richest partner.
            if (canAffordRisk && Math.random() < weights.tradeChance && country.treasury > 500000 && relation >= 0) {
                const tradeTargetId = personality === AIPersonality.ECONOMIC
                    ? targetCountryIds.reduce((best, id) =>
                        state.countries[id].gdp > (state.countries[best]?.gdp ?? 0) ? id : best, targetCountryIds[0])
                    : targetId;

                const alreadyTrading = Object.values(state.tradeAgreements).some(t =>
                    (t.countryAId === countryId && t.countryBId === tradeTargetId) ||
                    (t.countryAId === tradeTargetId && t.countryBId === countryId)
                );
                if (!alreadyTrading) {
                    const resources = Object.values(ResourceType);
                    const resource = resources[Math.floor(Math.random() * resources.length)];
                    const volume = 50 + Math.floor(Math.random() * 200);
                    simulation.createTradeAgreement(countryId, tradeTargetId, resource, volume);
                }
            }

            // 6. React to politics: pre-election spending, or shift to a war footing under attack.
            const government = state.governments[countryId];
            if (government) {
                const monthsToElection = AIManager.monthsUntil(state.currentDate, government.nextElectionDate);
                if (monthsToElection >= 0 && monthsToElection <= 3 && government.approvalRating < 50 && Math.random() < weights.electionFocus) {
                    simulation.setBudgetAllocation(countryId, 20, 60, 20);
                } else if (underAttack && (country.budgetAllocation?.military ?? 0) < 50) {
                    simulation.setBudgetAllocation(countryId, 55, 25, 20);
                }
            }
        }
    }
}
