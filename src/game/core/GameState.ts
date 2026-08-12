import { Country, Province, Army, War, Government, Treaty, Sanction, IntelNetwork, MilitaryBranch, General, TradeAgreement, CentralBank, GameEvent } from './Models';

export interface GameState {
  worldSeed: string;
  currentTurn: number;
  currentDate: string; // YYYY-MM-DD
  version: string;
  countries: Record<string, Country>;
  provinces: Record<string, Province>;
  armies: Record<string, Army>;
  wars: Record<string, War>;
  // Phase 0 additions
  governments: Record<string, Government>; // key: countryId
  centralBanks: Record<string, CentralBank>; // key: countryId
  treaties: Record<string, Treaty>;
  sanctions: Record<string, Sanction>;
  tradeAgreements: Record<string, TradeAgreement>;
  intelNetworks: Record<string, IntelNetwork>;
  militaryBranches: Record<string, MilitaryBranch>; // key: `${countryId}-${type}`
  generals: Record<string, General>;
  events: GameEvent[];
}

export const INITIAL_GAME_STATE: GameState = {
  worldSeed: "initial-seed",
  currentTurn: 0,
  currentDate: "2026-01-01",
  version: "1.1.0",
  countries: {},
  provinces: {},
  armies: {},
  wars: {},
  governments: {},
  centralBanks: {},
  treaties: {},
  sanctions: {},
  tradeAgreements: {},
  intelNetworks: {},
  militaryBranches: {},
  generals: {},
  events: [],
};
