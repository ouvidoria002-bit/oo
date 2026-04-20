const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDateProperly() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('ColabOuvidoria');
        const collection = db.collection('zeladoria');

        const start2025 = new Date('2025-01-01T00:00:00Z');
        const end2025 = new Date('2025-12-31T23:59:59Z');

        const start2026 = new Date('2026-01-01T00:00:00Z');
        const end2026 = new Date('2026-12-31T23:59:59Z');

        const query2025 = {
            citizen: { $regex: 'Luziana', $options: 'i' },
            dataCriacaoIso: { $gte: start2025, $lte: end2025 }
        };

        const query2026 = {
            citizen: { $regex: 'Luziana', $options: 'i' },
            dataCriacaoIso: { $gte: start2026, $lte: end2026 }
        };

        // Also try string versions just in case
        const query2025Str = {
            citizen: { $regex: 'Luziana', $options: 'i' },
            dataCriacaoIso: { $regex: '^2025' }
        };

        const count2025Obj = await collection.countDocuments(query2025);
        const count2026Obj = await collection.countDocuments(query2026);
        const count2025Str = await collection.countDocuments(query2025Str);

        console.log(`2025 (Date Object): ${count2025Obj}`);
        console.log(`2026 (Date Object): ${count2026Obj}`);
        console.log(`2025 (String Regex): ${count2025Str}`);

        if (count2025Obj > 0 || count2025Str > 0) {
             const sample = await collection.findOne(count2025Obj > 0 ? query2025 : query2025Str);
             console.log('Exemplo 2025:', JSON.stringify(sample, null, 2));
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

checkDateProperly();
