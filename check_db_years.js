const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkYears() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('ColabOuvidoria');
        const collection = db.collection('zeladoria');

        const pipeline = [
            {
                $project: {
                    year: { $substr: ["$dataCriacaoIso", 0, 4] }
                }
            },
            {
                $group: {
                    _id: "$year",
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const results = await collection.aggregate(pipeline).toArray();
        console.log('Anos encontrados na coleção zeladoria:');
        results.forEach(r => {
            console.log(`${r._id || 'N/A'}: ${r.count} documentos`);
        });

        // Procurar Luziana em 2025 sem o filtro de year se houver anos anteriores
        const has2025 = results.some(r => r._id === '2025');
        if (has2025) {
             const count2025 = await collection.countDocuments({
                 citizen: { $regex: 'Luziana', $options: 'i' },
                 dataCriacaoIso: { $regex: '^2025' }
             });
             console.log(`\nDemandas da Luziana em 2025: ${count2025}`);
        } else {
            console.log('\nNão existem documentos de 2025 nesta coleção.');
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

checkYears();
