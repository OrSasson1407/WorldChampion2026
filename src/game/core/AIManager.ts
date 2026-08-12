import { GameState } from './GameState';
import { SimulationManager } from './SimulationManager';
import { EspionageType, TreatyType, ResourceType, AIPersonality } from './Models';

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

    public static makeDecisions(simulation: SimulationManager, state: GameState): void {
        for (const countryId in state.countries) {
            const country = state.countries[countryId];
            if (!country.isAI) continue;

            const personality = AIManager.getPersonality(countryId, country.aiPersonality);
            const weights = PERSONALITY_WEIGHTS[personality];

            const targetCountryIds = Object.keys(state.countries).filter(id => id !== countryId);
            if (targetCountryIds.length === 0) continue;
            const targetId = targetCountryIds[Math.floor(Math.random() * targetCountryIds.length)];

            // 1. Declare war? (weighted by personality)
            if (Math.random() < weights.warChance && country.treasury > 10000000) {
                simulation.declareWar(countryId, targetId);
            }

            // 2. Improve tech? (weighted by personality)
            if (Math.random() < weights.techChance && country.treasury > 2000000) {
                simulation.investInTech(countryId);
            }

            // 3. Perform espionage? (weighted by personality)
            if (Math.random() < weights.espionageChance && country.treasury > 1000000) {
                const types = Object.values(EspionageType);
                const randomType = types[Math.floor(Math.random() * types.length)];
                simulation.runEspionage(countryId, targetId, randomType);
            }

            const relation = country.diplomacy[targetId] || 0;

            // 4. Seek an alliance? (Phase 7 step 34: weigh alliances)
            if (Math.random() < weights.allianceChance && relation > 30) {
                const alreadyAllied = Object.values(state.treaties).some(t =>
                    t.active && t.type === TreatyType.ALLIANCE &&
                    t.memberCountryIds.includes(countryId) && t.memberCountryIds.includes(targetId)
                );
                if (!alreadyAllied) {
                    simulation.signTreaty(TreatyType.ALLIANCE, [countryId, targetId]);
                }
            }

            // 5. Pursue a trade agreement? (Phase 7 step 34: weigh trade)
            if (Math.random() < weights.tradeChance && country.treasury > 500000 && relation >= 0) {
                const alreadyTrading = Object.values(state.tradeAgreements).some(t =>
                    (t.countryAId === countryId && t.countryBId === targetId) ||
                    (t.countryAId === targetId && t.countryBId === countryId)
                );
                if (!alreadyTrading) {
                    const resources = Object.values(ResourceType);
                    const resource = resources[Math.floor(Math.random() * resources.length)];
                    const volume = 50 + Math.floor(Math.random() * 200);
                    simulation.createTradeAgreement(countryId, targetId, resource, volume);
                }
            }

            // 6. React to an upcoming election? (Phase 7 step 34: weigh elections)
            const government = state.governments[countryId];
            if (government) {
                const monthsToElection = AIManager.monthsUntil(state.currentDate, government.nextElectionDate);
                if (monthsToElection >= 0 && monthsToElection <= 3 && government.approvalRating < 50 && Math.random() < weights.electionFocus) {
                    simulation.setBudgetAllocation(countryId, 20, 60, 20);
                }
            }
        }
    }
}