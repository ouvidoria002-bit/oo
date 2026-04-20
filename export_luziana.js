const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

async function exportLuzianaData() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const dbName = process.env.DB_NAME || 'ColabOuvidoria';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('zeladoria');

        const searchTerm = 'Luziana';
        const query = {
            $or: [
                { citizen: { $regex: searchTerm, $options: 'i' } },
                { "citizen.name": { $regex: searchTerm, $options: 'i' } }
            ]
        };

        const demands = await collection.find(query).sort({ dataCriacaoIso: 1 }).toArray();
        
        console.log(`Encontradas ${demands.length} demandas.`);

        const report = demands.map(d => ({
            id: d.id,
            data: d.dataCriacaoIso,
            status: d.statusDemanda,
            assunto: d.assunto || d.tema_especifico,
            secretaria: d.secretaria,
            bairro: d.bairro,
            descricao: d.description?.text || d.description || 'N/A'
        }));

        fs.writeFileSync('demandas_luziana.json', JSON.stringify(report, null, 2));
        console.log('Dados exportados para demandas_luziana.json');

        // Gerar um resumo estatístico
        const estatisticas = {
            total: demands.length,
            por_status: {},
            por_secretaria: {},
            por_bairro: {}
        };

        demands.forEach(d => {
            estatisticas.por_status[d.statusDemanda] = (estatisticas.por_status[d.statusDemanda] || 0) + 1;
            estatisticas.por_secretaria[d.secretaria] = (estatisticas.por_secretaria[d.secretaria] || 0) + 1;
            estatisticas.por_bairro[d.bairro] = (estatisticas.por_bairro[d.bairro] || 0) + 1;
        });

        console.log('\nResumo Estatístico:');
        console.log(JSON.stringify(estatisticas, null, 2));

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

exportLuzianaData();
