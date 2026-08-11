import { INITIAL_GAME_STATE } from '../core/GameState';
import { SimulationManager } from '../core/SimulationManager';

function runDebugTest() {
  console.log("--- Starting Phase 0 Debug Test ---");
  const sim = new SimulationManager(INITIAL_GAME_STATE);
  console.log("Initial State:", sim.getState());
  sim.processTurn();
  sim.processTurn();
  console.log("Final State:", sim.getState());
  console.log("--- Phase 0 Debug Test Complete ---");
}

runDebugTest();
