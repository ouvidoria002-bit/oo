require('dotenv').config();
const { MongoClient } = require('mongodb');

async function getBranches() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        const col = db.collection(process.env.COLLECTION_NAME || 'zeladoria');

        // Branches únicos
        const branches = await col.aggregate([
            { $match: { "branch.id": { $ne: null } } },
            { $group: { 
                _id: "$branch.id", 
                nome: { $first: "$branch.name" },
                total: { $sum: 1 }
            }},
            { $sort: { total: -1 } }
        ]).toArray();

        console.log('\n🏛️  BRANCHES/SECRETARIAS encontrados no banco:');
        console.log('ID       | TOTAL  | NOME');
        console.log('---------|--------|------------------------------------------');
        branches.forEach(b => {
            console.log(`${String(b._id).padEnd(8)} | ${String(b.total).padEnd(6)} | ${b.nome}`);
        });

        // Category_id únicos com nome e total
        const cats = await col.aggregate([
            { $group: { 
                _id: "$category_id", 
                tema: { $first: "$tema_especifico" },
                branch: { $first: "$branch.name" },
                total: { $sum: 1 }
            }},
            { $sort: { total: -1 } }
        ]).toArray();

        console.log('\n\n🏷️  CATEGORIAS encontradas no banco (com mapeamento atual):');
        console.log('CAT_ID   | TOTAL  | TEMA ATUAL (no banco)                         | BRANCH MAIS COMUM');
        console.log('---------|--------|------------------------------------------------|------------------');
        cats.forEach(c => {
            const cat = String(c._id || 'N/A').padEnd(8);
            const tot = String(c.total).padEnd(6);
            const tema = (c.tema || 'N/A').padEnd(46).substring(0, 46);
            const branch = (c.branch || 'N/A').substring(0, 35);
            console.log(`${cat} | ${tot} | ${tema} | ${branch}`);
        });

        console.log(`\n✅ Total de categorias únicas: ${cats.length}`);
        console.log(`✅ Total de branches únicos: ${branches.length}`);

    } catch(e) {
        console.error('Erro:', e.message);
    } finally {
        await client.close();
    }
}

getBranches();
