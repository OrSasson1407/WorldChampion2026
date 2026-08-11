import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Country } from '../core/Models';

export const conquerCountry = async (attacker: Country, target: Country) => {
    const targetRef = doc(db, 'countries', target.id);
    
    await updateDoc(targetRef, {
        controllerId: attacker.controllerId,
        occupationStatus: 'OCCUPIED' // Or 'ANNEXED'
    });
};
