const { MongoClient } = require('mongodb');
require('dotenv').config();

async function findMinDate() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('ColabOuvidoria');
        const collection = db.collection('zeladoria');

        const first = await collection.find().sort({dataCriacaoIso: 1}).limit(1).toArray();
        const last = await collection.find().sort({dataCriacaoIso: -1}).limit(1).toArray();

        console.log('Menor data encontrada:', first[0]?.dataCriacaoIso);
        console.log('Maior data encontrada:', last[0]?.dataCriacaoIso);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

findMinDate();
