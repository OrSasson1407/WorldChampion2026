import { Country, Province, Government, CentralBank, MilitaryBranch, MilitaryBranchType, PoliticalParty } from '../core/Models';
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

        // Phase 0: seed government
        const defaultParties: PoliticalParty[] = [
            { id: `${country.id}-party-ruling`, name: "Ruling Party", ideology: (country as any).ideology || "Centrist", seats: 60, popularity: 55 },
            { id: `${country.id}-party-opposition`, name: "Opposition", ideology: "Opposition", seats: 40, popularity: 45 }
        ];
        const government: Government = {
            countryId: country.id,
            parties: defaultParties,
            rulingPartyId: `${country.id}-party-ruling`,
            approvalRating: 55,
            corruptionLevel: 20,
            nextElectionDate: "2030-01-01",
            coupRisk: 0,
            lawsPassed: []
        };
        await setDoc(doc(db, 'governments', country.id), government);

        // Phase 0: seed central bank
        const centralBank: CentralBank = {
            countryId: country.id,
            currencyCode: `${country.id.toUpperCase().slice(0, 3)}`,
            interestRate: 3.5,
            exchangeRateToUSD: 1.0,
            foreignReserves: (country as any).gdp ? (country as any).gdp * 0.05 : 1000000000
        };
        await setDoc(doc(db, 'centralBanks', country.id), centralBank);

        // Phase 0: seed military branches (Army, Navy, Air Force)
        for (const branchType of [MilitaryBranchType.ARMY, MilitaryBranchType.NAVY, MilitaryBranchType.AIR_FORCE]) {
            const branch: MilitaryBranch = {
                countryId: country.id,
                type: branchType,
                manpower: Math.floor(((country as any).manpower || 100000) / 3),
                equipment: Math.floor(((country as any).equipment || 100) / 3),
                readiness: 50,
                fuel: 10000,
                ammunition: 10000
            };
            await setDoc(doc(db, 'militaryBranches', `${country.id}-${branchType}`), branch);
        }
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

  // Phase 0: load newly seeded collections back into memory
  public static async loadGovernments(): Promise<Record<string, Government>> {
      const snap = await getDocs(collection(db, 'governments'));
      const result: Record<string, Government> = {};
      snap.forEach(d => { result[d.id] = d.data() as Government; });
      return result;
  }

  public static async loadCentralBanks(): Promise<Record<string, CentralBank>> {
      const snap = await getDocs(collection(db, 'centralBanks'));
      const result: Record<string, CentralBank> = {};
      snap.forEach(d => { result[d.id] = d.data() as CentralBank; });
      return result;
  }

  public static async loadMilitaryBranches(): Promise<Record<string, MilitaryBranch>> {
      const snap = await getDocs(collection(db, 'militaryBranches'));
      const result: Record<string, MilitaryBranch> = {};
      snap.forEach(d => { result[d.id] = d.data() as MilitaryBranch; });
      return result;
  }
}
