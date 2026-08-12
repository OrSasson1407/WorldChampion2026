import React, { useState } from 'react';
import { Country } from '../game/core/Models';

interface Props {
  countries: Country[];
  onConquer: (attackerId: string, targetId: string, status: 'OCCUPIED' | 'ANNEXED') => void;
}

/**
 * Developer-only tool for exercising the conquest game action without
 * needing to play through a full war. Only ever rendered when
 * `import.meta.env.DEV` is true (see App.tsx) - never shipped to production
 * users.
 */
export const DebugConquestPanel: React.FC<Props> = ({ countries, onConquer }) => {
  const [attackerId, setAttackerId] = useState(countries[0]?.id ?? '');
  const [targetId, setTargetId] = useState(countries[1]?.id ?? '');
  const [status, setStatus] = useState<'OCCUPIED' | 'ANNEXED'>('OCCUPIED');

  return (
    <div className="border border-dashed border-orange-400 bg-orange-50 p-3 mt-4 rounded text-sm">
      <h3 className="font-semibold text-orange-700 mb-2">🐞 Debug: Conquer Territory</h3>
      <div className="flex flex-wrap items-center gap-2">
        <select className="border rounded px-2 py-1" value={attackerId} onChange={(e) => setAttackerId(e.target.value)}>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span>conquers</span>
        <select className="border rounded px-2 py-1" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'OCCUPIED' | 'ANNEXED')}
        >
          <option value="OCCUPIED">Occupy</option>
          <option value="ANNEXED">Annex</option>
        </select>
        <button
          type="button"
          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          disabled={!attackerId || !targetId || attackerId === targetId}
          onClick={() => onConquer(attackerId, targetId, status)}
        >
          Execute
        </button>
      </div>
    </div>
  );
};
