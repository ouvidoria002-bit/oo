require('dotenv').config();
const axios = require('axios');

const CONFIG = {
    headers: {
        'x-colab-application-id': process.env.COLAB_APP_ID,
        'x-colab-rest-api-key': process.env.COLAB_API_KEY,
        'x-colab-admin-user-auth-ticket': process.env.COLAB_AUTH_TICKET
    }
};

const ENDPOINTS = {
    sectors: 'https://api.colabapp.com/v2/integration/sectors',
    uacs: 'https://api.colabapp.com/v2/integration/uacs',
    categories: 'https://api.colabapp.com/v2/integration/categories'
};

async function fetchIDs() {
    console.log('🚀 Consultando IDs de Secretarias e Ouvidorias na API...\n');
    
    for (const [name, url] of Object.entries(ENDPOINTS)) {
        try {
            console.log(`📡 Consultando ${name}...`);
            const response = await axios.get(url, { headers: CONFIG.headers });
            const data = response.data;

            console.log(`\n📂 --- ${name.toUpperCase()} ---`);
            if (Array.isArray(data)) {
                data.forEach(item => {
                    console.log(`ID: ${item.id} | Nome: ${item.name || item.title || item.full_name || 'N/A'}`);
                });
            } else if (data.data && Array.isArray(data.data)) {
                data.data.forEach(item => {
                    console.log(`ID: ${item.id} | Nome: ${item.name || item.title || 'N/A'}`);
                });
            } else {
                console.log('Estrutura de dados não reconhecida:', JSON.stringify(data).substring(0, 200));
            }
            console.log('\n');
        } catch (err) {
            console.error(`❌ Erro em ${name}: ${err.response?.status || err.message}`);
        }
    }
}

fetchIDs();
