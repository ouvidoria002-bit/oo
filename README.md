# 🚌 TZ-APP — Painel de Monitoramento Tarifa Zero

Aplicação React (Vite + TypeScript) que exibe em tempo real a posição e trajetória dos ônibus do programa **Tarifa Zero** de Duque de Caxias no mapa. Possui também uma tela de busca de instituições municipais (secretarias, unidades de saúde, escolas e serviços de assistência social).

---

## 📦 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Mapa | Leaflet + react-leaflet |
| Geometria | @turf/turf (cálculos de rota e proximidade) |
| Ícones | lucide-react |
| Animação de marcadores | react-leaflet-drift-marker |
| Formatação KML | leaflet-omnivore |
| Produção | Servido pelo PM2 via pacote `serve` na porta **3005** |

---

## 🗂️ Estrutura de Diretórios

```
TZ-APP/
├── public/
│   ├── instituicoes.json        ← Base de dados de instituições municipais (gerada por unify_data.py)
│   ├── dc-logo.png, *.png, *.jpg ← Assets estáticos da UI
│   └── geocoder.html            ← Ferramenta auxiliar de geocodificação
│
├── src/
│   ├── App.tsx                  ← Componente raiz: gerencia telas, polling de ônibus, stops e ETA
│   ├── main.tsx                 ← Entry point React
│   ├── constants.ts             ← Mapeamento de linhas (DC-TZxx) para arquivos KML
│   ├── routeMatcher.ts          ← Engine de snapping de ônibus sobre a rota KML
│   ├── stopsManager.ts          ← Carrega e calcula pontos de parada
│   ├── etaManager.ts            ← Calcula ETA (tempo estimado de chegada)
│   ├── schedules.ts             ← Horários de operação por linha
│   ├── components/
│   │   ├── AppHeader.tsx        ← Cabeçalho reutilizável com botão de voltar/menu
│   │   ├── HomeScreen.tsx       ← Tela inicial — escolha entre rastrear ou ver instituições
│   │   ├── MapComponent.tsx     ← Mapa principal com marcadores de ônibus e paradas
│   │   ├── SearchPanel.tsx      ← Painel de busca e listagem de linhas
│   │   ├── SlidingMarker.tsx    ← Marcador animado que desliza suavemente no mapa
│   │   ├── SplashScreen.tsx     ← Tela de carregamento inicial
│   │   ├── MenuDrawer.tsx       ← Gaveta lateral com opções de tutorial e navegação
│   │   ├── TutorialOverlay.tsx  ← Sistema de tutorial passo a passo
│   │   └── InstituicoesScreen.tsx ← Tela de busca e detalhe de instituições municipais
│
├── unify_data.py                ← Script Python para gerar `public/instituicoes.json`
├── vite.config.ts               ← Configuração do Vite (base: /tarifazero/, proxy para /cbt/)
└── package.json
```

---

## 🚦 Fluxo Principal da Aplicação

```
                        [ HomeScreen ]
                       /             \
      [ Tarifa Zero (Mapa) ]    [ Ouvidoria Orienta ]
             |                         |
   Polling a cada 4s           Busca em instituicoes.json
   GET /cbt/api/fast-positions        |
             |                 Exibe cards com filtro,
   Posições processadas        busca por nome/bairro
   pelo SlidingMarker e        e detalhes no modal
   routeMatcher para snapping
```

### Sequência de inicialização (tela de mapa)
1. **Splash** exibido por mínimo 2 segundos.
2. `loadAllRoutes()` → baixa todos os KMLs das 20 linhas via `/cbt/kml-exports/`.
3. `fetchPositions()` → primeira chamada a `/cbt/api/fast-positions`.
4. `getUserLocation()` requisita geolocalização do usuário.
5. Splash some → mapa exibido com ônibus em movimento.
6. Polling de 4 em 4 segundos mantém posições atualizadas.

---

## 🗺️ As 20 Linhas Tarifa Zero

| ID | Linha | ID | Linha |
|----|-------|----|-------|
| DC-TZ01 | Capivari x Figueira | DC-TZ11 | Xerém x Tinguá |
| DC-TZ02 | Aviário x Xerém | DC-TZ12 | Saracuruna x Jardim Ana Clara |
| DC-TZ03 | Parque Eldorado x Xerém | DC-TZ13 | Jardim Primavera x Hosp. Adão Pereira Nunes |
| DC-TZ04 | Vila Operária x Hosp. Daniel Lipp | DC-TZ14 | Saraiva x Jardim Primavera |
| DC-TZ05 | Vila Maria Helena x Parque Equitativa | DC-TZ15 | Pilar x Cidade dos Meninos |
| DC-TZ06 | Jardim Primavera x Bom Retiro | DC-TZ16 | Parque das Missões x Hosp. Moacyr do Carmo |
| DC-TZ07 | Jardim Gramacho x Hosp. Moacyr do Carmo | DC-TZ17 | Vila do Sase x Garrão |
| DC-TZ08 | Jardim Anhangá x Santa Cruz da Serra | DC-TZ18 | Pilar x Cangulo (via Reduc) |
| DC-TZ09 | Vila Canaan x Santa Cruz da Serra | DC-TZ19 | Santa Cruz da Serra x Taquara |
| DC-TZ10 | Santo Antônio x Xerém | DC-TZ20 | Parque Beira Mar x Estação Duque de Caxias |

