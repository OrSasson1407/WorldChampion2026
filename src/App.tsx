/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';
import { SimulationManager } from './game/core/SimulationManager';
import { DataManager } from './game/core/DataManager';
import { CountryCard } from './components/CountryCard';
import { MapRenderer } from './components/MapRenderer';
import { WarDashboard } from './components/WarDashboard';
import { EspionagePanel } from './components/EspionagePanel';
import { Toast } from './components/Toast';
import { DynamicNews } from './components/DynamicNews';
import { ParliamentPanel } from './components/ParliamentPanel';
import { CentralBankPanel } from './components/CentralBankPanel';
import { AllianceManager } from './components/AllianceManager';
import { IntelNetworkView } from './components/IntelNetworkView';
import { Country, EspionageType, Province } from './game/core/Models';
import { GameState } from './game/core/GameState';

export default function App() {
  const simulationRef = useRef<SimulationManager | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [targetCountryId, setTargetCountryId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);

  useEffect(() => {
    async function loadData() {
        setLoading(true);
        const countries = await DataManager.loadInitialCountries();

        // Load provinces from Firestore
        const provincesCol = collection(db, 'provinces');
        const provinceSnapshot = await getDocs(provincesCol);
        const provinces: Record<string, Province> = {};
        provinceSnapshot.forEach((doc) => {
            provinces[doc.id] = doc.data() as Province;
        });

        // Phase 0/1: load newly seeded collections
        const governments = await DataManager.loadGovernments();
        const centralBanks = await DataManager.loadCentralBanks();
        const militaryBranches = await DataManager.loadMilitaryBranches();

        const initialState: GameState = {
            worldSeed: "initial-seed",
            currentTurn: 0,
            currentDate: "2026-01-01",
            version: "1.1.0",
            countries,
            provinces,
            armies: {},
            wars: {},
            governments,
            centralBanks,
            treaties: {},
            sanctions: {},
            tradeAgreements: {},
            intelNetworks: {},
            militaryBranches,
            generals: {},
            events: [],
        };
        simulationRef.current = new SimulationManager(initialState);
        setGameState(initialState);
        setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
      return <div className="p-4">Loading...</div>;
  }

  if (!gameState || !simulationRef.current) {
      return <div className="p-4">Initializing simulation...</div>;
  }

  const updateState = () => {
    setGameState(JSON.parse(JSON.stringify(simulationRef.current!.getState())));
  };

  const handleNextTurn = () => {
    simulationRef.current!.processTurn();
    updateState();
  };

  const selectedCountry = selectedCountryId ? gameState.countries[selectedCountryId] : null;
  const selectedGovernment = selectedCountryId ? gameState.governments[selectedCountryId] : null;
  const selectedCentralBank = selectedCountryId ? gameState.centralBanks[selectedCountryId] : null;
  const allCountries = Object.values(gameState.countries) as Country[];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">World Empire 2027</h1>
      <div className="mt-4 bg-gray-100 p-4 rounded">
        <p>Date: {gameState.currentDate}</p>
        <p>Turn: {gameState.currentTurn}</p>
        <button 
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleNextTurn}
        >
            Next Turn
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
            <MapRenderer 
                countries={allCountries}
                allCountries={gameState.countries}
                wars={gameState.wars}
                selectedCountryId={selectedCountryId}
                onSelectCountry={setSelectedCountryId}
            />
            <WarDashboard gameState={gameState} />

            {selectedCountry && (
                <AllianceManager
                    country={selectedCountry}
                    otherCountries={allCountries}
                    treaties={gameState.treaties}
                    onSignTreaty={(type, targetId) => {
                        simulationRef.current!.signTreaty(type, [selectedCountry.id, targetId]);
                        updateState();
                    }}
                    onBreakTreaty={(treatyId) => {
                        simulationRef.current!.breakTreaty(treatyId);
                        updateState();
                    }}
                />
            )}

            {selectedCountry && (
                <IntelNetworkView
                    country={selectedCountry}
                    otherCountries={allCountries}
                    intelNetworks={gameState.intelNetworks}
                    onRecruitAgent={(targetId, category) => {
                        const result = simulationRef.current!.recruitAgent(selectedCountry.id, targetId, category);
                        setToast(result);
                        updateState();
                    }}
                />
            )}
        </div>
        
        <div>
            {selectedCountry ? (
                <CountryCard 
                    country={selectedCountry} 
                    otherCountries={allCountries}
                    onRecruit={() => {
                        simulationRef.current!.recruitArmy(selectedCountry.id);
                        updateState();
                    }}
                    onDeclareWar={(targetId) => {
                        simulationRef.current!.declareWar(selectedCountry.id, targetId);
                        updateState();
                    }}
                    onConductEspionage={(targetId) => {
                        setTargetCountryId(targetId);
                    }}
                    onInvestInTech={() => {
                        simulationRef.current!.investInTech(selectedCountry.id);
                        updateState();
                    }}
                    onImproveRelations={(targetId) => {
                        simulationRef.current!.improveRelations(selectedCountry.id, targetId);
                        updateState();
                    }}
                />
            ) : (
                <div className="border p-4 text-gray-500">Select a country on the map</div>
            )}

            <ParliamentPanel government={selectedGovernment ?? null} country={selectedCountry ?? null} />

            <CentralBankPanel
                centralBank={selectedCentralBank ?? null}
                country={selectedCountry ?? null}
                onSetInterestRate={(rate) => {
                    if (!selectedCountry) return;
                    simulationRef.current!.setInterestRate(selectedCountry.id, rate);
                    updateState();
                }}
            />

            {selectedCountry && targetCountryId && (
                <EspionagePanel 
                    targetName={gameState.countries[targetCountryId]?.name || "Unknown"}
                    onExecute={(type: EspionageType) => {
                        const result = simulationRef.current!.runEspionage(selectedCountry.id, targetCountryId, type);
                        setToast(result);
                        updateState();
                        setTargetCountryId(null);
                    }}
                />
            )}
            {toast && (
                <Toast 
                    message={toast.message} 
                    success={toast.success} 
                    onClose={() => setToast(null)} 
                />
            )}
            <DynamicNews 
                events={gameState.events} 
                countryId={selectedCountryId} 
                countryName={selectedCountry?.name}
            />
        </div>
      </div>
    </div>
  );
}

