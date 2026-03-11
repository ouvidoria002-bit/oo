import { useState, useEffect, useRef, startTransition } from 'react';
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
  Speed: number;        // km/h — dead reckoning
  Direction: number;    // graus — dead reckoning
  GPSDate: string;
  OriginalLine?: string;
  status?: 'NORMAL' | 'PARADO' | 'FORA_ROTA' | 'SUSPEITO' | 'SEM_SINAL'; // Smart Status
  v?: number;           // versão incremental para detectar pacotes fora de ordem
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
  // Opt 3: Map ref for partial state updates — avoids replacing entire array on each delta
  const busMapRef = useRef<Map<string, Bus>>(new Map());
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [focusedBusId, setFocusedBusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [splashVisible, setSplashVisible] = useState(true);

  // Stops Logic
  const [lineStops, setLineStops] = useState<BusStop[]>([]);
  const [closestStop, setClosestStop] = useState<BusStop | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<[number, number] | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [isStopInfoOpen, setIsStopInfoOpen] = useState(false);

  // Institutions Data
  const [instituicoes, setInstituicoes] = useState<any[]>([]);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
        const response = await fetch(`${import.meta.env.BASE_URL}instituicoes.json?t=${Date.now()}`);
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
      // Circuit Breaker: limite de 5 segundos para a requisição
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/cbt/api/fast-positions?_=${Date.now()}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId); // Limpa o timer se a requisição for bem sucedida

      if (!response.ok) throw new Error('Falha na conexão com o servidor');
      const processedBuses = await response.json();

      setBuses(processedBuses);
      return true; // Success
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // Fallback natural se internet for muito lenta ou oscilar forte
        console.warn('Conexão lenta: A requisição foi abortada pelo app após demorar mais de 5 segundos.');
      } else {
        console.error('Erro na chamada aos ônibus:', e);
      }
      return false;
    }
  };

  const getUserLocation = () => {
    // Plano B: Geolocalização silenciosa por IP (Fragilidade 5)
    const fallbackLocation = async () => {
      try {
        const resp = await fetch('https://ipapi.co/json/');
        const dados = await resp.json();
        if (dados.latitude && dados.longitude) {
          setUserLocation([dados.latitude, dados.longitude]);
          console.log('Geolocalização via IP aplicada com sucesso.');
        } else {
          // Fallback C (Extremo): Centro de Duque de Caxias
          setUserLocation([-22.7853, -43.3039]);
        }
      } catch (err) {
        console.warn('Falha no fallback de localização, usando Caxias padrão.', err);
        setUserLocation([-22.7853, -43.3039]);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Geolocalização nativa falhou, acionando Fallback IP:", error);
          fallbackLocation();
        },
        // Circuit Breaker do mapa: não deixa a busca presa na tela para sempre
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      // Browser sem suporte a GPS
      fallbackLocation();
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

  // SSE Effect — replaces the old setInterval polling
  // Connects once and receives pushes *only when server detects real movement*
  useEffect(() => {
    if (loading || error) return;

    let es: EventSource | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connectSSE = () => {
      if (destroyed) return;
      es = new EventSource('/cbt/api/events');

      es.onopen = () => {
        // Clear fallback polling when SSE reconnects
        if (fallbackTimer) {
          clearInterval(fallbackTimer);
          fallbackTimer = null;
          console.log('[SSE] Reconnected — stopped fallback polling');
        }
      };

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'snapshot') {
            const map = new Map<string, Bus>(msg.vehicles.map((v: Bus) => [v.VehicleDescription, v]));
            busMapRef.current = map;
            startTransition(() => {
              setBuses(Array.from(map.values()));
            });
            console.log(`[SSE] 🗺️ Snapshot — ${msg.vehicles.length} ônibus @ ${new Date().toLocaleTimeString('pt-BR')}`);

          } else if (msg.type === 'delta') {
            // Field-level merge com verificação de versão
            let updated = 0;
            msg.vehicles.forEach((delta: Partial<Bus> & { v?: number }) => {
              const id = delta.VehicleDescription;
              if (!id) return;
              const existing = busMapRef.current.get(id);
              if (!existing) return;
              // Descarta se versão for mais antiga que a atual (pacote fora de ordem)
              if (delta.v !== undefined && existing.v !== undefined && delta.v < existing.v) return;
              busMapRef.current.set(id, { ...existing, ...delta });
              updated++;
            });
            if (updated > 0) {
              startTransition(() => {
                setBuses(Array.from(busMapRef.current.values()));
              });
              console.log(`[SSE] 🚌 Delta — ${updated} campo(s) @ ${new Date().toLocaleTimeString('pt-BR')}`);
            }

          } else if (Array.isArray(msg)) {
            setBuses(msg); // fallback legacy
          }
        } catch (e) {
          console.warn('[SSE] Failed to parse message:', e);
        }
      };

      es.onerror = () => {
        es?.close();
        // Start fallback polling so map doesn't freeze
        if (!fallbackTimer) {
          console.warn('[SSE] Connection lost, starting fallback polling...');
          fallbackTimer = setInterval(fetchPositions, 4000);
        }
        // Schedule reconnect in 5 seconds
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            console.log('[SSE] Attempting to reconnect...');
            connectSSE();
          }, 5000);
        }
      };
    };

    connectSSE();

    return () => {
      destroyed = true;
      es?.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [loading, error]);

  return (
    <>
      <SplashScreen
        isLoading={loading}
        error={error}
        onAnimationComplete={() => setSplashVisible(false)}
      />

      {(!loading || splashVisible) && currentScreen === 'home' && (
        <HomeScreen
          onSelectOption={(option) => setCurrentScreen(option)}
          hideLogo={splashVisible}
          deferredPrompt={deferredPrompt}
          setDeferredPrompt={setDeferredPrompt}
        />
      )}

      {!loading && currentScreen === 'instituicoes' && (
        <InstituicoesScreen onBack={() => setCurrentScreen('home')} />
      )}

      {!loading && currentScreen === 'tarifazero' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', overflow: 'hidden' }}>
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

            {/* Empty State Overlay */}
            {!selectedLine && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '20px 30px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                textAlign: 'center',
                zIndex: 400, // Above map but below SearchPanel (1001)
                pointerEvents: 'none',
                maxWidth: '80%',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🗺️</div>
                <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '18px' }}>Selecione uma Linha</h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px', lineHeight: '1.4' }}>
                  Use a barra de busca acima para escolher qual ônibus ou linha você deseja monitorar.
                </p>
              </div>
            )}

            {/* Closest Stop Info Overlay - Clickable */}
            {closestStop && userLocation && selectedLine && (
              <div style={{
                position: 'absolute',
                bottom: 'max(env(safe-area-inset-bottom, 20px), 150px)', // Above legend
                left: '10px',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'flex-end',
                gap: '10px',
                pointerEvents: 'auto'
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsStopInfoOpen(!isStopInfoOpen); }}
                  style={{
                    background: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    color: '#3b82f6',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  title="Ver ponto mais próximo"
                >
                  <span style={{ fontSize: '18px' }}>🚏</span>
                </button>
                {isStopInfoOpen && (
                  <div
                    onClick={() => handleStopClick(closestStop)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      border: '1px solid rgba(0,0,0,0.05)',
                      color: '#1f2937',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      maxWidth: '65vw',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ponto Mais Próximo</span>
                      {eta && <span style={{ color: '#10b981', fontWeight: 'bold' }}>⏱ {eta}</span>}
                    </div>
                    <b style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{closestStop.name}</b>
                    <small style={{ color: '#3b82f6', marginTop: '2px', fontWeight: 'bold' }}>Tocar para focar (Ver)</small>
                  </div>
                )}
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
