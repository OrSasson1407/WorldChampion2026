import React, { useState } from 'react';
import { CentralBank, Country } from '../game/core/Models';

interface Props {
  centralBank: CentralBank | null;
  country: Country | null;
  onSetInterestRate: (rate: number) => void;
}

export const CentralBankPanel: React.FC<Props> = ({ centralBank, country, onSetInterestRate }) => {
  const [rateInput, setRateInput] = useState<string>('');

  if (!centralBank || !country) {
    return (
      <div className="border p-4 mt-4 shadow-sm bg-gray-50 text-gray-500">
        <h2 className="text-lg font-semibold mb-1">Central Bank</h2>
        <p className="text-sm">Select a country to view its central bank.</p>
      </div>
    );
  }

  return (
    <div className="border p-4 mt-4 shadow-sm bg-gray-50">
      <h2 className="text-lg font-semibold mb-2">Central Bank — {centralBank.currencyCode}</h2>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <p>Interest Rate: {centralBank.interestRate.toFixed(2)}%</p>
        <p>Exchange Rate: 1 {centralBank.currencyCode} = ${centralBank.exchangeRateToUSD.toFixed(3)}</p>
        <p>Foreign Reserves: ${centralBank.foreignReserves.toLocaleString()}</p>
        <p>Inflation: {country.inflation.toFixed(2)}%</p>
        <p>National Debt: ${country.debt.toLocaleString()}</p>
      </div>

      <div className="flex gap-2 items-center mt-2">
        <input
          type="number"
          step="0.1"
          min={0}
          max={25}
          placeholder="New rate %"
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          className="w-28 p-1 border rounded text-sm"
        />
        <button
          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
          onClick={() => {
            const value = parseFloat(rateInput);
            if (!Number.isNaN(value)) {
              onSetInterestRate(value);
              setRateInput('');
            }
          }}
        >
          Set Interest Rate
        </button>
      </div>
    </div>
  );
};

