import React from 'react';
import { GameState } from '../game/core/GameState';
import { War } from '../game/core/Models';

interface Props {
  gameState: GameState;
}

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
                </div>
            ))
        )}
      </div>
    </div>
  );
};
