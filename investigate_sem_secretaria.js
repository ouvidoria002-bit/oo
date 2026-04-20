
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function investigate() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        const collection = db.collection('zeladoria');

        console.log('--- INVESTIGAÇÃO: 227 REGISTROS "SEM SECRETARIA" (MARÇO) ---\n');

        const results = await collection.aggregate([
            { 
                $match: { 
                    secretaria: 'Sem Secretaria', 
                    dataCriacaoIso: { 
                        $gte: new Date('2026-03-01'), 
                        $lte: new Date('2026-03-31T23:59:59Z') 
                    } 
                } 
            },
            { 
                $group: { 
                    _id: { 
                        catId: '$category_id', 
                        tema: '$tema_especifico', 
                        branchName: '$branch.name', 
                        branchId: '$branch.id' 
                    }, 
                    count: { $sum: 1 } 
                } 
            },
            { $sort: { count: -1 } }
        ]).toArray();

        console.log('ID_CAT | QTD | TEMA                            | BRANCH_ID | BRANCH_NAME');
        console.log('-------|-----|---------------------------------|-----------|---------------------------');

        results.forEach(r => {
            const catId = String(r._id.catId || 'N/A').padEnd(6);
            const count = String(r.count).padEnd(3);
            const tema = (r._id.tema || 'N/A').padEnd(31).substring(0, 31);
            const bId = String(r._id.branchId || 'N/A').padEnd(9);
            const bName = (r._id.branchName || 'N/A');
            console.log(`${catId} | ${count} | ${tema} | ${bId} | ${bName}`);
        });

        console.log('\n--- AMOSTRA DE DESCRIÇÕES (TOP 5) ---\n');
        const samples = await collection.find({
            secretaria: 'Sem Secretaria',
            dataCriacaoIso: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31T23:59:59Z') }
        }).limit(5).toArray();

        samples.forEach((s, i) => {
            console.log(`${i+1}. [${s.tema_especifico}] - Bairro: ${s.bairro}`);
            console.log(`   Endereço: ${s.address}`);
            console.log(`   Status API: ${s.status}`);
            console.log('   ---');
        });

    } catch (err) {
        console.error('Erro na investigação:', err.message);
    } finally {
        await client.close();
    }
}

investigate();
