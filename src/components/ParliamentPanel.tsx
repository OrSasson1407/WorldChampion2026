import React from 'react';
import { Government, Country } from '../game/core/Models';

interface Props {
  government: Government | null;
  country: Country | null;
}

export const ParliamentPanel: React.FC<Props> = ({ government, country }) => {
  if (!government || !country) {
    return (
      <div className="border p-4 mt-4 shadow-sm bg-gray-50 text-gray-500">
        <h2 className="text-lg font-semibold mb-1">Parliament</h2>
        <p className="text-sm">Select a country to view its parliament.</p>
      </div>
    );
  }

  const totalSeats = government.parties.reduce((sum, p) => sum + p.seats, 0) || 1;
  const riskColor = government.coupRisk > 50 ? 'text-red-600' : government.coupRisk > 20 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="border p-4 mt-4 shadow-sm bg-gray-50">
      <h2 className="text-lg font-semibold mb-2">Parliament — {country.name}</h2>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <p>Approval: {government.approvalRating.toFixed(1)}%</p>
        <p>Corruption: {government.corruptionLevel.toFixed(1)}%</p>
        <p className={riskColor}>Coup Risk: {government.coupRisk.toFixed(1)}%</p>
        <p>Next Election: {government.nextElectionDate}</p>
      </div>

      <h3 className="font-medium mt-2 mb-1">Seat Distribution ({totalSeats} seats)</h3>
      <div className="w-full h-4 rounded overflow-hidden flex border">
        {government.parties.map(party => (
          <div
            key={party.id}
            title={`${party.name}: ${party.seats} seats`}
            className={party.id === government.rulingPartyId ? 'bg-blue-600' : 'bg-gray-400'}
            style={{ width: `${(party.seats / totalSeats) * 100}%` }}
          />
        ))}
      </div>

      <div className="mt-2 space-y-1">
        {government.parties.map(party => (
          <div key={party.id} className="flex justify-between text-sm">
            <span className={party.id === government.rulingPartyId ? 'font-semibold' : ''}>
              {party.name} {party.id === government.rulingPartyId && '(Ruling)'}
              <span className="text-gray-500"> — {party.ideology}</span>
            </span>
            <span>{party.seats} seats · {party.popularity.toFixed(0)}% popularity</span>
          </div>
        ))}
      </div>

      <h3 className="font-medium mt-3 mb-1">Laws Passed</h3>
      {government.lawsPassed.length === 0 ? (
        <p className="text-gray-500 text-sm">No laws passed yet.</p>
      ) : (
        <ul className="list-disc list-inside text-sm">
          {government.lawsPassed.map((law, i) => <li key={i}>{law}</li>)}
        </ul>
      )}
    </div>
  );
};

