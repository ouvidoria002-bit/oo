require('dotenv').config();
const { MongoClient } = require('mongodb');

// Mapa oficial FINAL e CONSOLIDADO (A pedido do Sr. Wellington)
const BRANCH_TO_SECRETARIA = {
    // ── SECRETARIA DE OBRAS (Unificada) ──────────────────────────────────
    6333: "Secretaria de Obras",                      // Superintendência de Limpeza Urbana
    6413: "Secretaria de Obras",                      // 1ª Residência de Obras
    6414: "Secretaria de Obras",                      // 2ª Residência de Obras A
    6415: "Secretaria de Obras",                      // 2ª Residência de Obras B
    6416: "Secretaria de Obras",                      // 3ª Residência de Obras
    6417: "Secretaria de Obras",                      // 4ª Residência de Obras
    6412: "Secretaria de Obras",                      // Ouvidoria Setorial de Obras
    6343: "Secretaria de Obras",                      // Coordenadoria de Engenharia Pública
    6420: "Secretaria de Obras",                      // GPE

    // ── SECRETARIA DE TRANSPORTES ─────────────────────────────────────────
    6347: "Secretaria de Transportes",                // Nome simplificado

    // ── SECRETARIA DE SEGURANÇA ───────────────────────────────────────────
    6448: "Secretaria de Segurança",                  // Guarda Municipal
    6447: "Secretaria de Segurança",                  // Gabinete Secretário de Segurança

    // ── SECRETARIA DE URBANISMO ───────────────────────────────────────────
    6346: "Secretaria de Urbanismo",                  // Setor de Fiscalização (Urbanismo)
    6342: "Secretaria de Urbanismo",                  // Gabinete
    6411: "Secretaria de Urbanismo",                  // Planejamento

    // ── OUTROS / ADM ──────────────────────────────────────────────────────
    6449: "Outros",                                   // Empresa SEPLAQUE
    6305: "Outros",                                   // Ouvidoria Geral
    6264: "Outros"                                    // Colab
};

async function reprocessSecretaria() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');

    try {
        console.log('🔄 Executando Consolidação Final das Secretarias...\n');
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        const col = db.collection(process.env.COLLECTION_NAME || 'zeladoria');

        // 1. Reset para "Outros" em todos os não mapeados primeiro para garantir limpeza
        await col.updateMany({}, { $set: { secretaria: "Outros" } });

        let atualizados = 0;

        // 2. Aplica o mapa consolidado
        for (const [branchId, secretaria] of Object.entries(BRANCH_TO_SECRETARIA)) {
            const res = await col.updateMany(
                { "branch.id": parseInt(branchId) },
                { $set: { secretaria } }
            );
            atualizados += res.modifiedCount;
        }

        // 3. Aplica "Sem Secretaria" para os nulos
        const r3 = await col.updateMany(
            {
                $or: [
                    { "branch.id": null },
                    { "branch": null },
                    { "branch": { $exists: false } }
                ]
            },
            { $set: { secretaria: "Sem Secretaria" } }
        );

        // Distribuição final para conferência
        const dist = await col.aggregate([
            { $group: { _id: "$secretaria", total: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]).toArray();

        console.log('\n📊 PLACAR CONSOLIDADO (Resultado Final):');
        console.log('SECRETARIA                               | TOTAL');
        console.log('-----------------------------------------|-------');
        dist.forEach(d => {
            const nome = (d._id || 'null').padEnd(40).substring(0, 40);
            console.log(`${nome} | ${d.total}`);
        });

        console.log(`\n✅ Banco de dados atualizado com sucesso!`);

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await client.close();
    }
}

reprocessSecretaria();
