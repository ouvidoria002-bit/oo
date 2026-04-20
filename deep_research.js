const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

const CONFIG = {
    api: {
        baseUrl: process.env.API_BASE_URL || 'https://api.colabapp.com/v2/integration/posts',
        headers: {
            'x-colab-application-id': process.env.COLAB_APP_ID,
            'x-colab-rest-api-key': process.env.COLAB_API_KEY,
            'x-colab-admin-user-auth-ticket': process.env.COLAB_AUTH_TICKET
        }
    }
};

async function deepResearch() {
    console.log('🔍 Iniciando Pesquisa Profunda de Protocolo...');
    
    // 1. Pegar um exemplo rico da API
    console.log('📡 Buscando exemplo na API...');
    try {
        const response = await axios.get(CONFIG.api.baseUrl, { 
            headers: CONFIG.api.headers,
            params: { limit: 1 } 
        });
        const apiSample = response.data[0];
        console.log('\n📄 ESTRUTURA API (Completa):');
        console.log(JSON.stringify(apiSample, null, 2));
    } catch (err) {
        console.error('❌ Erro API:', err.message);
    }

    // 2. Extrair Mapeamento de Secretarias da coleção 'posts'
    console.log('\n📂 Extraindo mapeamento da coleção posts...');
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        
        const mapping = await db.collection('posts').aggregate([
            { $match: { secretaria: { $exists: true }, 'branch.name': { $exists: true } } },
            { $group: { _id: '$branch.name', secretaria: { $first: '$secretaria' } } }
        ]).toArray();

        console.log('\n🗺️ MAPEAMENTO ENCONTRADO (Branch -> Secretaria):');
        const secretariaMap = {};
        mapping.forEach(m => {
            secretariaMap[m._id] = m.secretaria;
            console.log(`- ${m._id} => ${m.secretaria}`);
        });

    } catch (err) {
        console.error('❌ Erro DB:', err.message);
    } finally {
        await client.close();
    }
}

deepResearch();
