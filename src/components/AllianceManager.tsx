import React, { useState } from 'react';
import { Country, Treaty, TreatyType } from '../game/core/Models';

interface Props {
  country: Country;
  otherCountries: Country[];
  treaties: Record<string, Treaty>;
  onSignTreaty: (type: TreatyType, targetId: string) => void;
  onBreakTreaty: (treatyId: string) => void;
}

export const AllianceManager: React.FC<Props> = ({ country, otherCountries, treaties, onSignTreaty, onBreakTreaty }) => {
  const candidates = otherCountries.filter(c => c.id !== country.id);
  const [targetId, setTargetId] = useState<string>(candidates[0]?.id ?? '');
  const [treatyType, setTreatyType] = useState<TreatyType>(TreatyType.ALLIANCE);

  const myTreaties = Object.values(treaties).filter(t => t.active && t.memberCountryIds.includes(country.id));

  const countryName = (id: string) => otherCountries.find(c => c.id === id)?.name ?? (id === country.id ? country.name : id);

  return (
    <div className="border p-4 mt-4 shadow-sm bg-gray-50">
      <h2 className="text-lg font-semibold mb-2">Alliance Manager — {country.name}</h2>

      {myTreaties.length === 0 ? (
        <p className="text-gray-500 text-sm">No active treaties.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {myTreaties.map(treaty => (
            <div key={treaty.id} className="flex justify-between items-center text-sm border-t pt-2">
              <span>
                <span className="font-medium">{treaty.type}</span>{' '}
                with {treaty.memberCountryIds.filter(id => id !== country.id).map(countryName).join(', ')}
                <span className="text-gray-500"> (signed {treaty.signedDate})</span>
              </span>
              <button
                className="px-2 py-0.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                onClick={() => onBreakTreaty(treaty.id)}
              >
                Break
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center mt-2 flex-wrap">
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="p-1 border rounded text-sm">
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={treatyType} onChange={(e) => setTreatyType(e.target.value as TreatyType)} className="p-1 border rounded text-sm">
          {Object.values(TreatyType).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          onClick={() => targetId && onSignTreaty(treatyType, targetId)}
        >
          Propose
        </button>
      </div>
    </div>
  );
};

