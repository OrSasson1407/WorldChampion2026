import { GameState } from './GameState';
import { GameEvent, EventCategory, Country } from './Models';

export interface EconomySnapshot {
  gdp: number;
  inflation: number;
  unemployment: number;
  debt: number;
  treasury: number;
}

export interface MilitarySnapshot {
  militaryPower: number;
  readiness: number;
  manpower: number;
}

export interface PoliticsSnapshot {
  stability: number;
  approvalRating: number;
}

export class EventGenerator {
  private static counter = 0;

  public static emit(state: GameState, countryId: string, category: EventCategory, message: string, severity: number = 1): GameEvent {
    const event: GameEvent = {
      id: `evt-${state.currentTurn}-${EventGenerator.counter++}`,
      countryId,
      category,
      message,
      turn: state.currentTurn,
      timestamp: Date.now(),
      severity
    };
    state.events.push(event);
    if (state.events.length > 500) {
      state.events.splice(0, state.events.length - 500);
    }
    return event;
  }

  public static snapshotEconomy(country: Country): EconomySnapshot {
    return {
      gdp: country.gdp,
      inflation: country.inflation,
      unemployment: country.unemployment ?? 5,
      debt: country.debt,
      treasury: country.treasury
    };
  }

  public static checkEconomyTriggers(state: GameState, countryId: string, before: EconomySnapshot, country: Country): void {
    const name = country.name;

    if (before.gdp > 0 && country.gdp < before.gdp * 0.995) {
      EventGenerator.emit(state, countryId, EventCategory.ECONOMY, `${name}'s economy has entered a recession as GDP contracts.`, 3);
    } else if (before.gdp > 0 && country.gdp > before.gdp * 1.01) {
      EventGenerator.emit(state, countryId, EventCategory.ECONOMY, `${name} is experiencing a period of strong economic growth.`, 1);
    }

    if (before.inflation <= 8 && country.inflation > 8) {
      EventGenerator.emit(state, countryId, EventCategory.ECONOMY, `Inflation is spiraling out of control in ${name}.`, 4);
    }

    const unemployment = country.unemployment ?? 5;
    if (before.unemployment <= 15 && unemployment > 15) {
      EventGenerator.emit(state, countryId, EventCategory.ECONOMY, `Unemployment has surged to crisis levels in ${name}.`, 3);
    }

    if (country.debt > country.gdp * 0.9 && before.debt <= before.gdp * 0.9) {
      EventGenerator.emit(state, countryId, EventCategory.ECONOMY, `${name} is at risk of sovereign debt default.`, 4);
    }

    if (before.treasury >= 0 && country.treasury < 0) {
      EventGenerator.emit(state, countryId, EventCategory.ECONOMY, `${name}'s treasury has run dry.`, 3);
    }
  }

  public static checkMilitaryTriggers(state: GameState, countryId: string, before: MilitarySnapshot, after: Country): void {
    const name = after.name;

    if (after.militaryPower > before.militaryPower) {
      EventGenerator.emit(state, countryId, EventCategory.MILITARY, `${name} has mobilized additional military forces.`, 2);
    }

    if (before.readiness - after.readiness > 15) {
      EventGenerator.emit(state, countryId, EventCategory.MILITARY, `${name}'s military readiness has collapsed under the strain of war.`, 4);
    }

    if (before.manpower > 0 && after.manpower < before.manpower * 0.9) {
      EventGenerator.emit(state, countryId, EventCategory.MILITARY, `${name} has suffered heavy casualties this turn.`, 4);
    }
  }

  public static checkPoliticsTriggers(state: GameState, countryId: string, before: PoliticsSnapshot, after: PoliticsSnapshot): void {
    const country = state.countries[countryId];
    const name = country ? country.name : countryId;

    if (before.stability >= 0.3 && after.stability < 0.3) {
      EventGenerator.emit(state, countryId, EventCategory.POLITICS, `${name} is descending into political instability.`, 3);
    }

    if (before.approvalRating >= 25 && after.approvalRating < 25) {
      EventGenerator.emit(state, countryId, EventCategory.POLITICS, `Public approval of the government in ${name} has collapsed.`, 3);
    }
  }
}