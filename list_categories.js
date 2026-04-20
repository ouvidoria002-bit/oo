const { MongoClient } = require('mongodb');
require('dotenv').config();

async function listCategories() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const dbName = process.env.DB_NAME || 'ColabOuvidoria';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collectionName = process.env.COLLECTION_NAME || 'zeladoria';
        const collection = db.collection(collectionName);

        console.log(`Analisando categorias na coleção "${collectionName}"...\n`);

        const pipeline = [
            {
                $group: {
                    _id: "$category_id",
                    count: { $sum: 1 },
                    sample_description: { $first: "$description" },
                    branch_name: { $first: "$branch.name" }
                }
            },
            { $sort: { count: -1 } }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        console.log('ID Categoria | Qtd | Órgão/Secretaria | Exemplo de Descrição');
        console.log('--------------------------------------------------------------');
        
        results.forEach(res => {
            const id = String(res._id).padEnd(12);
            const count = String(res.count).padEnd(5);
            const branch = (res.branch_name || 'N/A').padEnd(25).substring(0, 25);
            const desc = (res.sample_description || '').replace(/\n/g, ' ').substring(0, 50);
            
            console.log(`${id} | ${count} | ${branch} | ${desc}...`);
        });

        console.log(`\nTotal de categorias únicas encontradas: ${results.length}`);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

listCategories();