Os KMLs de rota são mapeados em `src/constants.ts` (ex: `'DC-TZ01': 'DC_598.kml'`).

---

## 🧠 Engine de Snapping (`routeMatcher.ts`)

O módulo mais sofisticado do projeto. Garante que o marcador do ônibus "cole" na rota correta no mapa, em vez de aparecer fora da via.

### Como funciona
1. **`loadAllRoutes()`** — Baixa cada KML e extrai coordenadas. Armazena duas versões:
   - `routeCache` — feature Turf (para detecção de linha)
   - `rawRouteCache` — array `[lat, lng][]` (para snapping matemático)

2. **`getProjectedPosition(lat, lng, lineId, lastIndex)`** — Dado um ponto GPS bruto, encontra o ponto mais próximo **na rota** usando:
   - Janela local de busca (±150 pontos à frente, 20 atrás) para suavidade
   - Fallback global se o ônibus parecer ter "teletransportado"
   - Desambiguação por distância e sequência de índice

3. **`getSnappedPath(startIdx, endIdx, lineId)`** — Retorna o caminho real na rota entre dois índices (usado para animação de deslizamento no `SlidingMarker`).

4. **`getRouteDistance(startIdx, endIdx, lineId)`** — Calcula a distância em metros entre dois índices na rota (usado pelo `etaManager`).

5. **`matchBusToRoute(lat, lng)`** — Identifica qual linha uma posição pertence quando o campo `LineNumber` da API é desconhecido (usa Turf `pointToLineDistance`).

---

## 🏫 Tela de Instituições (`InstituicoesScreen.tsx`)

Exibe e filtra as instituições municipais de Duque de Caxias, carregando `public/instituicoes.json`.

### Categorias
- **Secretarias** (órgãos da administração municipal)
- **Unidades de Saúde** (postos, UPAs, hospitais)
- **Escolas** (escolas municipais)
- **Assistência Social** (CRAS, CREAS e similares)

### Geração dos dados — `unify_data.py`
Script Python que lê quatro arquivos JSON do banco (`banco/ULTIMATE_*.json`) e os mescla em `public/instituicoes.json`. Corrige valores `NaN` inválidos que quebrariam o parse do JavaScript. **Deve ser rodado no servidor Linux** onde os dados ficam atualizados:
```bash
python3 unify_data.py
```

> ⚠️ Os caminhos do script apontam para `/home/tesch/ouvidoria/TZ-APP/`. Ajuste se o caminho mudar no servidor.

---

## ⚙️ Configuração (`vite.config.ts`)

```ts
base: '/tarifazero/'      // URL base da aplicação
```

> **IMPORTANTE:** Como a `base` não é `/`, **todos os assets do `public/` são servidos sob `/tarifazero/`**. Por isso o fetch de `instituicoes.json` usa `import.meta.env.BASE_URL`:
> ```ts
> fetch(`${import.meta.env.BASE_URL}instituicoes.json`)
> // → resolve para /tarifazero/instituicoes.json ✅
> // fetch('/instituicoes.json') → 404 ❌
> ```

### Proxy de desenvolvimento
| Caminho | Destino |
|---------|---------|
| `/cbt/api/*` | `http://localhost:3004/api/*` |
| `/cbt/kml-exports/*` | `http://localhost:3004/kml-exports/*` |

---

## 🚀 Como Rodar

### Desenvolvimento
```bash
npm install
npm run dev
# Acesse: http://localhost:5173/tarifazero/
```

> O backend `CBTMonitoramento` deve estar rodando em paralelo (`npm start` no diretório `CBTMonitoramento/`).

### Produção (Ubuntu + PM2)
```bash
npm run build          # Gera /dist
# PM2 serve com: serve -s dist -l 3005
# Nginx roteia /tarifazero/ → http://localhost:3005
```

---

## 🔌 Dependências do Backend (CBTMonitoramento)

O TZ-APP frontend depende do backend `CBTMonitoramento` (porta 3004) para:

| Endpoint | Função |
|----------|--------|
| `GET /api/fast-positions` | Lista de todos os ônibus com posição e linha |
| `GET /kml-exports/{arquivo}.kml` | Arquivos KML de cada rota |
| `GET /api/stops/:lineId` | Pontos de parada de uma linha |

---

## 📌 Observações e Notas Técnicas

- **Logs `[MOVE]`** no terminal do backend são informativos — mostram o atraso do GPS de cada ônibus (normal até ~60s).
- **Erros `API Server Error (500)`** são da API externa `systemsatx.com.br` — o backend trata e tenta novamente automaticamente.
- O **`SlidingMarker`** interpola a posição do ícone de ônibus suavemente ao longo do segmento de rota para evitar "teletransporte" visual.
- O sistema de **ETA** calcula o tempo estimado com base na distância restante na rota e na velocidade média histórica dos ônibus.
