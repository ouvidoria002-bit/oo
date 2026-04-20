const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

async function exportLuzianaData() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const databases = ['ColabOuvidoria', 'ouvidoria_v2'];
        let allDemands = [];

        for (const dbName of databases) {
            const db = client.db(dbName);
            const collections = ['zeladoria', 'posts', 'manifestacoes']; // Common names
            
            for (const colName of collections) {
                const collection = db.collection(colName);
                // Check if collection exists
                const colInfo = await db.listCollections({ name: colName }).next();
                if (!colInfo) continue;

                console.log(`Pesquisando em ${dbName}.${colName}...`);

                const searchTerm = 'Luziana';
                const query = {
                    $or: [
                        { citizen: { $regex: searchTerm, $options: 'i' } },
                        { "citizen.name": { $regex: searchTerm, $options: 'i' } },
                        { description: { $regex: searchTerm, $options: 'i' } },
                        { "description.text": { $regex: searchTerm, $options: 'i' } }
                    ]
                };

                const demands = await collection.find(query).toArray();
                console.log(`Encontradas ${demands.length} demandas em ${dbName}.${colName}.`);
                
                demands.forEach(d => {
                    allDemands.push({
                        source_db: dbName,
                        source_col: colName,
                        id: d.id || d._id,
                        data: d.dataCriacaoIso || d.created_at || d.data,
                        status: d.statusDemanda || d.status,
                        assunto: d.assunto || d.tema_especifico || d.category || d.title,
                        secretaria: d.secretaria || d.branch?.name,
                        bairro: d.bairro || d.address?.district,
                        descricao: d.description?.text || d.description || d.body || 'N/A'
                    });
                });
            }
        }

        // Ordenar por data
        allDemands.sort((a, b) => new Date(a.data) - new Date(b.data));

        fs.writeFileSync('demandas_luziana_completo.json', JSON.stringify(allDemands, null, 2));
        console.log(`\nTotal consolidado: ${allDemands.length} demandas.`);
        console.log('Dados exportados para demandas_luziana_completo.json');

        // Resumo
        const resumo = {
            total: allDemands.length,
            periodo: {
                inicio: allDemands[0]?.data,
                fim: allDemands[allDemands.length - 1]?.data
            },
            por_status: {},
            por_secretaria: {}
        };

        allDemands.forEach(d => {
            resumo.por_status[d.status] = (resumo.por_status[d.status] || 0) + 1;
            const sec = d.secretaria || 'N/A';
            resumo.por_secretaria[sec] = (resumo.por_secretaria[sec] || 0) + 1;
        });

        console.log('\nResumo Estatístico Consolidado:');
        console.log(JSON.stringify(resumo, null, 2));

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

exportLuzianaData();
