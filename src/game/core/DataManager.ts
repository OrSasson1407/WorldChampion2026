import { Country, Province, Government, CentralBank, MilitaryBranch, MilitaryBranchType, PoliticalParty } from '../core/Models';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import countriesData from '../data/countries.json';
import { ResourceType, TerrainType } from './Models';

// Bump this whenever the seed data in countries.json meaningfully changes
// (e.g. new fields, new baseline values like the real-world diplomacy matrix).
// On mismatch, DataManager wipes the previously-seeded collections and
// re-seeds Firebase from scratch, so Firestore never keeps serving stale data.
const SEED_VERSION = 'diplomacy-v1';

type WriteOp = { ref: ReturnType<typeof doc>; data?: any; isDelete?: boolean };

export class DataManager {
  public static async loadInitialCountries(): Promise<Record<string, Country>> {
    const seedMetaRef = doc(db, 'meta', 'seed');
    const seedMetaSnap = await getDoc(seedMetaRef);
    const currentVersion = seedMetaSnap.exists() ? (seedMetaSnap.data() as any).version : null;

    if (currentVersion !== SEED_VERSION) {
        await DataManager.reseedAll(seedMetaRef);
    }
    return DataManager.loadFromDataJson();
  }

  // Wipes previously-seeded collections (if any) and writes fresh data for
  // every country: profile, starting province, government, central bank,
  // and military branches -- including the real-world initial diplomacy
  // matrix baked into countries.json.
  private static async reseedAll(seedMetaRef: ReturnType<typeof doc>): Promise<void> {
    const collectionsToClear = ['countries', 'provinces', 'governments', 'centralBanks', 'militaryBranches'];
    for (const collName of collectionsToClear) {
        const snap = await getDocs(collection(db, collName));
        if (!snap.empty) {
            await DataManager.commitWrites(snap.docs.map(d => ({ ref: d.ref, isDelete: true })));
        }
    }

    const writes: WriteOp[] = [];

    for (const country of countriesData) {
        const countryWithAI: Country = {
            ...(country as any),
            isAI: true,
            sovereignId: country.id,
            controllerId: country.id,
            occupationStatus: "INDEPENDENT"
        };
        writes.push({ ref: doc(db, 'countries', country.id), data: countryWithAI });

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
        writes.push({ ref: doc(db, 'provinces', defaultProvince.id), data: defaultProvince });

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
        writes.push({ ref: doc(db, 'governments', country.id), data: government });

        // Phase 0: seed central bank
        const centralBank: CentralBank = {
            countryId: country.id,
            currencyCode: `${country.id.toUpperCase().slice(0, 3)}`,
            interestRate: 3.5,
            exchangeRateToUSD: 1.0,
            foreignReserves: (country as any).gdp ? (country as any).gdp * 0.05 : 1000000000
        };
        writes.push({ ref: doc(db, 'centralBanks', country.id), data: centralBank });

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
            writes.push({ ref: doc(db, 'militaryBranches', `${country.id}-${branchType}`), data: branch });
        }
    }

    writes.push({ ref: seedMetaRef, data: { version: SEED_VERSION, seededAt: new Date().toISOString() } });

    await DataManager.commitWrites(writes);
  }

  // Firestore batches cap out at 500 ops, so chunk the writes/deletes and
  // commit the chunks in parallel instead of one op at a time.
  private static async commitWrites(ops: WriteOp[]): Promise<void> {
      const chunkSize = 450;
      const chunks: WriteOp[][] = [];
      for (let i = 0; i < ops.length; i += chunkSize) {
          chunks.push(ops.slice(i, i + chunkSize));
      }
      await Promise.all(chunks.map(async (chunk) => {
          const batch = writeBatch(db);
          chunk.forEach((op) => {
              if (op.isDelete) batch.delete(op.ref);
              else batch.set(op.ref, op.data);
          });
          await batch.commit();
      }));
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
