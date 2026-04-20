const { MongoClient } = require('mongodb');
require('dotenv').config();

async function verify() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(process.env.COLLECTION_NAME || 'zeladoria');
    
    const count = await collection.countDocuments();
    const sample = await collection.findOne({ tema_especifico: { $exists: true } });
    
    console.log(`Coleção: ${collection.collectionName}`);
    console.log(`Total de documentos: ${count}`);
    if (sample) {
        console.log('Amostra de documento encontrado com tema_especifico:');
        console.log(JSON.stringify({
            id: sample.id,
            category_id: sample.category_id,
            tema_especifico: sample.tema_especifico,
            created_at: sample.created_at
        }, null, 2));
    } else {
        console.log('Nenhum documento com tema_especifico encontrado ainda.');
    }
    
    await client.close();
}

verify();
