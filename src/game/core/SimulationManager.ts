import { GameState } from './GameState';
import { Country, Army, War, EspionageType, Government, PoliticalParty, ResourceType, MilitaryBranch, MilitaryBranchType, General, Treaty, TreatyType, Sanction, IntelNetwork, IntelCategory, EventCategory } from './Models';
import { EventGenerator } from './EventGenerator';
import { AIManager } from './AIManager';

const ESPIONAGE_CATEGORY: Record<EspionageType, IntelCategory> = {
  [EspionageType.SPY]: IntelCategory.HUMINT,
  [EspionageType.STEAL_MILITARY_PLANS]: IntelCategory.HUMINT,
  [EspionageType.STEAL_TECH]: IntelCategory.SIGINT,
  [EspionageType.ECONOMIC_ESPIONAGE]: IntelCategory.SIGINT,
  [EspionageType.SABOTAGE_FACTORY]: IntelCategory.HUMINT,
  [EspionageType.SABOTAGE_INFRA]: IntelCategory.CYBER,
  [EspionageType.DISRUPT_SUPPLY]: IntelCategory.CYBER,
  [EspionageType.PROPAGANDA]: IntelCategory.CYBER,
  [EspionageType.INFLUENCE_ELECTION]: IntelCategory.CYBER,
  [EspionageType.SUPPORT_OPPOSITION]: IntelCategory.HUMINT,
  [EspionageType.FUND_REBELS]: IntelCategory.HUMINT,
  [EspionageType.COUNTER_INTEL]: IntelCategory.HUMINT,
  [EspionageType.EXPOSE_SPY]: IntelCategory.SIGINT,
  [EspionageType.STEAL_RESOURCES]: IntelCategory.HUMINT,
  [EspionageType.BLACKMAIL]: IntelCategory.HUMINT,
  [EspionageType.DISINFORMATION]: IntelCategory.CYBER,
};

export class SimulationManager {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  public processTurn(): void {
    console.log(`Processing turn ${this.state.currentTurn + 1}...`);
    
    AIManager.makeDecisions(this, this.state);
    
    this.resolveEconomy();
    this.resolveDiplomacy();
    this.resolveMilitary();
    this.resolveIntelligence();
    this.resolvePolitics();

    this.state.currentTurn += 1;
    this.advanceDate();
    console.log(`Turn processed. New date: ${this.state.currentDate}`);
  }

  // ===================== PHASE 2: DEEP ECONOMY =====================
  private resolveEconomy(): void {
    console.log("Resolving economy...");
    this.resolveTrade();

    for (const countryId in this.state.countries) {
      const country = this.state.countries[countryId];
      const centralBank = this.state.centralBanks[countryId];
      const economyBefore = EventGenerator.snapshotEconomy(country);

      const budget = country.budgetAllocation || { military: 30, social: 40, infrastructure: 30 };
      country.budgetAllocation = budget;

      const militaryUpkeep = country.militaryPower * 10000 * (budget.military / 30);
      const socialSpending = country.gdp * 0.001 * (budget.social / 40);
      const infraSpending = country.gdp * 0.0005 * (budget.infrastructure / 30);
      country.expenses = 50000000 + militaryUpkeep + socialSpending + infraSpending;

      const unemployment = country.unemployment ?? 5;
      const taxRate = 0.2;
      const revenue = (country.gdp * taxRate / 12) * (1 - unemployment / 200);
      country.income = revenue;

      const sanctionPenalty = this.getSanctionPenalty(countryId);
      country.income *= (1 - sanctionPenalty / 100);

      country.treasury += (country.income - country.expenses);

      const rateDrag = centralBank ? (centralBank.interestRate - 3) * 0.0002 : 0;
      const infraBoost = (budget.infrastructure / 100) * 0.0015;
      const netGrowth = infraBoost - rateDrag - (sanctionPenalty * 0.0001);
      country.gdp *= (1.001 + netGrowth);

      country.unemployment = Math.min(Math.max(unemployment - netGrowth * 50 + (Math.random() - 0.5) * 0.3, 2), 30);

      const debtPressure = country.debt > country.gdp * 0.6 ? 0.3 : 0;
      const rateCooling = centralBank ? (centralBank.interestRate - 3) * 0.1 : 0;
      country.inflation = Math.max(country.inflation + (debtPressure - rateCooling) + (Math.random() - 0.5) * 0.1, -2);

      if (centralBank) {
          if (country.inflation > 4) centralBank.interestRate = Math.min(centralBank.interestRate + 0.1, 20);
          else if (country.inflation < 1) centralBank.interestRate = Math.max(centralBank.interestRate - 0.1, 0.1);
          centralBank.exchangeRateToUSD *= (1 + (centralBank.interestRate - 3) * 0.0005);
          centralBank.foreignReserves += country.income * 0.01;
      }
      EventGenerator.checkEconomyTriggers(this.state, countryId, economyBefore, country);
    }
  }

