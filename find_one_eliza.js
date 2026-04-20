const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    try {
        await client.connect();
        const db = client.db('ColabOuvidoria');
        const collections = ['ouvidoria_v2', 'posts', 'zeladoria'];
        
        console.log('Iniciando busca rápida por "eliza"...');

        for (const collName of collections) {
            console.log(`Buscando em ${collName}...`);
            const coll = db.collection(collName);
            
            // Busca usando cursor para economizar memória e tempo
            const cursor = coll.find({
                $or: [
                    { description: /eliza/i },
                    { citizen: /eliza/i },
                    { text: /eliza/i },
                    { body: /eliza/i },
                    { "citizen.name": /eliza/i }
                ]
            });

            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                const json = JSON.stringify(doc).toLowerCase();
                if (json.includes('rodrigues')) {
                    console.log(`\n✅ ACHOU! Collection: ${collName}`);
                    console.log(JSON.stringify(doc, null, 2));
                    return; // Para na primeira
                }
            }
        }
        console.log('Nenhuma manifestação encontrada com "eliza rodrigues".');
    } finally {
        await client.close();
    }
}
run();
