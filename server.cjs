require('dotenv').config();
const express = require('express');
const compression = require('compression');
const path = require('path');
const axios = require('axios');
const fs = require('fs-extra');
const cors = require('cors');

const app = express();
app.use(compression({
    filter: (req, res) => {
        if (req.path === '/api/events') return false;
        return compression.filter(req, res);
    }
}));
app.use(cors());

const PORT = process.env.PORT || 3004;

// Configuration (Systemsat Credentials)
const AUTH_CONFIG = {
    username: process.env.SYSTEMSAT_USERNAME || 'caxias@integracao.com.br',
    password: process.env.SYSTEMSAT_PASSWORD || '123456',
    clientCode: process.env.SYSTEMSAT_CLIENT_CODE || '0151',
    hashAuth: process.env.SYSTEMSAT_HASH_AUTH || 'F77D2A62-8338-47E0-923B-D56947E17E1F'
};

const KML_DIR = path.join(__dirname, 'public', 'kml-exports');
const STOPS_DIR = path.join(__dirname, 'public', 'stops');

let accessToken = null;

async function login() {
    const params = new URLSearchParams({
        Username: AUTH_CONFIG.username,
        Password: AUTH_CONFIG.password,
        ClientIntegrationCodeBus: AUTH_CONFIG.clientCode,
        HashAuth: AUTH_CONFIG.hashAuth
    });

    try {
        const response = await axios.post(`https://integration.systemsatx.com.br/Login?${params.toString()}`);
        accessToken = response.data.AccessToken;
        console.log('[Server] Logged In to Systemsat');
    } catch (error) {
        console.error('[Server] Login Error:', error.message);
    }
}

// Snapping & Storage Logic
const routeMatcherModule = require('./routeMatcherBackend.cjs');
const { loadRoutes, matchBusToRoute } = routeMatcherModule;

const storage = require('./storage.cjs');
const { ensureStoragePaths, saveTrajectory } = storage;

const sseClients = new Set();
const TIMEZONE_OFFSET_MS = 3 * 60 * 60 * 1000;
const vehicleFieldState = {}; 
const vehicleVersion = {};
let globalVehicleCache = [];
const stoppedSince = {};
const lastKnownValidPos = {}; // vehicleId -> { Latitude, Longitude, timestamp }

function isValidPoint(vehicleId, lat, lng) {
    const prev = lastKnownValidPos[vehicleId];
    const now = Date.now();
    if (!prev) {
        lastKnownValidPos[vehicleId] = { lat, lng, timestamp: now };
        return true;
    }

    // Calcula distância simples (aproximada para performance)
    const dLat = lat - prev.lat;
    const dLng = lng - prev.lng;
    const distDegrees = Math.sqrt(dLat * dLat + dLng * dLng);
    
    // 0.015 graus é aproximadamente 1.6km. 
    // Em 3 segundos (tempo de polling), 80km/h percorre ~66 metros (0.0006 graus).
    // Usaremos um limite generoso de 0.005 (~500m) para filtrar apenas saltos absurdos.
    const MAX_JUMP = 0.005; 

    if (distDegrees > MAX_JUMP) {
        console.warn(`[Filter] Teleport detected for ${vehicleId}. Jump: ${distDegrees.toFixed(5)}`);
        return false;
    }

    lastKnownValidPos[vehicleId] = { lat, lng, timestamp: now };
    return true;
}

function getFixedTime(dateStr) {
    if (!dateStr) return Date.now();
    let gpsTime = new Date(dateStr).getTime();
    const now = Date.now();
    if (Math.abs(now - gpsTime) > 2.5 * 60 * 60 * 1000 && Math.abs(now - gpsTime) < 3.5 * 60 * 60 * 1000) {
        gpsTime += TIMEZONE_OFFSET_MS;
    }
    return gpsTime;
}

function computeStatus(id, speed, dateStr) {
    if (!dateStr) return 'SEM_SINAL';
    const now = Date.now();
    const gpsTime = getFixedTime(dateStr);
    const gpsAge = (now - gpsTime) / 1000;

    if (gpsAge > 180) return 'SEM_SINAL';

    if (speed < 2) {
        if (!stoppedSince[id]) stoppedSince[id] = now;
        if ((now - stoppedSince[id]) > 3 * 60 * 1000) return 'PARADO';
    } else {
        delete stoppedSince[id];
    }
    return 'ANDANDO';
}

const trajectoryBuffer = new Map(); // vehicleId -> { points: [], dirty: boolean }
const TRAJ_DIR = path.join(__dirname, 'data', 'trajectories');

function enrich(v) {
    const rawDate = v.GPSDate || v.EventDate || v.UpdateDate;
    const fixedIsoDate = new Date(getFixedTime(rawDate)).toISOString();
    const status = computeStatus(v.VehicleDescription, v.Speed || 0, rawDate);
    const prev = vehicleFieldState[v.VehicleDescription];
    
    // Pass vehicleId for caching
    const line = matchBusToRoute(v.Latitude, v.Longitude, v.VehicleDescription, v.LineNumber, prev ? prev.LineNumber : null);
    
    const enriched = { 
        ...v, 
        OriginalLine: v.LineNumber, 
        LineNumber: line, 
        status, 
        GPSDate: fixedIsoDate,
        LicensePlate: v.LicensePlate,
        EventName: v.EventName
    };

    // Buffer point for trajectory
    savePoint(v.VehicleDescription, enriched);

    return enriched;
}

