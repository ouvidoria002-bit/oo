const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkLuzianaDetails() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('ColabOuvidoria');
        const collection = db.collection('zeladoria');

        const demand = await collection.findOne({ citizen: /Luziana/i });
        console.log('Detalhes da Luziana encontrados:', JSON.stringify(demand.citizen, null, 2));

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

checkLuzianaDetails();
