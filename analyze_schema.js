require('dotenv').config();
const axios = require('axios');
const qs = require('qs');

const CONFIG = {
    api: {
        baseUrl: process.env.API_BASE_URL || 'https://api.colabapp.com/v2/integration/posts',
        headers: {
            'x-colab-application-id': process.env.COLAB_APP_ID,
            'x-colab-rest-api-key': process.env.COLAB_API_KEY,
            'x-colab-admin-user-auth-ticket': process.env.COLAB_AUTH_TICKET
        }
    },
    delayMs: 4000 // 4 segundos obrigatórios
};

// Formata data para o padrão da API: YYYY-MM-DD HH:mm:ss.SSSS
function formatApiDate(date) {
    return date.toISOString().replace('T', ' ').replace('Z', '').padEnd(24, '0');
}

/**
 * Mapeia recursivamente todas as chaves e tipos de um objeto
 */
function mapSchema(data, prefix = '', schema = {}) {
    if (data === null || data === undefined) return schema;

    if (Array.isArray(data)) {
        const arrayKey = prefix || 'root_array';
        if (!schema[arrayKey]) schema[arrayKey] = new Set();
        schema[arrayKey].add('Array');
        if (data.length > 0) {
            mapSchema(data[0], prefix, schema); // Mapeia o primeiro item do array
        }
        return schema;
    }

    if (typeof data === 'object') {
        Object.keys(data).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const type = typeof data[key];
            
            if (!schema[fullKey]) schema[fullKey] = new Set();
            
            if (data[key] === null) {
                schema[fullKey].add('Null');
            } else if (Array.isArray(data[key])) {
                schema[fullKey].add('Array');
                mapSchema(data[key], fullKey, schema);
            } else if (type === 'object') {
                schema[fullKey].add('Object');
                mapSchema(data[key], fullKey, schema);
            } else {
                schema[fullKey].add(type.charAt(0).toUpperCase() + type.slice(1));
            }
        });
        return schema;
    }

    return schema;
}

async function analyze() {
    console.log('🔍 Iniciando análise exaustiva de schema...');
    console.log(`⏱️ Intervalo obrigatório: ${CONFIG.delayMs / 1000} segundos.`);

    const comprehensiveSchema = {};
    const testPeriods = [
        { start: new Date('2025-06-01'), end: new Date('2025-06-02') },
        { start: new Date('2025-08-15'), end: new Date('2025-08-16') },
        { start: new Date('2026-03-01'), end: new Date('2026-03-02') }
    ];

    for (const period of testPeriods) {
        console.log(`📡 Amostrando período: ${period.start.toISOString()} até ${period.end.toISOString()}`);
        
        try {
            const response = await axios.get(CONFIG.api.baseUrl, {
                headers: CONFIG.api.headers,
                params: {
                    start_date: formatApiDate(period.start),
                    end_date: formatApiDate(period.end)
                },
                paramsSerializer: params => qs.stringify(params, { arrayFormat: 'brackets' })
            });

            const items = response.data;
            if (Array.isArray(items) && items.length > 0) {
                console.log(`✅ Recebidos ${items.length} itens.`);
                items.forEach(item => mapSchema(item, '', comprehensiveSchema));
            } else {
                console.log('ℹ️ Sem dados para este período.');
            }

        } catch (err) {
            console.error('❌ Erro na requisição:', err.response?.status || err.message);
        }

        console.log(`⏳ Aguardando ${CONFIG.delayMs / 1000}s para a próxima requisição...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs));
    }

    console.log('\n📊 SCHEMA COMPLETO ENCONTRADO:');
    const finalResult = {};
    Object.keys(comprehensiveSchema).sort().forEach(key => {
        finalResult[key] = Array.from(comprehensiveSchema[key]);
        console.log(`- ${key}: [${finalResult[key].join(', ')}]`);
    });

    // Salva o schema num arquivo JSON para referência futura
    const fs = require('fs');
    fs.writeFileSync('schema_discovery.json', JSON.stringify(finalResult, null, 2));
    console.log('\n💾 Schema salvo em schema_discovery.json');
}

analyze();