function savePoint(vehicleId, point) {
    if (!trajectoryBuffer.has(vehicleId)) {
        trajectoryBuffer.set(vehicleId, { points: [], dirty: false });
    }
    const entry = trajectoryBuffer.get(vehicleId);
    
    // Logic from CBT original: limit points per vehicle in memory?
    // For now, just accumulation.
    entry.points.push(point);
    entry.dirty = true;
}

async function flushToDisk() {
    console.log('[Server] Flushing buffers to disk...');
    for (const [vehicleId, entry] of trajectoryBuffer.entries()) {
        if (!entry.dirty) continue;
        try {
            await saveTrajectory(vehicleId, entry.points);
            entry.dirty = false;
        } catch (err) {
            console.error(`[Server] Flush failed for ${vehicleId}:`, err);
        }
    }
}

async function updateTrajectories() {
    if (!accessToken) {
        await login();
        if (!accessToken) return;
    }

    try {
        const response = await axios.post('https://integration.systemsatx.com.br/GlobalBus/LastPosition/List',
            [{ "PropertyName": "VehicleDescription", "Condition": "StartsWith", "Value": "DC" }],
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        const vehicles = response.data;
        if (!Array.isArray(vehicles)) return;

        // Apply jump filter
        const validVehicles = vehicles.filter(v => isValidPoint(v.VehicleDescription, v.Latitude, v.Longitude));
        if (validVehicles.length === 0 && vehicles.length > 0) {
            // Se todos foram filtrados por pulo absurdo, não atualizamos o cache global 
            // mas mantemos o servidor rodando.
            return;
        }

        globalVehicleCache = validVehicles;

        // Broadcast to SSE
        if (sseClients.size > 0) {
            const deltas = [];
            validVehicles.forEach(v => {
                const id = v.VehicleDescription;
                const enriched = enrich(v);
                const prev = vehicleFieldState[id] || {};

                let changed = false;
                if (Math.abs((enriched.Latitude || 0) - (prev.Latitude || 0)) > 0.000001) changed = true;
                if (Math.abs((enriched.Longitude || 0) - (prev.Longitude || 0)) > 0.000001) changed = true;
                if (enriched.LineNumber !== prev.LineNumber) changed = true;
                if (enriched.status !== prev.status) changed = true;

                if (changed) {
                    vehicleVersion[id] = (vehicleVersion[id] || 0) + 1;
                    const diff = { ...enriched, v: vehicleVersion[id] };
                    vehicleFieldState[id] = enriched;
                    deltas.push(diff);
                }
            });

            if (deltas.length > 0) {
                const payload = `data: ${JSON.stringify({ type: 'delta', vehicles: deltas })}\n\n`;
                sseClients.forEach(client => {
                    try { client.write(payload); } catch (e) { sseClients.delete(client); }
                });
            }
        }
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 500)) {
            accessToken = null;
        }
    }
}

// API Endpoints
app.get('/api/fast-positions', (req, res) => {
    res.json(globalVehicleCache.map(enrich));
});

app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    sseClients.add(res);
    
    // First snapshot
    const payload = `data: ${JSON.stringify({ type: 'snapshot', vehicles: globalVehicleCache.map(enrich) })}\n\n`;
    res.write(payload);

    const heartbeat = setInterval(() => {
        try { res.write(': heartbeat\n\n'); } catch (e) { clearInterval(heartbeat); }
    }, 20000);

    req.on('close', () => {
        sseClients.delete(res);
        clearInterval(heartbeat);
    });
});

app.get('/api/stops/:lineId', async (req, res) => {
    try {
        const safeId = req.params.lineId.replace(/[^a-z0-9]/gi, '_');
        const filePath = path.join(STOPS_DIR, `${safeId}.json`);
        if (await fs.pathExists(filePath)) {
            res.json(await fs.readJson(filePath));
        } else {
            res.json(null);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Serve Static KMLs
app.use('/kml-exports', express.static(KML_DIR));

// Serve Frontend in Production
const DIST_PATH = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_PATH)) {
    app.use('/', express.static(DIST_PATH));
    app.get('*', (req, res) => {
        // Prevent API and KML routes from falling back to index.html
        if (req.path.startsWith('/api') || req.path.startsWith('/kml-exports')) {
            return res.status(404).send('Not Found');
        }
        res.sendFile(path.join(DIST_PATH, 'index.html'));
    });
}

// Start
Promise.all([
    loadRoutes(KML_DIR),
    ensureStoragePaths()
]).then(() => {
    setInterval(updateTrajectories, 2000);
    setInterval(flushToDisk, 60000);

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Unified Server] Running at http://localhost:${PORT}`);
        updateTrajectories();
    });
});

async function gracefulShutdown() {
    console.log('[Server] SIGINT/SIGTERM received. Flushing buffers before exit...');
    await flushToDisk().catch(console.error);
    console.log('[Server] Graceful shutdown complete.');
    process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
