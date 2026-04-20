const axios = require('axios');
require('dotenv').config();

const CONFIG = {
    api: {
        baseUrl: process.env.API_BASE_URL,
        headers: {
            'x-colab-application-id': process.env.COLAB_APP_ID,
            'x-colab-rest-api-key': process.env.COLAB_API_KEY,
            'x-colab-admin-user-auth-ticket': process.env.COLAB_AUTH_TICKET
        }
    }
};

function formatApiDate(date) {
    return date.toISOString().replace('T', ' ').replace('Z', '').padEnd(24, '0');
}

async function fetchSamples() {
    const dates = [
        ['2026-04-05T00:00:00Z', '2026-04-05T23:59:59Z'],
        ['2026-04-04T00:00:00Z', '2026-04-04T23:59:59Z'],
        ['2026-04-06T00:00:00Z', '2026-04-06T23:59:59Z'],
        ['2026-04-03T00:00:00Z', '2026-04-03T23:59:59Z']
    ];

    let allSamples = [];

    for (const [start, end] of dates) {
        if (allSamples.length >= 4) break;
        
        const startDate = new Date(start);
        const endDate = new Date(end);

        try {
            console.log(`Buscando dados de ${formatApiDate(startDate)}...`);
            
            const response = await axios.get(CONFIG.api.baseUrl, {
                headers: CONFIG.api.headers,
                params: {
                    start_date: formatApiDate(startDate),
                    end_date: formatApiDate(endDate)
                },
                timeout: 30000
            });

            const items = response.data;
            if (Array.isArray(items)) {
                allSamples = allSamples.concat(items).slice(0, 4);
                console.log(`✅ Encontrados ${items.length} itens.`);
            }

        } catch (err) {
            console.error(`❌ Erro no dia ${start}:`, err.message);
        }
    }

    if (allSamples.length > 0) {
        console.log('\n--- 4 DEMANDAS EM JSON ---');
        console.log(JSON.stringify(allSamples, null, 2));
    } else {
        console.log('ℹ️ Nenhum dado encontrado.');
    }
}

fetchSamples();
