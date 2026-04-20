
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function listSecretarias() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        
        const collections = await db.listCollections().toArray();
        const colNames = collections.map(c => c.name);
        
        console.log('\n--- RELATÓRIO DE SECRETARIAS ---\n');

        for (const colName of colNames) {
            const col = db.collection(colName);
            
            // Caso especial para secretarias_info
            if (colName === 'secretarias_info') {
                const results = await col.find({}).toArray();
                if (results.length > 0) {
                    console.log(`Coleção: ${colName} (Configurações Gerais)`);
                    console.log(''.padEnd(colName.length + 25, '-'));
                    results.forEach(res => {
                        console.log(`- ${res.nome || res.secretaria || JSON.stringify(res)}`);
                    });
                    console.log('');
                }
                continue;
            }

            // Verifica se a coleção tem o campo 'secretaria'
            const hasSecretaria = await col.findOne({ secretaria: { $exists: true } });
            
            if (hasSecretaria) {
                const results = await col.aggregate([
                    { $group: { _id: "$secretaria", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]).toArray();

                console.log(`Coleção: ${colName}`);
                console.log(''.padEnd(colName.length + 9, '-'));
                results.forEach(res => {
                    const nome = (res._id || 'Sem Secretaria').padEnd(40);
                    console.log(`${nome} | ${res.count} registros`);
                });
                console.log('');
            }
        }

    } catch (err) {
        console.error('Erro ao acessar o banco de dados:', err.message);
    } finally {
        await client.close();
    }
}

listSecretarias();
