import { Country, Province } from '../core/Models';
import { db } from '../../lib/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import countriesData from '../data/countries.json';
import { ResourceType, TerrainType } from './Models';

export class DataManager {
  public static async loadInitialCountries(): Promise<Record<string, Country>> {
    // Always seed/overwrite to ensure the data is up-to-date
    for (const country of countriesData) {
        const countryWithAI: Country = { 
            ...(country as any), 
            isAI: true,
            sovereignId: country.id,
            controllerId: country.id,
            occupationStatus: "INDEPENDENT"
        };
        await setDoc(doc(db, 'countries', country.id), countryWithAI);
        
        // Seed a default province for each country
        const defaultProvince: Province = {
            id: `prov-${country.id}`,
            name: `${country.name} Central Province`,
            ownerCountryId: country.id,
            population: country.population / 10,
            infrastructure: 50,
            resources: [ResourceType.FOOD],
            terrain: TerrainType.PLAINS,
            cities: [{
                id: `city-${country.id}`,
                name: `${country.name} City`,
                provinceId: `prov-${country.id}`,
                population: country.population / 20,
                isCapital: true,
                industryLevel: 50
            }]
        };
        await setDoc(doc(db, 'provinces', defaultProvince.id), defaultProvince);
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
            occupationStatus: "INDEPENDENT"
        } as Country;
      }
      return countries;
  }
}
