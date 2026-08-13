import React from 'react';
import { GameState } from '../game/core/GameState';
import { War, MilitaryBranch, MilitaryBranchType } from '../game/core/Models';

interface Props {
  gameState: GameState;
}

const BRANCHES = [MilitaryBranchType.ARMY, MilitaryBranchType.NAVY, MilitaryBranchType.AIR_FORCE];

const BranchRow: React.FC<{ branch: MilitaryBranch | undefined; label: string }> = ({ branch, label }) => {
  if (!branch) {
    return (
      <div className="flex justify-between text-xs text-gray-400 py-0.5">
        <span>{label}</span>
        <span>No data</span>
      </div>
    );
  }
  return (
    <div className="text-xs py-0.5 border-b border-gray-100">
      <div className="flex justify-between font-medium">
        <span>{label}</span>
        <span>Readiness {branch.readiness.toFixed(0)}% · Morale {(branch.morale ?? 70).toFixed(0)}%</span>
      </div>
      <div className="flex justify-between text-gray-500">
        <span>Manpower: {branch.manpower.toLocaleString()}</span>
        <span>Equip: {branch.equipment.toLocaleString()}</span>
        <span>Fuel: {branch.fuel.toLocaleString()}</span>
        <span>Ammo: {branch.ammunition.toLocaleString()}</span>
      </div>
    </div>
  );
};

const CountryBranches: React.FC<{ gameState: GameState; countryId: string }> = ({ gameState, countryId }) => (
  <div className="flex-1 min-w-[180px]">
    <p className="font-semibold text-sm">{gameState.countries[countryId]?.name}</p>
    {BRANCHES.map(type => (
      <BranchRow key={type} label={type} branch={gameState.militaryBranches[`${countryId}-${type}`]} />
    ))}
  </div>
);

export const WarDashboard: React.FC<Props> = ({ gameState }) => {
  const wars = Object.values(gameState.wars) as War[];
  
  const totalCasualties = wars.reduce((acc, war) => {
      return {
          attacker: acc.attacker + war.casualties.attacker,
          defender: acc.defender + war.casualties.defender
      };
  }, { attacker: 0, defender: 0 });

  return (
    <div className="border p-4 mt-4 bg-gray-50 rounded shadow-sm">
      <h2 className="text-xl font-semibold mb-3">War Dashboard</h2>
      <p className="text-sm">Total Casualties: {(totalCasualties.attacker + totalCasualties.defender).toLocaleString()}</p>
      
      <div className="mt-4">
        <h3 className="font-medium">Active Fronts:</h3>
        {wars.length === 0 ? (
            <p className="text-gray-500 text-sm">No active wars.</p>
        ) : (
            wars.map(war => (
                <div key={war.id} className="border-t mt-2 pt-2 text-sm">
                    <p className="font-semibold">
                        {gameState.countries[war.attackerId]?.name} vs {gameState.countries[war.defenderId]?.name}
                    </p>
                    <p>War Score: {war.warScore.toFixed(1)}</p>
                    <p>Casualties: {(war.casualties.attacker + war.casualties.defender).toLocaleString()}</p>
                    <p className="text-xs text-gray-600">War Exhaustion — {gameState.countries[war.attackerId]?.name}: {(war.exhaustion?.attacker ?? 0).toFixed(0)}% · {gameState.countries[war.defenderId]?.name}: {(war.exhaustion?.defender ?? 0).toFixed(0)}%</p>

                    <div className="flex gap-4 mt-2 flex-wrap">
                        <CountryBranches gameState={gameState} countryId={war.attackerId} />
                        <CountryBranches gameState={gameState} countryId={war.defenderId} />
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

