import { Country } from '../core/Models';

/** Fill color for map territory that has no matching game-state country (unowned/unmodeled). */
export const DEFAULT_COUNTRY_COLOR = '#D6D6DA';

/**
 * The single source of truth for "what color is this territory right now".
 * Color is NEVER stored on the geography - it is always derived from the
 * current controller of the country, looked up in live game state. Passing
 * `undefined` (no matching game-state country for this map shape) yields the
 * neutral fallback color.
 */
export const getCountryColor = (
  country: Country | undefined,
  allCountries: Record<string, Country>
): string => {
  if (!country) return DEFAULT_COUNTRY_COLOR;
  const controller = allCountries[country.controllerId];
  return controller ? controller.color : country.color ?? DEFAULT_COUNTRY_COLOR;
};

/**
 * Builds an iso3 -> Country index from the current game state. This is the
 * bridge between static map geometry (keyed by iso3, see src/game/geo/worldGeo.ts)
 * and dynamic game state (keyed by internal Country.id). Recomputed whenever
 * game state changes; cheap for the ~20-200 country scale this game targets.
 */
export const buildCountryByIso3Index = (
  allCountries: Record<string, Country>
): Record<string, Country> => {
  const index: Record<string, Country> = {};
  for (const id in allCountries) {
    const country = allCountries[id];
    if (country.iso3) index[country.iso3] = country;
  }
  return index;
};
