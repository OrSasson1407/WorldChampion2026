import { describe, it, expect } from 'vitest';
import { WORLD_COUNTRIES_GEOJSON, WORLD_COUNTRY_BY_ISO3 } from '../geo/worldGeo';
import countriesData from '../data/countries.json';

describe('WORLD_COUNTRIES_GEOJSON', () => {
  it('loads a non-trivial set of country shapes', () => {
    expect(WORLD_COUNTRIES_GEOJSON.type).toBe('FeatureCollection');
    expect(WORLD_COUNTRIES_GEOJSON.features.length).toBeGreaterThan(100);
  });

  it('every feature has a 3-letter iso3 code and a name', () => {
    for (const f of WORLD_COUNTRIES_GEOJSON.features) {
      expect(f.properties.iso3).toMatch(/^[A-Z]{3}$/);
      expect(f.properties.name.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate iso3 codes (each territory is independently selectable)', () => {
    const codes = WORLD_COUNTRIES_GEOJSON.features.map((f) => f.properties.iso3);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every playable game country resolves to a real map shape', () => {
    for (const country of countriesData as Array<{ iso3: string; name: string }>) {
      expect(WORLD_COUNTRY_BY_ISO3.has(country.iso3)).toBe(true);
    }
  });
});
