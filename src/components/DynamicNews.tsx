import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GameEvent } from '../game/core/Models';

export function DynamicNews() {
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('timestamp', 'desc'), limit(10));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newEvents: GameEvent[] = [];
      snapshot.forEach((doc) => {
        newEvents.push({ id: doc.id, ...doc.data() } as GameEvent);
      });
      setEvents(newEvents);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="border p-4 mt-4 shadow-sm bg-gray-50 h-64 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2">Game News</h2>
      {events.map((event) => (
        <div key={event.id} className="mb-2 text-sm border-b pb-1">
          <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
          <p>{event.message}</p>
        </div>
      ))}
    </div>
  );
}
