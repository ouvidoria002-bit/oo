require('dotenv').config();
const axios = require('axios');

const AUTH_CONFIG = {
    username: process.env.SYSTEMSAT_USERNAME || 'caxias@integracao.com.br',
    password: process.env.SYSTEMSAT_PASSWORD || '123456',
    clientCode: process.env.SYSTEMSAT_CLIENT_CODE || '0151',
    hashAuth: process.env.SYSTEMSAT_HASH_AUTH || 'F77D2A62-8338-47E0-923B-D56947E17E1F'
};

async function inspect() {
    console.log('--- Fazendo login na Systemsat para inspeção ---');
    
    const params = new URLSearchParams({
        Username: AUTH_CONFIG.username,
        Password: AUTH_CONFIG.password,
        ClientIntegrationCodeBus: AUTH_CONFIG.clientCode,
        HashAuth: AUTH_CONFIG.hashAuth
    });

    try {
        const loginRes = await axios.post(`https://integration.systemsatx.com.br/Login?${params.toString()}`);
        const token = loginRes.data.AccessToken;
        
        console.log('--- Capturando JSON bruto de um veículo ---');
        const response = await axios.post('https://integration.systemsatx.com.br/GlobalBus/LastPosition/List',
            [{ "PropertyName": "VehicleDescription", "Condition": "StartsWith", "Value": "DC" }],
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (Array.isArray(response.data) && response.data.length > 0) {
            const firstBus = response.data[0];
            console.log('\n--- CAMPOS DISPONÍVEIS NA API (BRUTO) ---');
            console.log(JSON.stringify(firstBus, null, 2));
            
            console.log('\n--- RESUMO DE ATRIBUTOS EXTRAS ---');
            Object.keys(firstBus).forEach(key => {
                console.log(`- ${key}: ${typeof firstBus[key]}`);
            });
        } else {
            console.log('Nenhum dado encontrado ou formato inesperado.');
            console.log('Response body:', response.data);
        }
    } catch (e) {
        console.error('Erro na inspeção:', e.message);
    }
}

inspect();
