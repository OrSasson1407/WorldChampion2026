import { Country, Province } from '../core/Models';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import countriesData from '../data/countries.json';
import { ResourceType, TerrainType } from './Models';

// Firestore caps a single batch at 500 write operations. We seed one
// "countries" doc and one "provinces" doc per country, so this is the
// number of *countries* per batch, not raw writes.
const COUNTRIES_PER_BATCH = 200;

export class DataManager {
  public static async loadInitialCountries(): Promise<Record<string, Country>> {
    // Always seed/overwrite to ensure Firestore matches the bundled roster
    // (src/game/data/countries.json), which is now the full ~170+ country
    // world rather than a hand-picked subset. Writes are grouped into
    // Firestore batches instead of one `await` per document so seeding the
    // full world stays fast (a handful of round-trips instead of hundreds).
    for (let start = 0; start < countriesData.length; start += COUNTRIES_PER_BATCH) {
      const chunk = countriesData.slice(start, start + COUNTRIES_PER_BATCH);
      const batch = writeBatch(db);

      for (const country of chunk) {
        const countryWithAI: Country = {
          ...(country as any),
          isAI: true,
          sovereignId: country.id,
          controllerId: country.id,
          occupationStatus: 'INDEPENDENT',
        };
        batch.set(doc(db, "countries", country.id), countryWithAI);

        const defaultProvince: Province = {
          id: `prov-${country.id}`,
          name: `${country.name} Central Province`,
          ownerCountryId: country.id,
          population: country.population / 10,
          infrastructure: 50,
          resources: [ResourceType.FOOD],
          terrain: TerrainType.PLAINS,
          cities: [
            {
              id: `city-${country.id}`,
              name: `${country.name} City`,
              provinceId: `prov-${country.id}`,
              population: country.population / 20,
              isCapital: true,
              industryLevel: 50,
            },
          ],
        };
        batch.set(doc(db, 'provinces', defaultProvince.id), defaultProvince);
      }

      await batch.commit();
    }

    return DataManager.loadFromDataJson();
  }

  private static loadFromDataJson(): Record<string, Country> {
    const countries: Record<string, Country> = {};
    for (const country of countriesData) {
      countries[country.id] = {
        ...(country as any),
        isAI: true,
        sovereignId: country.id,
        controllerId: country.id,
        occupationStatus: 'INDEPENDENT',
      } as Country;
    }
    return countries;
  }
}
