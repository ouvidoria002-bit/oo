require('dotenv').config();
const axios = require('axios');

const CONFIG = {
    headers: {
        'x-colab-application-id': process.env.COLAB_APP_ID,
        'x-colab-rest-api-key': process.env.COLAB_API_KEY,
        'x-colab-admin-user-auth-ticket': process.env.COLAB_AUTH_TICKET
    }
};

const ENDPOINTS = [
    'https://api.colabapp.com/v2/integration/posts',
    'https://api.colabapp.com/v2/integration/categories',
    'https://api.colabapp.com/v2/integration/branches'
];

async function explore() {
    console.log('🔍 Explorando API Colab...');
    
    for (const url of ENDPOINTS) {
        console.log(`\n📡 Testando: ${url}`);
        try {
            const response = await axios.get(url, { headers: CONFIG.headers });
            console.log(`✅ Sucesso! Recebidos ${Array.isArray(response.data) ? response.data.length : '1'} itens.`);
            
            // Mostra o primeiro item como exemplo
            const sample = Array.isArray(response.data) ? response.data[0] : response.data;
            console.log('📄 Amostra de dados:', JSON.stringify(sample, null, 2).substring(0, 500) + '...');
        } catch (err) {
            console.error(`❌ Erro em ${url}:`, err.response?.status || err.message);
        }
    }
}

explore();
