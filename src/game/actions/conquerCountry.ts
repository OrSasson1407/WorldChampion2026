import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Country } from '../core/Models';

/**
 * Best-effort persistence of a conquest to Firestore.
 *
 * IMPORTANT: this is NOT the source of truth for gameplay. The authoritative
 * ownership change happens synchronously and in-memory via
 * `SimulationManager.conquerCountry` (see src/game/core/SimulationManager.ts),
 * which is what the map actually re-renders from. This function just mirrors
 * the result to Firestore for persistence/multiplayer sync, and is safe to
 * call fire-and-forget - a failure here must never block or roll back the
 * local game state or the map update.
 */
export const persistConquest = async (
  attacker: Country,
  target: Country,
  status: 'OCCUPIED' | 'ANNEXED' = 'OCCUPIED'
): Promise<void> => {
  const targetRef = doc(db, 'countries', target.id);
  await updateDoc(targetRef, {
    controllerId: attacker.id,
    sovereignId: status === 'ANNEXED' ? attacker.id : target.sovereignId,
    occupationStatus: status,
  });
};
