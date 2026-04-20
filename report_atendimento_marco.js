
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        const collection = db.collection('zeladoria');

        const results = await collection.aggregate([
            { 
                $match: { 
                    dataCriacaoIso: { 
                        $gte: new Date('2026-03-01T00:00:00Z'), 
                        $lte: new Date('2026-03-31T23:59:59Z') 
                    } 
                } 
            },
            { 
                $group: { 
                    _id: '$secretaria', 
                    total: { $sum: 1 }, 
                    concluidos: { 
                        $sum: { 
                            $cond: [ 
                                { $eq: ['$statusDemanda', 'Encerrada'] }, 
                                1, 0 
                            ] 
                        } 
                    } 
                } 
            },
            { 
                $addFields: { 
                    taxaResolucao: { 
                        $cond: [ 
                            { $gt: ['$total', 0] }, 
                            { $multiply: [ { $divide: ['$concluidos', '$total'] }, 100 ] }, 
                            0 
                        ] 
                    } 
                } 
            },
            { $sort: { total: -1 } }
        ]).toArray();

        console.log('RANKING DE ATENDIMENTO POR SETORIAL - MARÇO/2026');
        console.log('------------------------------------------------------------');
        console.log('SETORIAL                         | TOTAL  | CONCLUÍDOS | % TAXA');
        console.log('---------------------------------|--------|------------|--------');
        
        results.forEach(r => {
            const nome = (r._id || 'Sem Secretaria').padEnd(32).substring(0, 32);
            const total = String(r.total).padEnd(6);
            const conc = String(r.concluidos).padEnd(10);
            const taxa = r.taxaResolucao.toFixed(1).padStart(5) + '%';
            console.log(`${nome} | ${total} | ${conc} | ${taxa}`);
        });

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await client.close();
    }
}

run();
