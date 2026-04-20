
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkRankingBesteiras() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        
        console.log('--- PESQUISA DE TERMOS SUSPEITOS NO BANCO ---\n');
        
        const termos = [
            'Retirada', 
            'Galhos', 
            'Muitos assaltos', 
            'Troca de grelha', 
            'Substituição de tampoes e grelhas'
        ];

        for (const termo of termos) {
            console.log(`\n🔍 Verificando termo: "${termo}"`);
            
            // Busca em posts (Zeladoria)
            const countPosts = await db.collection('posts').countDocuments({
                $or: [
                    { tema_especifico: termo },
                    { secretaria: termo },
                    { "category.name": termo }
                ]
            });

            // Busca em ouvidoria_v2
            const countOuv = await db.collection('ouvidoria_v2').countDocuments({
                $or: [
                    { assunto: termo },
                    { tema: termo },
                    { secretaria: termo }
                ]
            });

            console.log(`   -> Encontrado em 'posts': ${countPosts}`);
            console.log(`   -> Encontrado em 'ouvidoria_v2': ${countOuv}`);

            if (countOuv > 0) {
                const sample = await db.collection('ouvidoria_v2').findOne({
                    $or: [ { assunto: termo }, { tema: termo }, { secretaria: termo } ]
                });
                console.log(`   [AMOSTRA OUVIDORIA] Assunto: ${sample.assunto} | Tema: ${sample.tema} | Secretaria: ${sample.secretaria}`);
            }
        }

        console.log('\n--- DISTRIBUIÇÃO REAL (ÚLTIMOS 30 DIAS - OUVIDORIA_V2) ---');
        const dataCorte = new Date();
        dataCorte.setMonth(dataCorte.getMonth() - 1);
        
        const distOuv = await db.collection('ouvidoria_v2').aggregate([
            { $group: { _id: "$assunto", total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 20 }
        ]).toArray();

        distOuv.forEach((d, i) => {
            console.log(`${String(i+1).padEnd(2)} | ${String(d._id || 'NULO').padEnd(40)} | ${d.total}`);
        });

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await client.close();
    }
}

checkRankingBesteiras();
