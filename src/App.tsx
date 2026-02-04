import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import MapComponent from './components/MapComponent';
import SearchPanel from './components/SearchPanel';
import SplashScreen from './components/SplashScreen';
import MenuDrawer from './components/MenuDrawer';
import TutorialOverlay, { type TutorialStep } from './components/TutorialOverlay';
import './index.css';
import './App.css';
import logo from "../public/dc-logo.png"

interface Bus {
  VehicleDescription: string;
  LineNumber: string;
  Latitude: number;
  Longitude: number;
  GPSDate: string;
  OriginalLine?: string; // Added for backup
}

import { loadAllRoutes } from './routeMatcher';

function App() {
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [focusedBusId, setFocusedBusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

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
  };

  const handleFocusBus = (busId: string | null) => {
    setFocusedBusId(busId);
    if (isTutorialActive && tutorialStep === 1 && busId) {
      setTimeout(() => handleNextStep(), 500);
    }
  };

  const handleSearchFocus = () => {
    if (isTutorialActive && tutorialStep === 0) {
      handleNextStep();
    }
  }

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

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          {/* Fixed Header */}
          <header style={{
            height: '60px',
            backgroundColor: '#003366', // Prefeitura Blue (approx)
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
              {/* Logo Placeholder - You can replace specific image later */}
              <div style={{
                width: '36px',
                height: '36px',
                background: 'blue',
                borderRadius: '50%', // Circle for logo 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img src={logo} alt="Logo da Prefeitura de Duque de Caxias" className='logoHeader' />
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
              onRecenter={() => {
                if (isTutorialActive && tutorialStep === 3) {
                  setIsTutorialActive(false); // End Tutorial
                }
              }}
            />
          </main>

          <MenuDrawer
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            onOpenTutorial={() => {
              setTutorialStep(0);
              setIsTutorialActive(true);
            }}
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
