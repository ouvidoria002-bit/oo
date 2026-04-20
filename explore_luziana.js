const { MongoClient } = require('mongodb');
require('dotenv').config();

async function explore() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const dbName = process.env.DB_NAME || 'ColabOuvidoria';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('zeladoria');

        const searchTerm = 'Luziana';
        const query = {
            $or: [
                { description: { $regex: searchTerm, $options: 'i' } },
                { citizen: { $regex: searchTerm, $options: 'i' } },
                { "citizen.name": { $regex: searchTerm, $options: 'i' } },
                { "author.name": { $regex: searchTerm, $options: 'i' } },
                { comments: { $regex: searchTerm, $options: 'i' } }
            ]
        };

        const count = await collection.countDocuments(query);
        console.log(`Encontrados ${count} documentos para "${searchTerm}".`);

        if (count > 0) {
            const sample = await collection.findOne(query);
            console.log('Exemplo de documento encontrado:', JSON.stringify(sample, null, 2));
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

explore();
