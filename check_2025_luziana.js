const { MongoClient } = require('mongodb');
require('dotenv').config();

async function check2025() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const databases = ['ColabOuvidoria', 'ouvidoria_v2'];
        let total2025 = 0;

        for (const dbName of databases) {
            const db = client.db(dbName);
            const collections = ['zeladoria', 'posts', 'manifestacoes'];
            
            for (const colName of collections) {
                const collection = db.collection(colName);
                const colInfo = await db.listCollections({ name: colName }).next();
                if (!colInfo) continue;

                const query = {
                    $and: [
                        { $or: [
                            { citizen: { $regex: 'Luziana', $options: 'i' } },
                            { "citizen.name": { $regex: 'Luziana', $options: 'i' } }
                        ]},
                        { $or: [
                            { dataCriacaoIso: { $regex: '^2025' } },
                            { created_at: { $regex: '^2025' } },
                            { data: { $regex: '^2025' } }
                        ]}
                    ]
                };

                const count = await collection.countDocuments(query);
                if (count > 0) {
                    console.log(`Encontradas ${count} demandas de 2025 em ${dbName}.${colName}`);
                    total2025 += count;
                    
                    const samples = await collection.find(query).limit(3).toArray();
                    samples.forEach(s => {
                         console.log(` - ID: ${s.id || s._id} | Data: ${s.dataCriacaoIso || s.created_at || s.data}`);
                    });
                }
            }
        }

        console.log(`\nTotal de demandas em 2025: ${total2025}`);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

check2025();
