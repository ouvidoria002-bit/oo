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
    'https://api.colabapp.com/v2/integration/categories',
    'https://api.colabapp.com/v2/integration/sectors',
    'https://api.colabapp.com/v2/integration/uacs',
    'https://api.colabapp.com/v2/integration/status',
    'https://api.colabapp.com/v2/integration/users'
];

async function explore() {
    console.log('🔍 Explorando endpoints adicionais...');
    
    for (const url of ENDPOINTS) {
        try {
            const response = await axios.get(url, { headers: CONFIG.headers });
            console.log(`\n✅ Sucesso em ${url}!`);
            const data = response.data;
            console.log('📄 Dados:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
        } catch (err) {
            console.error(`\n❌ Falha em ${url}:`, err.response?.status || err.message);
        }
    }
}

explore();
