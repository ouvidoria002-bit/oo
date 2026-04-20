require('dotenv').config();
const { MongoClient } = require('mongodb');

async function auditRanking() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        const col = db.collection(process.env.COLLECTION_NAME || 'zeladoria');

        const inicio = new Date('2026-03-01T00:00:00Z');
        const fim = new Date('2026-03-31T23:59:59Z');

        const filtro = {
            $or: [
                { created_at: { $gte: inicio, $lte: fim } },
                { created_at: { $gte: '2026-03-01T00:00:00', $lte: '2026-03-31T23:59:59' } }
            ]
        };

        console.log('🔍 AUDITORIA DE RANKING - MARÇO 2026\n');

        // 1. Ranking por category_id (O nome REAL que vem da API)
        const categories = await col.aggregate([
            { $match: filtro },
            { $group: { 
                _id: "$category_id", 
                total: { $sum: 1 },
                exemplo_tema: { $first: "$tema_especifico" },
                exemplo_desc: { $first: "$description" }
            }},
            { $sort: { total: -1 } }
        ]).toArray();

        console.log('ID   | TOTAL | NOME QUE USAMOS (tema_especifico) | EXEMRPLO DESCRIÇÃO');
        console.log('-----|-------|-----------------------------------|------------------');
        categories.forEach(c => {
            const id = String(c._id).padEnd(4);
            const tot = String(c.total).padEnd(5);
            const tema = (c.exemplo_tema || 'N/A').padEnd(33).substring(0, 33);
            const desc = (c.exemplo_desc || '').replace(/\n/g, ' ').substring(0, 50);
            console.log(`${id} | ${tot} | ${tema} | ${desc}...`);
        });

        // 2. Tentar achar onde está o "Outros"
        const outrosCount = await col.countDocuments({ ...filtro, tema_especifico: /Outros/i });
        console.log(`\n⚠️ Total de registros marcados como "Outros" no banco: ${outrosCount}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

auditRanking();
