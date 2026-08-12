import { useState } from 'react';
import { GameEvent, EventCategory } from '../game/core/Models';

interface Props {
  events: GameEvent[];
  countryId?: string | null;
  countryName?: string;
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  [EventCategory.ECONOMY]: 'text-green-700',
  [EventCategory.MILITARY]: 'text-red-700',
  [EventCategory.POLITICS]: 'text-purple-700',
  [EventCategory.DIPLOMACY]: 'text-blue-700',
};

export function DynamicNews({ events, countryId, countryName }: Props) {
  const [filterToCountry, setFilterToCountry] = useState(true);

  const showingCountryFeed = Boolean(countryId) && filterToCountry;

  const visibleEvents = (showingCountryFeed
    ? events.filter(e => e.countryId === countryId)
    : events
  ).slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 30);

  return (
    <div className="border p-4 mt-4 shadow-sm bg-gray-50 h-64 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">
          {showingCountryFeed ? `News — ${countryName ?? 'Selected Country'}` : 'Game News'}
        </h2>
        {countryId && (
          <button
            className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100"
            onClick={() => setFilterToCountry(f => !f)}
          >
            {filterToCountry ? 'Show all' : 'Show this country'}
          </button>
        )}
      </div>
      {visibleEvents.length === 0 ? (
        <p className="text-gray-500 text-sm">No events yet.</p>
      ) : (
        visibleEvents.map((event) => (
          <div key={event.id} className="mb-2 text-sm border-b pb-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span className={CATEGORY_COLORS[event.category]}>{event.category}</span>
              <span>Turn {event.turn}</span>
            </div>
            <p>{event.message}</p>
          </div>
        ))
      )}
    </div>
  );
}