  private resolveTrade(): void {
      console.log("Resolving trade...");
      const pricePerUnit = 100;
      for (const tradeId in this.state.tradeAgreements) {
          const trade = this.state.tradeAgreements[tradeId];
          const countryA = this.state.countries[trade.countryAId];
          const countryB = this.state.countries[trade.countryBId];
          if (!countryA || !countryB) continue;

          const tradeValue = trade.volumePerTurn * pricePerUnit;
          countryB.treasury -= tradeValue;
          countryA.treasury += tradeValue;
      }
  }

  public createTradeAgreement(countryAId: string, countryBId: string, resource: ResourceType, volumePerTurn: number): void {
      const id = `trade-${Date.now()}`;
      this.state.tradeAgreements[id] = { id, countryAId, countryBId, resource, volumePerTurn };
      console.log(`Trade agreement created: ${id} (${resource}, ${volumePerTurn}/turn)`);
  }

  public setBudgetAllocation(countryId: string, military: number, social: number, infrastructure: number): void {
      const country = this.state.countries[countryId];
      if (!country) return;
      const total = military + social + infrastructure;
      if (total <= 0) return;
      country.budgetAllocation = {
          military: (military / total) * 100,
          social: (social / total) * 100,
          infrastructure: (infrastructure / total) * 100
      };
  }

  // ===================== PHASE 1: DOMESTIC POLITICS =====================
  private resolvePolitics(): void {
      console.log("Resolving politics...");
      for (const countryId in this.state.countries) {
          const country = this.state.countries[countryId];
          const government = this.state.governments[countryId];
          const politicsBefore = { stability: country.stability, approvalRating: government ? government.approvalRating : 0 };

          if (country.debt > country.gdp * 0.5) {
              country.stability -= 0.05;
          }
          country.stability = Math.min(Math.max(country.stability, 0), 1);

          if (!government) continue;

          this.updateApproval(country, government);
          this.updateCorruption(government);
          this.updateCoupRisk(country, government);
          this.checkForCoup(countryId, country, government);
          this.checkForElection(countryId, government);
          EventGenerator.checkPoliticsTriggers(this.state, countryId, politicsBefore, { stability: country.stability, approvalRating: government.approvalRating });
      }
  }

  private updateApproval(country: Country, government: Government): void {
      let delta = 0;
      if (country.income < country.expenses) delta -= 0.5;
      if (country.treasury > 0) delta += 0.2;
      if (country.stability < 0.4) delta -= 1;
      if (government.corruptionLevel > 50) delta -= 0.5;
      if ((country.unemployment ?? 5) > 10) delta -= 0.3;
      delta += (Math.random() - 0.5);

      government.approvalRating = Math.min(Math.max(government.approvalRating + delta, 0), 100);
  }

  private updateCorruption(government: Government): void {
      const drift = government.approvalRating > 60 ? -0.2 : 0.3;
      government.corruptionLevel = Math.min(Math.max(government.corruptionLevel + drift + (Math.random() * 0.4), 0), 100);
  }

  private updateCoupRisk(country: Country, government: Government): void {
      let risk = 0;
      if (government.approvalRating < 25) risk += 15;
      if (country.stability < 0.3) risk += 15;
      if (government.corruptionLevel > 70) risk += 10;
      government.coupRisk = Math.min(Math.max(risk, 0), 100);
  }

