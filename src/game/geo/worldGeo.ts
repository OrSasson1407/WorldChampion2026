/**
 * STATIC WORLD GEOGRAPHY
 * =======================
 * This module is the ONLY place that knows about real-world map shapes.
 *
 * It converts the bundled `world-atlas` TopoJSON (country borders, keyed by
 * numeric ISO 3166-1 codes) into a plain GeoJSON FeatureCollection where every
 * feature is tagged with a stable `iso3` (ISO 3166-1 alpha-3) identifier and a
 * display name, using the `world-countries` reference dataset to bridge the
 * numeric <-> alpha-3 code systems.
 *
 * This data is 100% static geography. It contains no ownership, no color, and
 * no game state of any kind - conquest, occupation, and control all live in
 * `GameState.countries` (see src/game/core/GameState.ts / Models.ts) and are
 * looked up by `iso3` at render time. Nothing in this file should ever be
 * mutated to represent a change in who controls a territory.
 *
 * Both packages are bundled as local dependencies (not fetched over the
 * network at runtime), so the map renders reliably offline and doesn't depend
 * on a third-party URL staying online.
 */
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import worldTopology from 'world-atlas/countries-110m.json';
import worldCountriesReference from 'world-countries/countries.json';

export interface WorldCountryProperties {
  /** Stable ISO 3166-1 alpha-3 code, e.g. "USA". Matches Country.iso3. */
  iso3: string;
  /** Human-readable common name, e.g. "United States" (for tooltips/fallback labels). */
  name: string;
}

// Build a numeric ISO 3166-1 code ("840") -> alpha-3 code ("USA") lookup once,
// from the reference dataset. This is the "centralized mapping layer" called
// for whenever the geographic data source and the game's IDs use different
// standards - country IDs are never converted ad-hoc elsewhere in the app.
const numericToAlpha3 = new Map<string, { iso3: string; name: string }>();
for (const entry of worldCountriesReference as Array<{
  ccn3?: string;
  cca3: string;
  name: { common: string };
}>) {
  if (!entry.ccn3) continue; // A handful of territories (e.g. Kosovo) have no numeric code.
  numericToAlpha3.set(entry.ccn3, { iso3: entry.cca3, name: entry.name.common });
}

/**
 * Every country in the world as a static GeoJSON feature, tagged with a
 * stable `iso3` id. Geometry never changes at runtime - only look-ups against
 * this collection change (via game state) to decide how each shape is styled.
 */
export const WORLD_COUNTRIES_GEOJSON: FeatureCollection<Geometry, WorldCountryProperties> =
  (() => {
    const topology = worldTopology as unknown as Parameters<typeof feature>[0];
    const countriesObject = (topology as any).objects.countries;
    const collection = feature(topology, countriesObject) as unknown as FeatureCollection<
      Geometry,
      { name?: string }
    >;

    const features = collection.features
      .map((f) => {
        const numericId = String((f as any).id);
        const mapped = numericToAlpha3.get(numericId);
        if (!mapped) return null; // Unmapped/uninhabited territory - skip rather than guess an id.
        return {
          ...f,
          properties: { iso3: mapped.iso3, name: mapped.name },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return { type: 'FeatureCollection', features };
  })();

/** Quick iso3 -> feature lookup, built once, for anything that needs a single country's shape. */
export const WORLD_COUNTRY_BY_ISO3: Map<string, (typeof WORLD_COUNTRIES_GEOJSON.features)[number]> =
  new Map(WORLD_COUNTRIES_GEOJSON.features.map((f) => [f.properties.iso3, f]));
