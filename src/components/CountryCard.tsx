import React from 'react';
import { Country } from '../game/core/Models';

export interface Props {
  country: Country;
  onRecruit: () => void;
  onImproveRelations: (targetId: string) => void;
  onDeclareWar: (targetId: string) => void;
  onConductEspionage: (targetId: string) => void;
  onInvestInTech: () => void;
  otherCountries: Country[];
}

export const CountryCard: React.FC<Props> = (props) => {
  const { country, onRecruit, onImproveRelations, onDeclareWar, onConductEspionage, onInvestInTech, otherCountries } = props;
  return (
    <div className="border p-4 mt-4 shadow-sm">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        {country.name}
        <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: country.color }} />
      </h2>
      <p>GDP: ${country.gdp.toLocaleString()}</p>
      <p>Treasury: ${country.treasury.toLocaleString()}</p>
      <p>Military Power: {country.militaryPower}</p>
      <p>Tech: {country.technologyLevel}</p>
      <p>Stability: {country.stability.toFixed(2)}</p>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700 border-t pt-2">
        <p>Debt: ${country.debt.toLocaleString()}</p>
        <p>Inflation: {country.inflation.toFixed(2)}%</p>
        <p>Unemployment: {(country.unemployment ?? 5).toFixed(1)}%</p>
        <p>Reputation: {(country.internationalReputation ?? 50).toFixed(0)}/100</p>
        <p>Manpower: {country.manpower.toLocaleString()}</p>
        <p>Equipment: {country.equipment.toLocaleString()}</p>
        <p>Readiness: {country.readiness.toFixed(0)}%</p>
        <p>Infrastructure: {country.infrastructure.toFixed(0)}</p>
      </div>

      {country.budgetAllocation && (
        <div className="mt-2 text-sm text-gray-700">
          <span className="font-medium">Budget:</span> Military {country.budgetAllocation.military.toFixed(0)}% ·
          {' '}Social {country.budgetAllocation.social.toFixed(0)}% ·
          {' '}Infrastructure {country.budgetAllocation.infrastructure.toFixed(0)}%
        </div>
      )}
      
      <div className="flex gap-2 mt-2">
        <button 
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={onRecruit}
        >
          Recruit Army (Cost: $1M)
        </button>
        <button 
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
          onClick={onInvestInTech}
        >
          Invest in Tech (Cost: $2M)
        </button>
      </div>

      <div className="mt-3">
        <h3 className="font-medium">Diplomacy:</h3>
        {otherCountries.filter(c => c.id !== country.id).map(other => (
            <div key={other.id} className="flex justify-between items-center mt-1">
                <span>{other.name}: {country.diplomacy[other.id] || 0}</span>
                <div className="flex gap-1">
                    <button 
                        className="px-2 py-0.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        onClick={() => onImproveRelations(other.id)}
                    >
                        Improve
                    </button>
                    <button 
                        className="px-2 py-0.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                        onClick={() => onConductEspionage(other.id)}
                    >
                        Spy
                    </button>
                    <button 
                        className="px-2 py-0.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        onClick={() => onDeclareWar(other.id)}
                    >
                        War
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