  private checkForCoup(countryId: string, country: Country, government: Government): void {
      if (government.coupRisk <= 0) return;
      const roll = Math.random() * 100;
      if (roll < government.coupRisk) {
          console.log(`COUP in ${country.name}!`);
          EventGenerator.emit(this.state, countryId, EventCategory.POLITICS, `A military coup has overthrown the government of ${country.name}.`, 5);
          const newRulingId = `${countryId}-party-coup-${this.state.currentTurn}`;
          government.parties.push({
              id: newRulingId,
              name: "Coup Government",
              ideology: "Military Junta",
              seats: 100,
              popularity: 50
          } as PoliticalParty);
          government.rulingPartyId = newRulingId;
          government.approvalRating = 50;
          government.corruptionLevel = Math.max(government.corruptionLevel - 20, 0);
          government.coupRisk = 0;
          country.stability = Math.max(country.stability - 0.2, 0);
          country.governmentType = "Military Junta";
      }
  }

  private checkForElection(countryId: string, government: Government): void {
      if (this.state.currentDate < government.nextElectionDate) return;
      console.log(`Election held in ${countryId}`);
      const electionCountryName = this.state.countries[countryId]?.name ?? countryId;
      EventGenerator.emit(this.state, countryId, EventCategory.POLITICS, `${electionCountryName} has held a general election.`, 2);

      let totalPopularity = 0;
      for (const party of government.parties) {
          if (party.id === government.rulingPartyId) {
              party.popularity = government.approvalRating;
          } else {
              party.popularity = Math.min(Math.max(party.popularity + (Math.random() * 10 - 5), 0), 100);
          }
          totalPopularity += party.popularity;
      }
      for (const party of government.parties) {
          party.seats = totalPopularity > 0 ? Math.round((party.popularity / totalPopularity) * 100) : party.seats;
      }

      const winner = government.parties.reduce((a, b) => (a.seats > b.seats ? a : b));
      government.rulingPartyId = winner.id;

      const [year, month, day] = government.nextElectionDate.split('-').map(Number);
      government.nextElectionDate = `${year + 4}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  public recruitArmy(countryId: string): void {
      const country = this.state.countries[countryId];
      const cost = 1000000;
      if (country && country.treasury >= cost) {
          country.treasury -= cost;
          country.militaryPower += 1;
      }
  }

  public improveRelations(actorCountryId: string, targetCountryId: string): void {
      const actor = this.state.countries[actorCountryId];
      if (actor && actor.treasury >= 100000) {
          actor.treasury -= 100000;
          const currentRelation = actor.diplomacy[targetCountryId] || 0;
          actor.diplomacy[targetCountryId] = Math.min(currentRelation + 10, 100);
      }
  }

  public setInterestRate(countryId: string, rate: number): void {
      const centralBank = this.state.centralBanks[countryId];
      if (!centralBank) return;
      centralBank.interestRate = Math.min(Math.max(rate, 0), 25);
  }

  // ===================== PHASE 4: DEEP DIPLOMACY =====================
  public signTreaty(type: TreatyType, memberCountryIds: string[]): string {
      const id = `treaty-${Date.now()}`;
      this.state.treaties[id] = {
          id,
          type,
          memberCountryIds,
          signedDate: this.state.currentDate,
          active: true
      };
      for (const cid of memberCountryIds) {
          const c = this.state.countries[cid];
          if (c) c.internationalReputation = Math.min((c.internationalReputation ?? 50) + 2, 100);
      }
      console.log(`Treaty signed: ${type} between ${memberCountryIds.join(', ')}`);
      return id;
  }

  public breakTreaty(treatyId: string): void {
      const treaty = this.state.treaties[treatyId];
      if (!treaty) return;
      treaty.active = false;
      for (const cid of treaty.memberCountryIds) {
          const c = this.state.countries[cid];
          if (c) c.internationalReputation = Math.max((c.internationalReputation ?? 50) - 15, 0);
      }
      console.log(`Treaty broken: ${treatyId}`);
  }

  public imposeSanction(sourceCountryId: string, targetCountryId: string, severity: number): string {
      const id = `sanction-${Date.now()}`;
      this.state.sanctions[id] = { id, sourceCountryId, targetCountryId, severity: Math.min(Math.max(severity, 0), 100) };
      const source = this.state.countries[sourceCountryId];
      const target = this.state.countries[targetCountryId];
      if (source && target) {
          source.diplomacy[targetCountryId] = (source.diplomacy[targetCountryId] || 0) - 20;
          target.diplomacy[sourceCountryId] = (target.diplomacy[sourceCountryId] || 0) - 10;
      }
      console.log(`Sanction imposed: ${sourceCountryId} -> ${targetCountryId} (severity ${severity})`);
      return id;
  }

  public liftSanction(sanctionId: string): void {
      delete this.state.sanctions[sanctionId];
  }

  private getSanctionPenalty(countryId: string): number {
      let total = 0;
      for (const sid in this.state.sanctions) {
          const s = this.state.sanctions[sid];
          if (s.targetCountryId === countryId) total += s.severity * 0.2;
      }
      return Math.min(total, 60);
  }

  private getActiveAllies(countryId: string): string[] {
      const allies = new Set<string>();
      for (const tid in this.state.treaties) {
          const treaty = this.state.treaties[tid];
          if (!treaty.active) continue;
          if (treaty.type !== TreatyType.DEFENSE_PACT && treaty.type !== TreatyType.ALLIANCE) continue;
          if (treaty.memberCountryIds.includes(countryId)) {
              for (const m of treaty.memberCountryIds) {
                  if (m !== countryId) allies.add(m);
              }
          }
      }
      return Array.from(allies);
  }

  private triggerDefensePacts(attackerId: string, defenderId: string): void {
      const defenderAllies = this.getActiveAllies(defenderId);
      for (const allyId of defenderAllies) {
          if (allyId === attackerId) continue;
          this.declareWar(attackerId, allyId, true);
      }
  }

  public declareWar(attackerId: string, defenderId: string, skipPactTrigger: boolean = false): void {
      for (const warId in this.state.wars) {
          const war = this.state.wars[warId];
          if ((war.attackerId === attackerId && war.defenderId === defenderId) ||
              (war.attackerId === defenderId && war.defenderId === attackerId)) {
              console.log("War already exists between these countries.");
              return;
          }
      }
      const id = `war-${Date.now()}-${attackerId}-${defenderId}`;
      this.state.wars[id] = { 
          id, 
          attackerId, 
          defenderId, 
          warScore: 0,
          casualties: { attacker: 0, defender: 0 }
      };
      console.log(`War declared: ${attackerId} vs ${defenderId}`);

      const attacker = this.state.countries[attackerId];
      if (attacker) attacker.internationalReputation = Math.max((attacker.internationalReputation ?? 50) - 5, 0);

      if (!skipPactTrigger) {
          this.triggerDefensePacts(attackerId, defenderId);
      }
  }

  public negotiatePeace(warId: string): void {
      if (this.state.wars[warId]) {
          delete this.state.wars[warId];
          console.log(`Peace negotiated for war: ${warId}`);
      }
  }

  // ===================== PHASE 5: DEEP INTELLIGENCE =====================
  private getOrCreateNetwork(ownerId: string, targetId: string, category: IntelCategory): IntelNetwork {
      const key = `${ownerId}-${targetId}-${category}`;
      let network = this.state.intelNetworks[key];
      if (!network) {
          network = { id: key, ownerCountryId: ownerId, targetCountryId: targetId, category, networkStrength: 0, exposureRisk: 0 };
          this.state.intelNetworks[key] = network;
      }
      return network;
  }

  public recruitAgent(ownerId: string, targetId: string, category: IntelCategory): { success: boolean, message: string } {
      const owner = this.state.countries[ownerId];
      const cost = 750000;
      if (!owner || owner.treasury < cost) return { success: false, message: "Not enough funds to recruit an agent." };
      owner.treasury -= cost;
      const network = this.getOrCreateNetwork(ownerId, targetId, category);
      network.networkStrength = Math.min(network.networkStrength + 15, 100);
      network.exposureRisk = Math.min(network.exposureRisk + 5, 100);
      return { success: true, message: `Agent recruited. ${category} network strength now ${network.networkStrength.toFixed(0)}.` };
  }

  public conductEspionage(actorId: string, targetId: string): void {
      const actor = this.state.countries[actorId];
      const target = this.state.countries[targetId];
      if (actor && target && actor.treasury >= 500000) {
          actor.treasury -= 500000;
          target.stability = Math.max(target.stability - 0.05, 0);
          console.log(`Espionage conducted by ${actor.name} on ${target.name}`);
      }
  }

  public runEspionage(actorId: string, targetId: string, type: EspionageType): { success: boolean, message: string } {
      const actor = this.state.countries[actorId];
      const target = this.state.countries[targetId];
      if (!actor || !target) return { success: false, message: "Invalid target or actor." };
      
      const cost = 1000000;
      if (actor.treasury < cost) return { success: false, message: "Not enough funds." };

      const category = ESPIONAGE_CATEGORY[type];
      const network = this.getOrCreateNetwork(actorId, targetId, category);

      // Counter-intel on the target side suppresses the actor's network for this category
      const defenderCounterNetwork = this.getOrCreateNetwork(targetId, actorId, category);
      const counterSuppression = defenderCounterNetwork.networkStrength * 0.3;

      // Base 60% success, boosted by owned network strength, reduced by target's counter-intel
      const successChance = Math.min(Math.max(0.6 + (network.networkStrength / 200) - (counterSuppression / 200), 0.1), 0.95);
      const success = Math.random() < successChance;

      if (!success) {
          actor.treasury -= cost / 2;
          network.exposureRisk = Math.min(network.exposureRisk + 15, 100);
          return { success: false, message: `Operation ${type} failed! Network exposure rising (${network.exposureRisk.toFixed(0)}%).` };
      }

      actor.treasury -= cost;
      network.networkStrength = Math.min(network.networkStrength + 3, 100);
      network.exposureRisk = Math.min(network.exposureRisk + 5, 100);
      
      switch(type) {
          case EspionageType.SPY: target.stability -= 0.05; break;
          case EspionageType.STEAL_MILITARY_PLANS: target.militaryPower *= 0.95; actor.militaryPower *= 1.02; break;
          case EspionageType.STEAL_TECH: target.technologyLevel -= 5; actor.technologyLevel += 2; break;
          case EspionageType.ECONOMIC_ESPIONAGE: target.treasury *= 0.9; actor.treasury += (target.treasury * 0.1); break;
          case EspionageType.SABOTAGE_FACTORY: target.gdp *= 0.98; break;
          case EspionageType.SABOTAGE_INFRA: target.infrastructure -= 10; break;
          case EspionageType.DISRUPT_SUPPLY: target.equipment *= 0.9; break;
          case EspionageType.PROPAGANDA: target.stability -= 0.1; break;
          case EspionageType.INFLUENCE_ELECTION: target.stability -= 0.1; break;
          case EspionageType.SUPPORT_OPPOSITION: target.stability -= 0.15; break;
          case EspionageType.FUND_REBELS: target.militaryPower *= 0.9; break;
          case EspionageType.COUNTER_INTEL: {
              actor.stability += 0.05;
              // Actively degrade enemy networks targeting the actor across all categories
              for (const key in this.state.intelNetworks) {
                  const n = this.state.intelNetworks[key];
                  if (n.targetCountryId === actorId) {
                      n.networkStrength = Math.max(n.networkStrength - 20, 0);
                  }
              }
              break;
          }
          case EspionageType.EXPOSE_SPY: {
              target.stability -= 0.1;
              // Directly burns the target's network aimed at the actor
              const enemyNetwork = this.getOrCreateNetwork(targetId, actorId, category);
              enemyNetwork.networkStrength = Math.max(enemyNetwork.networkStrength - 30, 0);
              enemyNetwork.exposureRisk = Math.min(enemyNetwork.exposureRisk + 40, 100);
              break;
          }
          case EspionageType.STEAL_RESOURCES: target.treasury *= 0.95; actor.treasury += (target.treasury * 0.05); break;
          case EspionageType.BLACKMAIL: target.stability -= 0.1; break;
          case EspionageType.DISINFORMATION: target.stability -= 0.05; break;
      }
      return { success: true, message: `Operation ${type} successful! (${(successChance * 100).toFixed(0)}% odds, network strength ${network.networkStrength.toFixed(0)})` };
  }

  private resolveIntelligence(): void {
      console.log("Resolving intelligence networks...");
      for (const key in this.state.intelNetworks) {
          const network = this.state.intelNetworks[key];

          // Exposure risk naturally decays each turn if the network isn't used
          network.exposureRisk = Math.max(network.exposureRisk - 3, 0);

          // If exposure crosses 100, the network is burned: destroyed + diplomatic incident
          if (network.exposureRisk >= 100) {
              const owner = this.state.countries[network.ownerCountryId];
              const target = this.state.countries[network.targetCountryId];
              if (owner && target) {
                  console.log(`Intel network EXPOSED: ${network.ownerCountryId} caught spying on ${network.targetCountryId}`);
                  owner.diplomacy[network.targetCountryId] = (owner.diplomacy[network.targetCountryId] || 0) - 25;
                  target.diplomacy[network.ownerCountryId] = (target.diplomacy[network.ownerCountryId] || 0) - 25;
                  owner.internationalReputation = Math.max((owner.internationalReputation ?? 50) - 10, 0);
              }
              delete this.state.intelNetworks[key];
          }
      }
  }

  public investInTech(countryId: string): void {
      const country = this.state.countries[countryId];
      if (country && country.treasury >= 2000000) {
          country.treasury -= 2000000;
          country.technologyLevel += 5;
          console.log(`Tech investment in ${country.name}`);
      }
  }

  private resolveDiplomacy(): void {
    console.log("Resolving diplomacy...");
    for (const id1 in this.state.countries) {
        for (const id2 in this.state.countries) {
            if (id1 === id2) continue;
            const c1 = this.state.countries[id1];
            const c2 = this.state.countries[id2];
            
            if (c1.governmentType !== c2.governmentType) {
                c1.diplomacy[id2] = (c1.diplomacy[id2] || 0) - 1;
            }
        }
    }

    for (const countryId in this.state.countries) {
        const country = this.state.countries[countryId];
        const rep = country.internationalReputation ?? 50;
        const allyCount = this.getActiveAllies(countryId).length;
        const drift = allyCount > 0 ? 0.3 : (rep > 50 ? -0.1 : 0.1);
        country.internationalReputation = Math.min(Math.max(rep + drift, 0), 100);
    }
  }

  // ===================== PHASE 3: DEEP MILITARY =====================
  private getBranches(countryId: string): MilitaryBranch[] {
      return [MilitaryBranchType.ARMY, MilitaryBranchType.NAVY, MilitaryBranchType.AIR_FORCE]
          .map(type => this.state.militaryBranches[`${countryId}-${type}`])
          .filter(Boolean);
  }

  private getGeneralsFor(countryId: string): General[] {
      return Object.values(this.state.generals).filter(g => g.countryId === countryId);
  }

  private branchPower(branch: MilitaryBranch, generalSkillBonus: number): number {
      const fuelFactor = branch.fuel > 0 ? 1 : 0.5;
      const ammoFactor = branch.ammunition > 0 ? 1 : 0.5;
      const moraleFactor = (branch.morale ?? 70) / 100;
      const base = (branch.manpower * 0.001 + branch.equipment) * (branch.readiness / 100);
      return base * fuelFactor * ammoFactor * moraleFactor * (1 + generalSkillBonus / 100);
  }

  private totalCountryPower(countryId: string): number {
      const branches = this.getBranches(countryId);
      const generals = this.getGeneralsFor(countryId);
      const avgSkill = generals.length > 0 ? generals.reduce((s, g) => s + g.skill, 0) / generals.length : 0;
      return branches.reduce((sum, b) => sum + this.branchPower(b, avgSkill), 0);
  }

  private consumeLogistics(countryId: string, intensity: number): void {
      for (const branch of this.getBranches(countryId)) {
          branch.fuel = Math.max(branch.fuel - 500 * intensity, 0);
          branch.ammunition = Math.max(branch.ammunition - 500 * intensity, 0);
          branch.morale = Math.max((branch.morale ?? 70) - 2 * intensity, 0);
          branch.readiness = Math.max(branch.readiness - 1 * intensity, 10);
      }
  }

  private regenLogistics(countryId: string): void {
      for (const branch of this.getBranches(countryId)) {
          branch.fuel = Math.min(branch.fuel + 300, 20000);
          branch.ammunition = Math.min(branch.ammunition + 300, 20000);
          branch.morale = Math.min((branch.morale ?? 70) + 1, 100);
          branch.readiness = Math.min(branch.readiness + 2, 100);
      }
  }

  private syncCountryAggregatesFromBranches(countryId: string): void {
      const country = this.state.countries[countryId];
      const branches = this.getBranches(countryId);
      if (!country || branches.length === 0) return;
      country.manpower = branches.reduce((s, b) => s + b.manpower, 0);
      country.equipment = branches.reduce((s, b) => s + b.equipment, 0);
      country.readiness = branches.reduce((s, b) => s + b.readiness, 0) / branches.length;
  }

  public recruitToBranch(countryId: string, branchType: MilitaryBranchType, manpowerAmount: number): void {
      const country = this.state.countries[countryId];
      const branch = this.state.militaryBranches[`${countryId}-${branchType}`];
      const cost = manpowerAmount * 200;
      if (!country || !branch || country.treasury < cost) return;
      country.treasury -= cost;
      branch.manpower += manpowerAmount;
      branch.equipment += Math.floor(manpowerAmount / 100);
      this.syncCountryAggregatesFromBranches(countryId);
  }

  public appointGeneral(countryId: string, name: string, branch: MilitaryBranchType, skill: number): void {
      const id = `general-${countryId}-${Date.now()}`;
      this.state.generals[id] = { id, name, countryId, branch, skill: Math.min(Math.max(skill, 0), 100), assignedFrontId: null };
      console.log(`General ${name} appointed to ${branch} for ${countryId}`);
  }

  private resolveMilitary(): void {
    console.log("Resolving military...");
    const militaryBefore: Record<string, { militaryPower: number; readiness: number; manpower: number }> = {};
    for (const countryId in this.state.countries) {
        const c = this.state.countries[countryId];
        militaryBefore[countryId] = { militaryPower: c.militaryPower, readiness: c.readiness, manpower: c.manpower };
    }

    for (const countryId in this.state.countries) {
        const country = this.state.countries[countryId];
        if (country.treasury > 5000000) {
            this.recruitArmy(countryId);
        }
    }

    const countriesAtWar = new Set<string>();
    for (const warId in this.state.wars) {
        const war = this.state.wars[warId];
        countriesAtWar.add(war.attackerId);
        countriesAtWar.add(war.defenderId);
    }

    for (const countryId in this.state.countries) {
        if (countriesAtWar.has(countryId)) {
            this.consumeLogistics(countryId, 1);
        } else {
            this.regenLogistics(countryId);
        }
        this.syncCountryAggregatesFromBranches(countryId);
    }

    for (const warId in this.state.wars) {
        const war = this.state.wars[warId];
        const attacker = this.state.countries[war.attackerId];
        const defender = this.state.countries[war.defenderId];

        const attackerPower = this.totalCountryPower(war.attackerId) || attacker.militaryPower;
        const defenderPower = this.totalCountryPower(war.defenderId) || defender.militaryPower;

        const powerDiff = attackerPower - defenderPower;
        war.warScore += powerDiff / 10;
        
        const attackerLosses = Math.floor(defenderPower * 500);
        const defenderLosses = Math.floor(attackerPower * 500);
        
        war.casualties.attacker += attackerLosses;
        war.casualties.defender += defenderLosses;
        
        attacker.manpower = Math.max(attacker.manpower - attackerLosses, 0);
        defender.manpower = Math.max(defender.manpower - defenderLosses, 0);

        this.applyLossesToBranches(war.attackerId, attackerLosses);
        this.applyLossesToBranches(war.defenderId, defenderLosses);
        
        if (Math.abs(war.warScore) > 100) {
            const winner = war.warScore > 0 ? attacker : defender;
            const loser = war.warScore > 0 ? defender : attacker;
            console.log(`War ended: ${warId}. Winner: ${winner.name}`);
            EventGenerator.emit(this.state, winner.id, EventCategory.MILITARY, `${winner.name} has won the war against ${loser.name}.`, 3);
            EventGenerator.emit(this.state, loser.id, EventCategory.MILITARY, `${loser.name} has been defeated by ${winner.name}.`, 3);
            this.conquerCountry(winner.id, loser.id);
            delete this.state.wars[warId];
        }
    }

    for (const countryId in this.state.countries) {
        EventGenerator.checkMilitaryTriggers(this.state, countryId, militaryBefore[countryId], this.state.countries[countryId]);
    }
  }

  private applyLossesToBranches(countryId: string, losses: number): void {
      const branches = this.getBranches(countryId);
      if (branches.length === 0) return;
      const perBranch = Math.floor(losses / branches.length);
      for (const branch of branches) {
          branch.manpower = Math.max(branch.manpower - perBranch, 0);
          branch.morale = Math.max((branch.morale ?? 70) - 3, 0);
      }
  }

  /**
   * Resolves a war win: the loser is absorbed into the winner for the rest
   * of THIS game only. This never touches Firestore - it's pure in-memory
   * state, so a page refresh / new game always starts every country fresh
   * again (see DataManager.loadInitialCountries, which reads from the local
   * countries.json every time, never from a "conquered" DB record).
   */
  private conquerCountry(winnerId: string, loserId: string): void {
      const winner = this.state.countries[winnerId];
      const loser = this.state.countries[loserId];
      if (!winner || !loser) return;
      if (loser.occupationStatus === "ANNEXED") return; // already absorbed by someone

      // Winner grows: absorb the loser''s size, economy and military.
      winner.population += loser.population;
      winner.gdp += loser.gdp;
      winner.treasury += loser.treasury;
      winner.manpower += loser.manpower;
      winner.equipment += loser.equipment;
      winner.infrastructure += loser.infrastructure;

      // Every province (i.e. the loser''s territory/size on the map) changes hands.
      for (const provinceId in this.state.provinces) {
          const province = this.state.provinces[provinceId];
          if (province.ownerCountryId === loserId) {
              province.ownerCountryId = winnerId;
          }
      }

      // Map color: getCountryColor() always looks up the CONTROLLER''s color,
      // so setting controllerId is all that''s needed for the territory to
      // repaint as the winner''s color.
      loser.controllerId = winnerId;
      loser.sovereignId = winnerId;
      loser.occupationStatus = "ANNEXED";

      // The loser stops functioning as an active nation - zeroed out so it
      // can''t act, be attacked productively, or show stale stats if selected.
      loser.population = 0;
      loser.gdp = 0;
      loser.treasury = 0;
      loser.manpower = 0;
      loser.equipment = 0;
      loser.militaryPower = 0;
      loser.readiness = 0;
      loser.infrastructure = 0;

      // Pull the loser out of every other war it was part of - a country
      // that no longer exists can''t keep fighting.
      for (const warId in this.state.wars) {
          const w = this.state.wars[warId];
          if (w.attackerId === loserId || w.defenderId === loserId) {
              delete this.state.wars[warId];
          }
      }

      EventGenerator.emit(
          this.state,
          winnerId,
          EventCategory.MILITARY,
          `${loser.name} has been annexed by ${winner.name}. Its territory, population and treasury now belong to ${winner.name}.`,
          4
      );
      console.log(`${loser.name} annexed by ${winner.name} (in-memory only, not persisted to DB).`);
  }

  private advanceDate(): void {
    const [year, month] = this.state.currentDate.split('-').map(Number);
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    this.state.currentDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  }

  public getState(): GameState {
    return this.state;
  }
}

