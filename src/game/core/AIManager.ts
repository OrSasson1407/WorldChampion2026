import { GameState } from './GameState';
import { SimulationManager } from './SimulationManager';
import { EspionageType } from './Models';

export class AIManager {
    public static makeDecisions(simulation: SimulationManager, state: GameState): void {
        for (const countryId in state.countries) {
            const country = state.countries[countryId];
            if (!country.isAI) continue;

            // Basic AI Decision Logic (10% chance per turn for each action)
            const targetCountryIds = Object.keys(state.countries).filter(id => id !== countryId);
            if (targetCountryIds.length === 0) continue;
            const targetId = targetCountryIds[Math.floor(Math.random() * targetCountryIds.length)];

            // 1. Declare war?
            if (Math.random() < 0.05 && country.treasury > 10000000) {
                simulation.declareWar(countryId, targetId);
            }
            
            // 2. Improve tech?
            if (Math.random() < 0.2 && country.treasury > 2000000) {
                simulation.investInTech(countryId);
            }
            
            // 3. Perform espionage?
            if (Math.random() < 0.1 && country.treasury > 1000000) {
                const types = Object.values(EspionageType);
                const randomType = types[Math.floor(Math.random() * types.length)];
                simulation.runEspionage(countryId, targetId, randomType);
            }
        }
    }
}
