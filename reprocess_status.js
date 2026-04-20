require('dotenv').config();
const { MongoClient } = require('mongodb');

// Nova função de agrupamento conforme pedido do Sr. Wellington
function resolveStatusSimplificado(status) {
    const s = String(status).toUpperCase();
    if (["ABERTO", "ATENDIMENTO", "NOVO"].includes(s)) return "Em Aberto";
    if (["CONCLUIDO", "FECHADO", "ATENDIDO"].includes(s)) return "Concluídas";
    if (s === "RECUSADO") return "Recusado";
    if (s === "INDEFERIDO") return "Indeferido";
    return "Outros";
}

async function reprocessStatus() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');
    try {
        console.log('🔄 Atualizando Status Simplificado (Regra Específica)...\n');
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        const col = db.collection(process.env.COLLECTION_NAME || 'zeladoria');

        console.log(`📊 Processando documentos...`);
        
        // Aplica as regras via updateMany (mais eficiente)
        await col.updateMany({ status: { $in: ["ABERTO", "ATENDIMENTO", "NOVO"] } }, { $set: { status_simplificado: "Em Aberto" } });
        await col.updateMany({ status: { $in: ["CONCLUIDO", "FECHADO", "ATENDIDO"] } }, { $set: { status_simplificado: "Concluídas" } });
        await col.updateMany({ status: "RECUSADO" }, { $set: { status_simplificado: "Recusado" } });
        await col.updateMany({ status: "INDEFERIDO" }, { $set: { status_simplificado: "Indeferido" } });
        await col.updateMany({ status_simplificado: { $exists: false } }, { $set: { status_simplificado: "Outros" } });

        // Distribuição final de Março para conferência
        const inicio = new Date('2026-03-01T00:00:00Z');
        const fim = new Date('2026-03-31T23:59:59Z');
        const filtroMarco = {
            $or: [
                { created_at: { $gte: inicio, $lte: fim } },
                { created_at: { $gte: '2026-03-01', $lte: '2026-03-31T23:59:59' } }
            ]
        };

        const dist = await col.aggregate([
            { $match: filtroMarco },
            { $group: { _id: "$status_simplificado", total: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]).toArray();

        console.log('\n📈 RESULTADO MARÇO 2026:');
        dist.forEach(d => console.log(`  ${d._id}: ${d.total}`));

        console.log(`\n✅ Banco de dados atualizado com as novas regras.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

reprocessStatus();
