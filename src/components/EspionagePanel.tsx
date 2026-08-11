import React, { useState } from 'react';
import { EspionageType } from '../game/core/Models';

interface Props {
  onExecute: (type: EspionageType) => void;
  targetName: string;
}

export const EspionagePanel: React.FC<Props> = ({ onExecute, targetName }) => {
  const [selectedType, setSelectedType] = useState<EspionageType>(EspionageType.SPY);

  return (
    <div className="border p-4 mt-4 bg-gray-50 rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Espionage against {targetName}</h2>
      <select 
        value={selectedType} 
        onChange={(e) => setSelectedType(e.target.value as EspionageType)}
        className="w-full p-2 border rounded mb-2"
      >
        {Object.values(EspionageType).map(type => (
            <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <button 
        className="w-full px-3 py-2 bg-red-700 text-white rounded hover:bg-red-800"
        onClick={() => onExecute(selectedType)}
      >
        Execute Operation (Cost: $1M)
      </button>
    </div>
  );
};
