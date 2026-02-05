import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import MapComponent from './components/MapComponent';
import SearchPanel from './components/SearchPanel';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './components/HomeScreen';
import MenuDrawer from './components/MenuDrawer';
import TutorialOverlay, { type TutorialStep } from './components/TutorialOverlay';
import './index.css';
import './App.css';
import logo2 from "../public/dc-logo-cortada.png"



interface Bus {
  VehicleDescription: string;
  LineNumber: string;
  Latitude: number;
  Longitude: number;
  GPSDate: string;
  OriginalLine?: string; // Added for backup
}

import { loadAllRoutes } from './routeMatcher';
import { fetchStopsForLine, getClosestStop, type BusStop } from './stopsManager';
import { calculateETA } from './etaManager';

// Helper to check signal age
export const getBusStatus = (gpsDate: string): 'online' | 'offline' => {
  if (!gpsDate) return 'offline';
  const diff = Date.now() - new Date(gpsDate).getTime();
  return diff > 5 * 60 * 1000 ? 'offline' : 'online'; // 5 minutes tolerance
};

function App() {
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'instituicoes' | 'tarifazero'>('home');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [focusedBusId, setFocusedBusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Stops Logic
  const [lineStops, setLineStops] = useState<BusStop[]>([]);
  const [closestStop, setClosestStop] = useState<BusStop | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<[number, number] | null>(null);
  const [eta, setEta] = useState<string | null>(null);

  // Tutorial Steps Definition
  const TUTORIAL_STEPS: TutorialStep[] = [
    {
      targetId: 'search-input-wrapper',
      title: 'Buscar Linha',
      description: 'Toque aqui para digitar o nome ou número do ônibus que deseja acompanhar.',
      position: 'bottom',
      disableNext: true // Force user interaction
    },
    {
      targetId: 'search-panel-container',
      title: 'Selecionar Ônibus',
      description: 'Digite o nome da linha e selecione o ônibus desejado na lista.',
      position: 'bottom',
      disableNext: true // Force user selection
    },
    {
      targetId: 'map-container',
      title: 'Explorar o Mapa',
      description: 'Você pode arrastar o mapa para os lados e usar pinça para dar zoom.',
      position: 'top-left'
    },
    {
      targetId: 'recenter-btn',
      title: 'Centralizar',
      description: 'Se você perdeu o ônibus de vista, clique aqui para voltar a focar nele automaticamente.',
      position: 'top',
      disableNext: true
    }
  ];

  const handleNextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      setIsTutorialActive(false); // Finish
    }
  };

  const handlePrevStep = () => {
    if (tutorialStep > 0) setTutorialStep(prev => prev - 1);
  };

  const handleSelectLine = (line: string | null) => {
    setSelectedLine(line);
    setFocusedBusId(null);
    setLineStops([]);
    setClosestStop(null);
    setFlyToLocation(null);
    setEta(null);
  };

  const handleFocusBus = (busId: string | null) => {
    setFocusedBusId(busId);
    if (busId) setFlyToLocation(null);

    if (isTutorialActive && tutorialStep === 1 && busId) {
      setTimeout(() => handleNextStep(), 500);
    }
  };

  const handleStopClick = (stop: BusStop) => {
    setFlyToLocation([stop.latitude, stop.longitude]);
    setFocusedBusId(null);
  };

  const handleSearchFocus = () => {
    if (isTutorialActive && tutorialStep === 0) {
      handleNextStep();
    }
  }

  // Fetch Stops when Line changes
  useEffect(() => {
    const loadStops = async () => {
      if (selectedLine) {
        try {
          const stops = await fetchStopsForLine(selectedLine);
          setLineStops(stops || []);
          console.log(`Loaded ${stops?.length} stops for line ${selectedLine}`);
        } catch (e) { console.error(e); }
      }
    };
    loadStops();
  }, [selectedLine]);

  // Calculate Closest Stop AND ETA
  useEffect(() => {
    if (userLocation && lineStops.length > 0) {
      const closest = getClosestStop(userLocation[0], userLocation[1], lineStops);
      setClosestStop(closest);
    }
  }, [userLocation, lineStops]);

  // Separate effect fo ETA to run when buses update too
  useEffect(() => {
    if (closestStop && selectedLine && buses.length > 0) {
      const time = calculateETA(closestStop, selectedLine, buses);
      setEta(time);
    } else {
      setEta(null);
    }
  }, [closestStop, buses, selectedLine]);

  const fetchPositions = async () => {
    try {
      const response = await fetch(`/api/fast-positions?_=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Falha na conexão com o servidor');
      const processedBuses = await response.json();

      setBuses(processedBuses);
      return true; // Success
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Geolocation denied or failed:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  useEffect(() => {
    // Initial Load
    const init = async () => {
      // Backend now handles route matching

      // Load Routes for Client-side Animation Snapping
      loadAllRoutes();

      // Minimum splash duration
      const minTimePromise = new Promise(resolve => setTimeout(resolve, 2000));

      const success = await fetchPositions();

      // Request Location in parallel
      getUserLocation();

      await minTimePromise;

      if (success) {
        setLoading(false);
      } else {
        setError("Não foi possível carregar os dados. Verifique a conexão.");
      }
    };

    init();
  }, []);

  // Polling Effect - Starts when loading is done
  useEffect(() => {
    if (loading || error) return;

    const interval = setInterval(() => {
      fetchPositions();
    }, 4000);

    return () => clearInterval(interval);
  }, [loading, error]);

  return (
    <>
      <SplashScreen isLoading={loading} error={error} />

      {!loading && currentScreen === 'home' && (
        <HomeScreen onSelectOption={(option) => setCurrentScreen(option)} />
      )}

      {!loading && currentScreen === 'instituicoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          <header style={{
            height: '60px',
            backgroundColor: '#003366',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 2000,
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                background: 'transparent'
              }}>
                <img
                  src={logo2}
                  alt="Logo da Prefeitura de Duque de Caxias"
                  style={{ width: '120%', height: '120%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '16px', lineHeight: '1.2' }}>Ouvidoria Orienta</span>
                <span style={{ fontWeight: 400, fontSize: '11px', opacity: 0.8 }}>Instituições Municipais</span>
              </div>
            </div>

            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => setCurrentScreen('home')}
            >
              ← Voltar
            </button>
          </header>

          <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h2 style={{ color: '#003366', marginBottom: '16px' }}>Instituições Municipais</h2>
              <p style={{ color: '#666' }}>Em breve: Lista de instituições municipais e informações de contato.</p>
            </div>
          </main>
        </div>
      )}

      {!loading && currentScreen === 'tarifazero' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          <header style={{
            height: '60px',
            backgroundColor: '#003366',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 2000,
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                background: 'transparent'
              }}>
                <img
                  src={logo2}
                  alt="Logo da Prefeitura de Duque de Caxias"
                  style={{ width: '120%', height: '120%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '16px', lineHeight: '1.2' }}>Tarifa Zero</span>
                <span style={{ fontWeight: 400, fontSize: '11px', opacity: 0.8 }}>Duque de Caxias</span>
              </div>
            </div>

            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu size={28} />
            </button>
          </header>

          {/* Main Content Area */}
          <main style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
            <SearchPanel
              buses={buses}
              onSelectLine={handleSelectLine}
              selectedLine={selectedLine}
              userLocation={userLocation}
              onFocusBus={handleFocusBus}
              focusedBusId={focusedBusId}
              onSearchFocus={handleSearchFocus}
            />
            <MapComponent
              buses={buses}
              selectedLine={selectedLine}
              userLocation={userLocation}
              focusedBusId={focusedBusId}
              lineStops={lineStops}
              closestStop={closestStop}
              flyToLocation={flyToLocation}
              onStopClick={handleStopClick}
              onRecenter={() => {
                if (isTutorialActive && tutorialStep === 3) {
                  setIsTutorialActive(false); // End Tutorial
                }
              }}
            />

            {/* Closest Stop Info Overlay - Clickable */}
            {closestStop && userLocation && selectedLine && (
              <div
                onClick={() => handleStopClick(closestStop)}
                style={{
                  position: 'absolute',
                  bottom: '120px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                  zIndex: 1000,
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'transform 0.1s',
                  whiteSpace: 'nowrap'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
              >
                <span>
                  🚏 Ponto mais próximo: <b>{closestStop.name}</b>
                  {eta && <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: 'bold' }}>⏱ {eta}</span>}
                  <small style={{ color: '#3b82f6', marginLeft: '5px' }}>(Ver)</small>
                </span>
              </div>
            )}

          </main>

          <MenuDrawer
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            onOpenTutorial={() => {
              setTutorialStep(0);
              setIsTutorialActive(true);
            }}
            onBackToHome={() => setCurrentScreen('home')}
          />

          <TutorialOverlay
            isActive={isTutorialActive}
            steps={TUTORIAL_STEPS}
            currentStepIndex={tutorialStep}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onClose={() => setIsTutorialActive(false)}
          />
        </div>
      )}
    </>
  );
}

export default App;

