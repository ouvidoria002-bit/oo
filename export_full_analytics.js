const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

async function exportFullLuziana() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('ColabOuvidoria');
        const collection = db.collection('zeladoria');

        const query = { citizen: { $regex: 'Luziana', $options: 'i' } };
        const demands = await collection.find(query).sort({ dataCriacaoIso: 1 }).toArray();
        
        const processed = demands.map(d => ({
            id: d.id,
            created: d.dataCriacaoIso,
            finished: d.dataConclusaoIso,
            status: d.statusDemanda,
            category: d.assunto || d.tema_especifico || 'Outros',
            bairro: d.bairro,
            secretaria: d.secretaria
        }));

        fs.writeFileSync('luziana_analytics_source.json', JSON.stringify(processed, null, 2));
        console.log(`Exportados ${processed.length} registros para análise.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

exportFullLuziana();
