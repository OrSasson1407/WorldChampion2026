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
import React from 'react';

type TabId = 'map' | 'war' | 'diplomacy' | 'intel' | 'economy' | 'politics' | 'news';

const TABS: { id: TabId; label: string }[] = [
  { id: 'map', label: 'World Map' },
  { id: 'war', label: 'War Room' },
  { id: 'diplomacy', label: 'Diplomacy' },
  { id: 'intel', label: 'Intelligence' },
  { id: 'economy', label: 'Economy' },
  { id: 'politics', label: 'Politics' },
  { id: 'news', label: 'News' },
];

// Inlined here (not a separate file) on purpose: without an error boundary
// anywhere, any uncaught render error unmounts the ENTIRE app -- every click
// handler dies with it, and only a full refresh recovers. Keeping it in this
// same file means the fix can never end up half-applied via a missing import.
interface ErrorBoundaryProps {
  children: React.ReactNode;
  label: string;
}
interface ErrorBoundaryState {
  error: Error | null;
}
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
        useEffect(() => {
    if (playerCountryId && gameState?.countries) {
      const countries = Object.values(gameState.countries);
      const allConquered = countries.every(c => c.id === playerCountryId || (c.occupationStatus === 'OCCUPIED' && c.occupiedBy === playerCountryId));
      if (allConquered && countries.length > 1) {
        setIsVictory(true);
      }
    }
  }, [gameState, playerCountryId]);
  return (
    <div className="border border-red-400 bg-red-50 text-red-800 p-3 rounded text-sm">
{!playerCountryId && (
  <div className="fixed top-0 left-0 w-full bg-blue-700 text-white p-4 text-center z-[100] font-extrabold text-xl shadow-2xl animate-pulse cursor-pointer pointer-events-none">
    🌍 SELECT YOUR NATION: Click on a country on the map to take control and start the game!
  </div>
)}
{playerCountryId && gameState?.countries?.[playerCountryId] && (
  <div className="fixed top-0 left-0 w-full bg-slate-900 text-white p-2 text-center z-40 border-b-4 border-yellow-600 font-bold flex justify-center gap-6 shadow-lg text-sm md:text-base">
    <span>🚩 Playing as: <span className="text-yellow-400">{gameState.countries[playerCountryId].name}</span></span>
    <span className="opacity-50">|</span>
    <span>💰 Treasury: ${gameState.countries[playerCountryId].economy?.toFixed(0)}</span>
    <span className="opacity-50">|</span>
    <span>👥 Manpower: {gameState.countries[playerCountryId].manpower?.toLocaleString()}</span>
    <span className="opacity-50">|</span>
    <span>⚖️ Stability: {gameState.countries[playerCountryId].stability?.toFixed(1)}%</span>
  </div>
)}
{isVictory && (
  <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[200] flex-col">
    <h1 className="text-5xl md:text-7xl text-yellow-500 font-extrabold mb-6 drop-shadow-lg text-center">🏆 WORLD CONQUEST ACHIEVED!</h1>
    <p className="text-white text-xl md:text-3xl text-center">You have successfully taken over all nations on Earth.</p>
    <button onClick={() => window.location.reload()} className="mt-8 px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition text-xl shadow-lg border-2 border-blue-400">Play Again</button>
  </div>
)}
      
      
      
      
      
      
      
      
      
          <p className="font-semibold">{this.props.label} crashed.</p>
          <p className="mt-1 text-xs opacity-80">{this.state.error.message}</p>
          <button
            type="button"
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const simulationRef = useRef<SimulationManager | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [playerCountryId, setPlayerCountryId] = useState<string | null>(null);
  const [isVictory, setIsVictory] = useState(false);
  if (typeof window !== 'undefined') (window as any).playerCountryId = playerCountryId;
  const [targetCountryId, setTargetCountryId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('map');

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

    useEffect(() => {
    if (playerCountryId && gameState?.countries) {
      const countries = Object.values(gameState.countries);
      const allConquered = countries.every(c => c.id === playerCountryId || (c.occupationStatus === 'OCCUPIED' && c.occupiedBy === playerCountryId));
      if (allConquered && countries.length > 1) {
        setIsVictory(true);
      }
    }
  }, [gameState, playerCountryId]);
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      
      
      
      
      
      
      
      
      
      {/* Top bar - fixed height, never scrolls */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-panel-border">
        <h1 className="text-2xl font-bold m-0 border-none pb-0">World Empire 2027</h1>
        <div className="flex items-center gap-4 text-sm">
          <span>Date: {gameState.currentDate}</span>
          <span>Turn: {gameState.currentTurn}</span>
          <button
              className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleNextTurn}
          >
              Next Turn
          </button>
        </div>
      </header>

      {/* Body: nav | content | country panel - only inner panes scroll */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left nav = table of contents (׳³ֳ—׳³ג€¢׳³ג€÷׳³ֲ ׳³ֲ¢׳³ֲ ׳³ג„¢׳³ג„¢׳³ֲ ׳³ג„¢׳³ֲ) */}
        <nav className="w-44 shrink-0 border-r border-panel-border overflow-y-auto">
          {TABS.map((tab) => {
            const isWarTab = tab.id === 'war';
            const warCount = Object.keys(gameState.wars).length;
              useEffect(() => {
    if (playerCountryId && gameState?.countries) {
      const countries = Object.values(gameState.countries);
      const allConquered = countries.every(c => c.id === playerCountryId || (c.occupationStatus === 'OCCUPIED' && c.occupiedBy === playerCountryId));
      if (allConquered && countries.length > 1) {
        setIsVictory(true);
      }
    }
  }, [gameState, playerCountryId]);
  return (
    <button
                key={tab.id}
                type="button"
                onClick={() =>
      
      
      
      
      
       setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 text-sm border-b border-panel-border transition-colors ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {isWarTab && warCount > 0 && (
                  <span className="ml-2 text-xs opacity-80">({warCount})</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Center content - the ONLY area that scrolls for its section.
            Keyed by activeTab so a crash in one panel resets cleanly when
            you switch tabs, instead of leaving a dead subtree behind. */}
        <main className="flex-1 overflow-y-auto min-h-0 p-4">
          <ErrorBoundary key={activeTab} label={`${activeTab} panel`}>
          {activeTab === 'map' && (
                    
        
      
      
      
          <MapRenderer
                countries={allCountries}
                allCountries={gameState.countries}
                wars={gameState.wars}
                selectedCountryId={selectedCountryId}
                onSelectCountry={setSelectedCountryId}
            />
          )}

          {activeTab === 'war' && (
            <WarDashboard gameState={gameState} />
          )}

          {activeTab === 'diplomacy' && (
            selectedCountry ? (
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
            ) : (
              <div className="border p-4 text-gray-500">Select a country to manage diplomacy</div>
            )
          )}

          {activeTab === 'intel' && (
            selectedCountry ? (
              <>
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
                {targetCountryId && (
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
              </>
            ) : (
              <div className="border p-4 text-gray-500">Select a country to view intelligence</div>
            )
          )}

          {activeTab === 'economy' && (
            <CentralBankPanel
                centralBank={selectedCentralBank ?? null}
                country={selectedCountry ?? null}
                onSetInterestRate={(rate) => {
                    if (!selectedCountry) return;
                    simulationRef.current!.setInterestRate(selectedCountry.id, rate);
                    updateState();
                }}
            />
          )}

          {activeTab === 'politics' && (
            <ParliamentPanel government={selectedGovernment ?? null} country={selectedCountry ?? null} />
          )}

          {activeTab === 'news' && (
            <DynamicNews
                events={gameState.events}
                countryId={selectedCountryId}
                countryName={selectedCountry?.name}
            />
          )}
          </ErrorBoundary>
        </main>

        {/* Right panel - selected country, pinned, scrolls internally only.
            Keyed by selectedCountryId so a crash rendering one country's
            card can't permanently block selecting a different country --
            the boundary remounts fresh the moment selection changes. */}
        <aside className="w-80 shrink-0 border-l border-panel-border overflow-y-auto min-h-0 p-3">
            <ErrorBoundary key={selectedCountryId ?? 'none'} label="Country panel">
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
                        setActiveTab('intel');
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
            </ErrorBoundary>

            {toast && (
                <Toast
                    message={toast.message}
                    success={toast.success}
                    onClose={() => setToast(null)}
                />
            )}
        </aside>
      </div>
    </div>
  );
}
