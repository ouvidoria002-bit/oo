import { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import SearchPanel from './components/SearchPanel';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './components/HomeScreen';
import MenuDrawer from './components/MenuDrawer';
import AppHeader from './components/AppHeader';
import TutorialOverlay, { type TutorialStep } from './components/TutorialOverlay';
import InstituicoesScreen from './components/InstituicoesScreen';
import './index.css';
import './App.css';
import './components/Responsive.css';
import { loadAllRoutes } from './routeMatcher';
import { fetchStopsForLine, getClosestStop, type BusStop } from './stopsManager';
import { calculateETA } from './etaManager';

interface Bus {
  VehicleDescription: string;
  LineNumber: string;
  Latitude: number;
  Longitude: number;
  GPSDate: string;
  OriginalLine?: string; // Added for backup
}

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

  // Institutions Data
  const [instituicoes, setInstituicoes] = useState<any[]>([]);

  // Tutorial Steps Definition
  const TUTORIAL_STEPS: TutorialStep[] = [
    // ... items remain same
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

  // Load Institutions
  useEffect(() => {
    const loadInstituicoes = async () => {
      try {
        const response = await fetch(`/instituicoes.json?t=${Date.now()}`);
        const data = await response.json();

        let allItems: any[] = [];

        const process = (list: any[], category: string, typeDesc: string) => {
          return list.map(item => {
            let lat = item.latitude;
            let lng = item.longitude;

            // Try to parse coordinates from address string if numerical coords are missing
            // Format: "-22.123, -43.123"
            if ((!lat || !lng) && typeof item.endereco === 'string') {
              const coordMatch = item.endereco.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
              if (coordMatch) {
                lat = parseFloat(coordMatch[1]);
                lng = parseFloat(coordMatch[2]);
              }
            }

            // Generate short name logic (same as InstituicoesScreen, simplified)
            let displayName = item.nome;
            if (displayName && displayName.includes('SECRETARIA MUNICIPAL DE')) {
              const parts = displayName.replace('SECRETARIA MUNICIPAL DE ', '').split(' ');
              displayName = (parts.length > 3)
                ? 'SM ' + parts.map((p: any) => p[0]).join('').toUpperCase()
                : displayName.replace('SECRETARIA MUNICIPAL DE ', 'SM ');
            }

            return {
              ...item,
              latitude: lat,
              longitude: lng,
              category,
              type: item.tipo || typeDesc,
              displayName
            };
          });
        };

        if (data.secretarias) allItems = [...allItems, ...process(data.secretarias, 'Secretaria', 'ADM')];
        if (data.unidades_saude) allItems = [...allItems, ...process(data.unidades_saude, 'Saúde', 'Saúde')];
        if (data.escolas) allItems = [...allItems, ...process(data.escolas, 'Educação', 'Escola')];
        if (data.servicos_socioassistenciais) allItems = [...allItems, ...process(data.servicos_socioassistenciais, 'Social', 'Assistência')];

        setInstituicoes(allItems);
      } catch (e) {
        console.error("Failed to load institutions map data", e);
      }
    };
    loadInstituicoes();
  }, []);

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
        <InstituicoesScreen onBack={() => setCurrentScreen('home')} />
      )}

      {!loading && currentScreen === 'tarifazero' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          <AppHeader
            title="Tarifa Zero"
            subtitle="Duque de Caxias"
            onMenuClick={() => setIsMenuOpen(true)}
          />

          {/* Main Content Area */}
          <main className="app-main">
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
              instituicoes={instituicoes}
            />

            {/* Closest Stop Info Overlay - Clickable */}
            {closestStop && userLocation && selectedLine && (
              <div
                onClick={() => handleStopClick(closestStop)}
                className="closest-stop-info"
              >
                <span className="closest-stop-text">
                  🚏 Ponto mais próximo: <b>{closestStop.name}</b>
                  {eta && <span className="closest-stop-eta">⏱ {eta}</span>}
                  <small className="closest-stop-action">(Ver)</small>
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
