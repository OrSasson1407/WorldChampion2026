export interface Country {
  id: string;
  name: string;
  sovereignId: string;
  controllerId: string;
  occupationStatus: "INDEPENDENT" | "OCCUPIED" | "ANNEXED";
  capitalProvinceId: string;
  population: number;
  gdp: number;
  treasury: number;
  stability: number;
  governmentType: string;
  militaryPower: number;
  technologyLevel: number;
  diplomacy: Record<string, number>; // countryId -> relationship
  // Economy (PRD Page 8)
  income: number;
  expenses: number;
  debt: number;
  inflation: number;
  // Phase 2: Deep Economy (optional so old seed data doesn't break)
  unemployment?: number; // percentage, 0-100
  budgetAllocation?: {
    military: number;
    social: number;
    infrastructure: number;
  };
  // Phase 4: Deep Diplomacy
  internationalReputation?: number; // 0-100, optional so old seed data doesn't break
  // Technology (PRD Page 14)
  researchProjects: string[]; // List of active research projects
  // Military (PRD Page 12)
  manpower: number;
  equipment: number;
  readiness: number;
  // Extra data
  culture: string;
  ideology: string;
  infrastructure: number;
  isAI: boolean;
  color: string;
}

export enum ResourceType {
  OIL = "Oil",
  GAS = "Gas",
  COAL = "Coal",
  IRON = "Iron",
  URANIUM = "Uranium",
  GOLD = "Gold",
  RARE_EARTHS = "Rare Earths",
  FOOD = "Food",
  WATER = "Water",
  ELECTRICITY = "Electricity"
}

export enum TerrainType {
  PLAINS = "Plains",
  MOUNTAINS = "Mountains",
  DESERT = "Desert",
  FOREST = "Forest",
  URBAN = "Urban",
  COASTAL = "Coastal"
}

export interface City {
  id: string;
  name: string;
  provinceId: string;
  population: number;
  isCapital: boolean;
  industryLevel: number;
}

export interface Province {
  id: string;
  name: string;
  ownerCountryId: string;
  population: number;
  infrastructure: number;
  resources: ResourceType[];
  terrain: TerrainType;
  cities: City[];
}

export enum EspionageType {
  SPY = "Spy Operation",
  STEAL_MILITARY_PLANS = "Steal Military Plans",
  STEAL_TECH = "Steal Technology",
  ECONOMIC_ESPIONAGE = "Economic Espionage",
  SABOTAGE_FACTORY = "Sabotage Factory",
  SABOTAGE_INFRA = "Sabotage Infrastructure",
  DISRUPT_SUPPLY = "Disrupt Supply Lines",
  PROPAGANDA = "Propaganda Campaign",
  INFLUENCE_ELECTION = "Influence Election",
  SUPPORT_OPPOSITION = "Support Opposition",
  FUND_REBELS = "Fund Rebels",
  COUNTER_INTEL = "Counter Intelligence",
  EXPOSE_SPY = "Expose Spy",
  STEAL_RESOURCES = "Steal Resources",
  BLACKMAIL = "Blackmail Leader",
  DISINFORMATION = "Disinformation Campaign"
}

export interface War {
  id: string;
  attackerId: string;
  defenderId: string;
  warScore: number;
  casualties: {
    attacker: number;
    defender: number;
  };
}

export interface Army {
  id: string;
  ownerCountryId: string;
  locationProvinceId: string;
  manpower: number;
  equipment: number;
  readiness: number;
}

export interface GameEvent {
  id: string;
  message: string;
  timestamp: number;
}

// ===================== PHASE 0: NEW SYSTEM TYPES =====================

// --- Domestic Politics ---
export interface PoliticalParty {
  id: string;
  name: string;
  ideology: string;
  seats: number;
  popularity: number; // 0-100
}

export interface Government {
  countryId: string;
  parties: PoliticalParty[];
  rulingPartyId: string;
  approvalRating: number; // 0-100
  corruptionLevel: number; // 0-100
  nextElectionDate: string; // YYYY-MM-DD
  coupRisk: number; // 0-100
  lawsPassed: string[];
}

// --- Deep Economy ---
export interface CentralBank {
  countryId: string;
  currencyCode: string;
  interestRate: number; // percentage
  exchangeRateToUSD: number;
  foreignReserves: number;
}

export interface TradeAgreement {
  id: string;
  countryAId: string;
  countryBId: string;
  resource: ResourceType;
  volumePerTurn: number;
}

// --- Deep Diplomacy ---
export enum TreatyType {
  NON_AGGRESSION = "Non-Aggression Pact",
  DEFENSE_PACT = "Defense Pact",
  TRADE_AGREEMENT = "Trade Agreement",
  ALLIANCE = "Alliance"
}

export interface Treaty {
  id: string;
  type: TreatyType;
  memberCountryIds: string[];
  signedDate: string;
  active: boolean;
}

export interface Sanction {
  id: string;
  sourceCountryId: string;
  targetCountryId: string;
  severity: number; // 0-100, reduces trade/income
}

// --- Deep Intelligence ---
export enum IntelCategory {
  HUMINT = "Human Intelligence",
  SIGINT = "Signals Intelligence",
  CYBER = "Cyber Operations"
}

export interface IntelNetwork {
  id: string;
  ownerCountryId: string;
  targetCountryId: string;
  category: IntelCategory;
  networkStrength: number; // 0-100, grows over time, increases op success
  exposureRisk: number; // 0-100
}

// --- Deep Military ---
export enum MilitaryBranchType {
  ARMY = "Army",
  NAVY = "Navy",
  AIR_FORCE = "Air Force"
}

export interface General {
  id: string;
  name: string;
  countryId: string;
  branch: MilitaryBranchType;
  skill: number; // 0-100
  assignedFrontId: string | null;
}

export interface MilitaryBranch {
  countryId: string;
  type: MilitaryBranchType;
  manpower: number;
  equipment: number;
  readiness: number;
  fuel: number;
  ammunition: number;
  morale?: number; // 0-100, optional so Phase 0 seed data still validates
}
