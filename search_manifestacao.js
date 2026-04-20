const { MongoClient } = require('mongodb');
require('dotenv').config();

async function search() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const dbName = 'ColabOuvidoria';
    const searchTerm = 'rodrigues';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const databases = ['ColabOuvidoria', 'ouvidoria_v2'];

        for (const dbName of databases) {
            console.log(`\n--- PESQUISANDO NO BANCO: ${dbName} ---`);
            const db = client.db(dbName);
            const collections = await db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            
            console.log(`Collections: ${collectionNames.join(', ')}`);

            for (const collName of collectionNames) {
                const collection = db.collection(collName);
                
                const query = {
                    $or: [
                        { description: { $regex: searchTerm, $options: 'i' } },
                        { citizen: { $regex: searchTerm, $options: 'i' } },
                        { assunto: { $regex: searchTerm, $options: 'i' } },
                        { tema_especifico: { $regex: searchTerm, $options: 'i' } },
                        { comments: { $regex: searchTerm, $options: 'i' } },
                        { nome: { $regex: searchTerm, $options: 'i' } },
                        { body: { $regex: searchTerm, $options: 'i' } },
                        { title: { $regex: searchTerm, $options: 'i' } },
                        { text: { $regex: searchTerm, $options: 'i' } },
                        { "citizen.name": { $regex: searchTerm, $options: 'i' } },
                        { "description.text": { $regex: searchTerm, $options: 'i' } }
                    ]
                };

                const countDocuments = await collection.countDocuments(query);
                if (countDocuments > 0) {
                    const results = await collection.find(query).limit(10).toArray();
                    console.log(`\n   >>> [ACHOU EM: ${collName}] (${countDocuments} registros) <<<`);
                    results.forEach(res => {
                        console.log(`   ID: ${res.id || res._id}`);
                        const citizenName = typeof res.citizen === 'string' ? res.citizen : (res.citizen?.name || 'N/A');
                        console.log(`   Cidadão: ${citizenName}`);
                        const description = res.description?.text || res.description || res.body || res.text || 'N/A';
                        console.log(`   Descrição/Teor: ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`);
                        console.log(`   ---`);
                    });
                }
            }
        }

        // Se não encontrar nada com os campos acima, vamos tentar uma busca mais agressiva?
        // Por enquanto vamos ver se isso resolve.
        
    } catch (err) {
        console.error('Erro na busca:', err);
    } finally {
        await client.close();
    }
}

search();
