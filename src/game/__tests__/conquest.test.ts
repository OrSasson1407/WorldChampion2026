import { describe, it, expect } from 'vitest';
import { SimulationManager } from '../core/SimulationManager';
import { GameState } from '../core/GameState';
import { Country } from '../core/Models';
import { getCountryColor, buildCountryByIso3Index, DEFAULT_COUNTRY_COLOR } from '../utils/countryUtils';

function makeCountry(overrides: Partial<Country> & { id: string; iso3: string; color: string }): Country {
  return {
    name: overrides.id,
    sovereignId: overrides.id,
    controllerId: overrides.id,
    occupationStatus: 'INDEPENDENT',
    capitalProvinceId: `prov-${overrides.id}`,
    population: 1000,
    gdp: 1000,
    treasury: 1000,
    stability: 1,
    governmentType: 'Democracy',
    militaryPower: 10,
    technologyLevel: 10,
    diplomacy: {},
    income: 0,
    expenses: 0,
    debt: 0,
    inflation: 0,
    researchProjects: [],
    manpower: 100,
    equipment: 100,
    readiness: 1,
    culture: 'Test',
    ideology: 'Test',
    infrastructure: 50,
    isAI: false,
    ...overrides,
  };
}

function makeState(): GameState {
  const israel = makeCountry({ id: 'ISR', iso3: 'ISR', color: '#0000FF' });
  const jordan = makeCountry({ id: 'JOR', iso3: 'JOR', color: '#00FF00' });
  const egypt = makeCountry({ id: 'EGY', iso3: 'EGY', color: '#FF0000' });
  return {
    worldSeed: 'test-seed',
    currentTurn: 0,
    currentDate: '2026-01-01',
    version: 'test',
    countries: { ISR: israel, JOR: jordan, EGY: egypt },
    provinces: {},
    armies: {},
    wars: {},
  };
}

describe('country ownership - initial state', () => {
  it('a country initially controls itself', () => {
    const state = makeState();
    expect(state.countries.JOR.controllerId).toBe('JOR');
    expect(state.countries.JOR.sovereignId).toBe('JOR');
    expect(state.countries.JOR.occupationStatus).toBe('INDEPENDENT');
  });
});

describe('SimulationManager.conquerCountry', () => {
  it('transfers control of the target to the attacker', () => {
    const sim = new SimulationManager(makeState());
    const result = sim.conquerCountry('ISR', 'JOR');

    expect(result.success).toBe(true);
    expect(sim.getState().countries.JOR.controllerId).toBe('ISR');
  });

  it('marks the target OCCUPIED by default, keeping its original sovereign', () => {
    const sim = new SimulationManager(makeState());
    sim.conquerCountry('ISR', 'JOR');

    const jordan = sim.getState().countries.JOR;
    expect(jordan.occupationStatus).toBe('OCCUPIED');
    expect(jordan.sovereignId).toBe('JOR'); // sovereignty unchanged for a mere occupation
  });

  it('supports annexation, which also transfers sovereignty', () => {
    const sim = new SimulationManager(makeState());
    sim.conquerCountry('ISR', 'JOR', 'ANNEXED');

    const jordan = sim.getState().countries.JOR;
    expect(jordan.occupationStatus).toBe('ANNEXED');
    expect(jordan.sovereignId).toBe('ISR');
    expect(jordan.controllerId).toBe('ISR');
  });

  it('does not affect unrelated countries', () => {
    const sim = new SimulationManager(makeState());
    sim.conquerCountry('ISR', 'JOR');

    expect(sim.getState().countries.EGY.controllerId).toBe('EGY');
  });

  it('rejects self-conquest and unknown ids without throwing', () => {
    const sim = new SimulationManager(makeState());

    expect(sim.conquerCountry('ISR', 'ISR').success).toBe(false);
    expect(sim.conquerCountry('ISR', 'DOES_NOT_EXIST').success).toBe(false);
    expect(sim.conquerCountry('DOES_NOT_EXIST', 'JOR').success).toBe(false);
  });

  it('liberateCountry restores independence to an occupied (not annexed) country', () => {
    const sim = new SimulationManager(makeState());
    sim.conquerCountry('ISR', 'JOR', 'OCCUPIED');
    sim.liberateCountry('JOR');

    const jordan = sim.getState().countries.JOR;
    expect(jordan.controllerId).toBe('JOR');
    expect(jordan.occupationStatus).toBe('INDEPENDENT');
  });
});

describe('getCountryColor', () => {
  it("returns the controller's color, not the territory's own color", () => {
    const state = makeState();
    const sim = new SimulationManager(state);
    sim.conquerCountry('ISR', 'JOR');

    const jordan = sim.getState().countries.JOR;
    const color = getCountryColor(jordan, sim.getState().countries);

    expect(color).toBe('#0000FF'); // Israel's color, not Jordan's own #00FF00
  });

  it('an unconquered country shows its own color as its own controller', () => {
    const state = makeState();
    const color = getCountryColor(state.countries.EGY, state.countries);
    expect(color).toBe('#FF0000');
  });

  it('falls back to the default color for a missing/unknown country', () => {
    const state = makeState();
    expect(getCountryColor(undefined, state.countries)).toBe(DEFAULT_COUNTRY_COLOR);
  });

  it('map color updates automatically after conquest (reactivity via shared state)', () => {
    const state = makeState();
    const sim = new SimulationManager(state);

    const before = getCountryColor(state.countries.JOR, sim.getState().countries);
    expect(before).toBe('#00FF00');

    sim.conquerCountry('ISR', 'JOR');
    const after = getCountryColor(sim.getState().countries.JOR, sim.getState().countries);
    expect(after).toBe('#0000FF');
  });
});

describe('buildCountryByIso3Index', () => {
  it('indexes countries by their iso3 code for map lookups', () => {
    const state = makeState();
    const index = buildCountryByIso3Index(state.countries);

    expect(index.ISR.id).toBe('ISR');
    expect(index.JOR.id).toBe('JOR');
    expect(index.EGY.id).toBe('EGY');
  });

  it('does not include entries for countries missing an iso3 code', () => {
    const state = makeState();
    // Deliberately simulate malformed data (e.g. a country seeded without a geo mapping yet).
    (state.countries.EGY as { iso3?: string }).iso3 = undefined;
    const index = buildCountryByIso3Index(state.countries);
    expect(index.EGY).toBeUndefined();
  });
});
