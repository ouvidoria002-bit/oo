require('dotenv').config();
const axios = require('axios');

const AUTH_CONFIG = {
    username: process.env.SYSTEMSAT_USERNAME || 'caxias@integracao.com.br',
    password: process.env.SYSTEMSAT_PASSWORD || '123456',
    clientCode: process.env.SYSTEMSAT_CLIENT_CODE || '0151',
    hashAuth: process.env.SYSTEMSAT_HASH_AUTH || 'F77D2A62-8338-47E0-923B-D56947E17E1F'
};

async function listAllBuses() {
    console.log('--- Fazendo login na Systemsat ---');
    const params = new URLSearchParams({
        Username: AUTH_CONFIG.username,
        Password: AUTH_CONFIG.password,
        ClientIntegrationCodeBus: AUTH_CONFIG.clientCode,
        HashAuth: AUTH_CONFIG.hashAuth
    });

    try {
        const loginRes = await axios.post(`https://integration.systemsatx.com.br/Login?${params.toString()}`);
        const token = loginRes.data.AccessToken;
        
        console.log('--- Coletando lista completa de veículos DC ---');
        const response = await axios.post('https://integration.systemsatx.com.br/GlobalBus/LastPosition/List',
            [{ "PropertyName": "VehicleDescription", "Condition": "StartsWith", "Value": "DC" }],
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (Array.isArray(response.data)) {
            const list = response.data.map(v => ({
                id: v.VehicleDescription,
                placa: v.LicensePlate || 'S/P',
                velocidade: (v.Speed || 0) + ' km/h',
                evento: v.EventName || 'N/A'
            }));
            
            console.log('\n--- LISTA DE ÔNIBUS DETECTADOS (' + list.length + ') ---');
            console.table(list);
        }
    } catch (e) {
        console.error('Erro:', e.message);
    }
}

listAllBuses();
