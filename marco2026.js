require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');
    await client.connect();
    const col = client.db(process.env.DB_NAME || 'ColabOuvidoria').collection(process.env.COLLECTION_NAME || 'zeladoria');

    // Março 2026 — testa os dois formatos de data (string e Date)
    const filtro = {
        $or: [
            { created_at: { $gte: new Date('2026-03-01T00:00:00Z'), $lte: new Date('2026-03-31T23:59:59Z') } },
            { created_at: { $gte: '2026-03-01T00:00:00', $lte: '2026-03-31T23:59:59' } }
        ]
    };

    const total = await col.countDocuments(filtro);
    console.log(`\n📊 MARÇO 2026 — Total de registros: ${total}\n`);

    // Por secretaria
    const secDist = await col.aggregate([
        { $match: filtro },
        { $group: { _id: '$secretaria', total: { $sum: 1 } } },
        { $sort: { total: -1 } }
    ]).toArray();

    console.log('🏛️  Por Secretaria:');
    console.log('SECRETARIA                                              | TOTAL');
    console.log('--------------------------------------------------------|------');
    secDist.forEach(r => {
        const nome = (r._id || 'null').padEnd(54).substring(0, 54);
        console.log(`${nome} | ${r.total}`);
    });

    // Por status
    const statusDist = await col.aggregate([
        { $match: filtro },
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { total: -1 } }
    ]).toArray();

    console.log('\n📌 Por Status:');
    statusDist.forEach(r => console.log(`  ${r._id}: ${r.total}`));

    // Por tema_especifico (top 10)
    const temaDist = await col.aggregate([
        { $match: filtro },
        { $group: { _id: '$tema_especifico', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 }
    ]).toArray();

    console.log('\n🏷️  Top 10 Temas:');
    temaDist.forEach(r => console.log(`  ${r._id}: ${r.total}`));

    await client.close();
}

main().catch(console.error);
