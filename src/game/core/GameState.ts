import { Country, Province, Army, War } from './Models';

export interface GameState {
  worldSeed: string;
  currentTurn: number;
  currentDate: string; // YYYY-MM-DD
  version: string;
  countries: Record<string, Country>;
  provinces: Record<string, Province>;
  armies: Record<string, Army>;
  wars: Record<string, War>;
}

export const INITIAL_GAME_STATE: GameState = {
  worldSeed: "initial-seed",
  currentTurn: 0,
  currentDate: "2026-01-01",
  version: "1.0.0",
  countries: {},
  provinces: {},
  armies: {},
  wars: {},
};
