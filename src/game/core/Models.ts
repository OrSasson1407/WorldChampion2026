export interface Country {
  id: string;
  name: string;
  /**
   * Stable ISO 3166-1 alpha-3 geographic identifier for this country.
   * Used to look up the country's shape in the static world GeoJSON
   * (see src/game/geo/worldGeo.ts). Never derived from game state and
   * never mutated at runtime - it is purely a link to real-world geography.
   */
  iso3: string;
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
