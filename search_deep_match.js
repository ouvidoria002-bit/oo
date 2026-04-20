const { MongoClient } = require('mongodb');
require('dotenv').config();

async function search() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const databases = ['ColabOuvidoria', 'ouvidoria_v2'];
    const searchTerm = 'eliza';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        
        for (const dbName of databases) {
            const db = client.db(dbName);
            const collections = await db.listCollections().toArray();
            
            for (const collInfo of collections) {
                const collection = db.collection(collInfo.name);
                
                // Busca ampla por "eliza"
                const results = await collection.find({
                    $or: [
                        { description: { $regex: searchTerm, $options: 'i' } },
                        { citizen: { $regex: searchTerm, $options: 'i' } },
                        { "citizen.name": { $regex: searchTerm, $options: 'i' } },
                        { body: { $regex: searchTerm, $options: 'i' } },
                        { text: { $regex: searchTerm, $options: 'i' } },
                        { subject: { $regex: searchTerm, $options: 'i' } },
                        { assunto: { $regex: searchTerm, $options: 'i' } }
                    ]
                }).limit(50).toArray();

                for (const res of results) {
                    const fullText = JSON.stringify(res).toLowerCase();
                    if (fullText.includes('rodrigues')) {
                        console.log(`\n!!! ENCONTRADO POSSÍVEL MATCH EM [${dbName}.${collInfo.name}] !!!`);
                        console.log(JSON.stringify(res, null, 2));
                    }
                }
            }
        }
        
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

search();
