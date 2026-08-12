import React, { useState } from 'react';
import { Country, IntelNetwork, IntelCategory } from '../game/core/Models';

interface Props {
  country: Country;
  otherCountries: Country[];
  intelNetworks: Record<string, IntelNetwork>;
  onRecruitAgent: (targetId: string, category: IntelCategory) => void;
}

export const IntelNetworkView: React.FC<Props> = ({ country, otherCountries, intelNetworks, onRecruitAgent }) => {
  const candidates = otherCountries.filter(c => c.id !== country.id);
  const [targetId, setTargetId] = useState<string>(candidates[0]?.id ?? '');
  const [category, setCategory] = useState<IntelCategory>(IntelCategory.HUMINT);

  const myNetworks = Object.values(intelNetworks).filter(n => n.ownerCountryId === country.id);

  const countryName = (id: string) => otherCountries.find(c => c.id === id)?.name ?? id;

  return (
    <div className="border p-4 mt-4 shadow-sm bg-gray-50">
      <h2 className="text-lg font-semibold mb-2">Intel Network — {country.name}</h2>

      {myNetworks.length === 0 ? (
        <p className="text-gray-500 text-sm">No active intelligence networks.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {myNetworks.map(network => (
            <div key={network.id} className="text-sm border-t pt-2">
              <p className="font-medium">{countryName(network.targetCountryId)} — {network.category}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-24 text-gray-500">Strength</span>
                <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                  <div className="h-2 bg-green-600" style={{ width: `${network.networkStrength}%` }} />
                </div>
                <span>{network.networkStrength.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-24 text-gray-500">Exposure</span>
                <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                  <div className="h-2 bg-red-600" style={{ width: `${network.exposureRisk}%` }} />
                </div>
                <span>{network.exposureRisk.toFixed(0)}%</span>
              </div>
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
        <select value={category} onChange={(e) => setCategory(e.target.value as IntelCategory)} className="p-1 border rounded text-sm">
          {Object.values(IntelCategory).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          className="px-3 py-1 bg-yellow-700 text-white rounded hover:bg-yellow-800 text-sm"
          onClick={() => targetId && onRecruitAgent(targetId, category)}
        >
          Recruit Agent ($750K)
        </button>
      </div>
    </div>
  );
};

