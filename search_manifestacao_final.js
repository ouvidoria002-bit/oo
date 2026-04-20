const { MongoClient } = require('mongodb');
require('dotenv').config();

async function search() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const databases = ['ColabOuvidoria', 'ouvidoria_v2'];
    const searchTerm = 'eliza rodrigues';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        
        for (const dbName of databases) {
            const db = client.db(dbName);
            const collections = await db.listCollections().toArray();
            
            for (const collInfo of collections) {
                const collection = db.collection(collInfo.name);
                
                // Busca em qualquer campo de texto
                const results = await collection.find({
                    $or: [
                        { $text: { $search: searchTerm } }, // Tenta busca de texto se houver índice
                        { description: { $regex: searchTerm, $options: 'i' } },
                        { "description.text": { $regex: searchTerm, $options: 'i' } },
                        { citizen: { $regex: searchTerm, $options: 'i' } },
                        { "citizen.name": { $regex: searchTerm, $options: 'i' } },
                        { body: { $regex: searchTerm, $options: 'i' } },
                        { text: { $regex: searchTerm, $options: 'i' } },
                        { comments: { $regex: searchTerm, $options: 'i' } },
                        { metadata: { $regex: searchTerm, $options: 'i' } },
                        { subject: { $regex: searchTerm, $options: 'i' } },
                        { assunto: { $regex: searchTerm, $options: 'i' } },
                        { "detail.description": { $regex: searchTerm, $options: 'i' } }
                    ]
                }).limit(5).toArray().catch(err => {
                    // Se falhar (ex: $text sem índice), tenta sem $text
                    return collection.find({
                        $or: [
                            { description: { $regex: searchTerm, $options: 'i' } },
                            { "description.text": { $regex: searchTerm, $options: 'i' } },
                            { citizen: { $regex: searchTerm, $options: 'i' } },
                            { "citizen.name": { $regex: searchTerm, $options: 'i' } },
                            { body: { $regex: searchTerm, $options: 'i' } },
                            { text: { $regex: searchTerm, $options: 'i' } },
                            { comments: { $regex: searchTerm, $options: 'i' } },
                            { subject: { $regex: searchTerm, $options: 'i' } },
                            { assunto: { $regex: searchTerm, $options: 'i' } }
                        ]
                    }).limit(5).toArray();
                });

                if (results.length > 0) {
                    console.log(`\n### ACHADO EM [${dbName}.${collInfo.name}] ###`);
                    console.log(JSON.stringify(results, null, 2));
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
