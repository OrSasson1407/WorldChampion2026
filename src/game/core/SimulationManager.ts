import { GameState } from './GameState';
import { Country, Army, War, EspionageType } from './Models';
import { AIManager } from './AIManager';

export class SimulationManager {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  public processTurn(): void {
    console.log(`Processing turn ${this.state.currentTurn + 1}...`);
    
    // AI Decisions
    AIManager.makeDecisions(this, this.state);
    
    // 1. Resolve economic outcomes (PRD page 5)
    this.resolveEconomy();
    
    // 2. Resolve diplomatic outcomes (PRD page 5)
    this.resolveDiplomacy();
    
    // 3. Resolve military/combat outcomes (PRD page 5)
    this.resolveMilitary();

    // 4. Resolve political outcomes (PRD page 10)
    this.resolvePolitics();

    this.state.currentTurn += 1;
    // Advance date by one month
    this.advanceDate();
    console.log(`Turn processed. New date: ${this.state.currentDate}`);
  }

  private resolveEconomy(): void {
    console.log("Resolving economy...");
    for (const countryId in this.state.countries) {
      const country = this.state.countries[countryId];
      
      // Expenses: Basic upkeep + military upkeep
      const militaryUpkeep = country.militaryPower * 10000; // Simplified cost
      country.expenses = 50000000 + militaryUpkeep;
      
      const taxRate = 0.2;
      const revenue = country.gdp * taxRate / 12;
      country.income = revenue;
      
      country.treasury += (country.income - country.expenses);
      country.gdp *= 1.001; 
    }
  }

  private resolvePolitics(): void {
      console.log("Resolving politics...");
      for (const countryId in this.state.countries) {
          const country = this.state.countries[countryId];
          
          // Stability modifiers (PRD Page 8/10)
          // Heavy debt decreases stability
          if (country.debt > country.gdp * 0.5) {
              country.stability -= 0.05;
          }
          // High military power can increase stability (or decrease if aggressive)
          country.stability = Math.min(Math.max(country.stability, 0), 1);
      }
  }

  /**
   * The core conquest game action. This mutates authoritative game state
   * only - the map is a view over this state and re-renders automatically
   * because App re-reads `getState()` after this call. No map/rendering
   * code is touched here, and the static GeoJSON is never modified.
   *
   * `status` distinguishes a territory that is merely occupied (still legally
   * belongs to its original sovereign) from one that has been annexed
   * outright (the sovereign itself becomes the new controller).
   */
  public conquerCountry(
    attackerId: string,
    targetId: string,
    status: 'OCCUPIED' | 'ANNEXED' = 'OCCUPIED'
  ): { success: boolean; message: string } {
    const attacker = this.state.countries[attackerId];
    const target = this.state.countries[targetId];
    if (!attacker) return { success: false, message: `Unknown attacker: ${attackerId}` };
    if (!target) return { success: false, message: `Unknown target: ${targetId}` };
    if (attackerId === targetId) return { success: false, message: 'A country cannot conquer itself.' };

    target.controllerId = attackerId;
    target.occupationStatus = status;
    if (status === 'ANNEXED') {
      target.sovereignId = attackerId;
    }

    console.log(`${attacker.name} ${status === 'ANNEXED' ? 'annexed' : 'conquered'} ${target.name}`);
    return { success: true, message: `${attacker.name} now controls ${target.name} (${status}).` };
  }

  /** Restores a country to independent, self-controlled status (e.g. after a peace deal or liberation). */
  public liberateCountry(targetId: string): { success: boolean; message: string } {
    const target = this.state.countries[targetId];
    if (!target) return { success: false, message: `Unknown country: ${targetId}` };

    target.controllerId = target.sovereignId;
    target.occupationStatus = 'INDEPENDENT';
    return { success: true, message: `${target.name} is independent again.` };
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

  public declareWar(attackerId: string, defenderId: string): void {
      // Check if war already exists
      for (const warId in this.state.wars) {
          const war = this.state.wars[warId];
          if ((war.attackerId === attackerId && war.defenderId === defenderId) ||
              (war.attackerId === defenderId && war.defenderId === attackerId)) {
              console.log("War already exists between these countries.");
              return;
          }
      }
      const id = `war-${Date.now()}`;
      this.state.wars[id] = { 
          id, 
          attackerId, 
          defenderId, 
          warScore: 0,
          casualties: { attacker: 0, defender: 0 }
      };
      console.log(`War declared: ${attackerId} vs ${defenderId}`);
  }

  public negotiatePeace(warId: string): void {
      if (this.state.wars[warId]) {
          delete this.state.wars[warId];
          console.log(`Peace negotiated for war: ${warId}`);
      }
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
      
      const success = Math.random() > 0.4;
      if (!success) {
          actor.treasury -= cost / 2;
          return { success: false, message: `Operation ${type} failed!` };
      }

      actor.treasury -= cost;
      
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
          case EspionageType.COUNTER_INTEL: actor.stability += 0.05; break;
          case EspionageType.EXPOSE_SPY: target.stability -= 0.1; break;
          case EspionageType.STEAL_RESOURCES: target.treasury *= 0.95; actor.treasury += (target.treasury * 0.05); break;
          case EspionageType.BLACKMAIL: target.stability -= 0.1; break;
          case EspionageType.DISINFORMATION: target.stability -= 0.05; break;
      }
      return { success: true, message: `Operation ${type} successful!` };
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
    // Basic AI behavior: countries with different government types dislike each other
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
  }

  private resolveMilitary(): void {
    console.log("Resolving military...");
    // Basic AI behavior: AI countries with money recruit armies
    for (const countryId in this.state.countries) {
        const country = this.state.countries[countryId];
        // If treasury > 5M, recruit army
        if (country.treasury > 5000000) {
            this.recruitArmy(countryId);
        }
    }

    // Resolve wars (PRD Page 13)
    for (const warId in this.state.wars) {
        const war = this.state.wars[warId];
        const attacker = this.state.countries[war.attackerId];
        const defender = this.state.countries[war.defenderId];
        
        // Simple combat resolution: Power diff affects war score
        const powerDiff = attacker.militaryPower - defender.militaryPower;
        war.warScore += powerDiff / 10;
        
        // Casualties based on military power
        const attackerLosses = Math.floor(defender.militaryPower * 500);
        const defenderLosses = Math.floor(attacker.militaryPower * 500);
        
        war.casualties.attacker += attackerLosses;
        war.casualties.defender += defenderLosses;
        
        attacker.manpower -= attackerLosses;
        defender.manpower -= defenderLosses;
        
        if (Math.abs(war.warScore) > 100) {
            console.log(`War ended: ${warId}. Winner: ${war.warScore > 0 ? attacker.name : defender.name}`);
            delete this.state.wars[warId];
        }
    }
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
