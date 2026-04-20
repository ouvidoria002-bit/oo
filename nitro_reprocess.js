
require('dotenv').config();
const { MongoClient } = require('mongodb');

// --- Mapas e Auxiliares (Copiados do sync.js para paridade total) ---
const CATEGORY_MAP = {
    12820: "Remoção de Entulho / Obras",
    12808: "Reparo de Asfalto / Pavimentação",
    12823: "Capina e Roçagem",
    12811: "Esgoto e Drenagem",
    12822: "Limpeza Urbana Geral",
    225675: "Desentupimento (Vacall)",
    12870: "Iluminação Pública (Lâmpada Apagada)",
    12821: "Limpeza de Logradouro",
    225678: "Retirada de Entulho",
    12885: "Manutenção de Esgoto",
    12826: "Manutenção de Iluminação",
    225676: "Equipe de Obras / Reparos",
    12807: "Manilha Arriada / Drenagem",
    225700: "Reparo de Ralo e Tampão",
    225680: "Retirada de Lixo",
    225679: "Retirada de Galhos",
    12871: "Fiscalização de Estacionamento",
    12814: "Fiscalização / Passarela",
    12817: "Iluminação (Lâmpada Acesa Dia)",
    12809: "Limpeza de Rio / Canal",
    225696: "Colocação de Manilha / Caixa",
    12818: "Iluminação (Lâmpada Piscando)",
    12831: "Iluminação de Praças",
    225677: "Roçagem (SMMA)",
    12825: "Manutenção de Poste",
    12834: "Sinalização Viária",
    12824: "Fiação Elétrica / Risco",
    12835: "Ouvidoria Geral / Teste",
    225689: "Reparo em Calçada",
    12836: "Segurança / Guarda Municipal",
    225699: "Limpeza Manual de Canal",
    225698: "Instalação de Braço de Luz",
    225695: "Pavimentação / Buracos",
    225697: "Manutenção de Canteiro",
    12840: "Sinalização Semafórica",
    225703: "Retirada de Veículo",
    225673: "Colocação de Luz",
    12839: "Sinalização (Semáforo Piscando)",
    225672: "Falta de Iluminação",
    225690: "Caça-fio (GPE)",
    12837: "Retirada de Semáforo",
    225669: "Troca de Luz",
    12838: "Semáforo Defeituoso (Vermelho)",
    225670: "Poste Pegando Fogo",
    225667: "Retirada de Fiação Solta",
    225681: "Colocação de Placa"
};

const BRANCH_TO_SECRETARIA = {
    6333: "Secretaria de Obras",
    6413: "Secretaria de Obras",
    6414: "Secretaria de Obras",
    6415: "Secretaria de Obras",
    6416: "Secretaria de Obras",
    6417: "Secretaria de Obras",
    6412: "Secretaria de Obras",
    6343: "Secretaria de Obras",
    6420: "Secretaria de Obras",
    6347: "Secretaria de Transportes",
    6448: "Secretaria de Segurança",
    6447: "Secretaria de Segurança",
    6346: "Secretaria de Urbanismo",
    6342: "Secretaria de Urbanismo",
    6411: "Secretaria de Urbanismo",
    6449: "Outros",
    6305: "Outros",
    6264: "Outros"
};

function resolveStatusDemanda(status) {
    const s = String(status).toUpperCase();
    if (["ABERTO", "ATENDIMENTO", "NOVO"].includes(s)) return "Em andamento";
    if (["CONCLUIDO", "FECHADO", "ATENDIDO"].includes(s)) return "Encerrada";
    return "Em andamento";
}

function resolveStatusSimplificado(status) {
    const s = String(status).toUpperCase();
    if (["ABERTO", "ATENDIMENTO", "NOVO"].includes(s)) return "Em Aberto";
    if (["CONCLUIDO", "FECHADO", "ATENDIDO"].includes(s)) return "Concluídas";
    if (s === "RECUSADO") return "Recusado";
    if (s === "INDEFERIDO") return "Indeferido";
    return "Outros";
}

function resolveSecretaria(item) {
    if (item.branch?.id && BRANCH_TO_SECRETARIA[item.branch.id]) {
        return BRANCH_TO_SECRETARIA[item.branch.id];
    }
    if (item.branch?.name) {
        return item.branch.name;
    }
    return "Sem Secretaria";
}

async function startNitroReprocess() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        
        const backupColName = 'posts_backup_20260409T025125902Z';
        const targetColName = 'zeladoria';

        console.log(`🚀 Iniciando MODO NITRO...`);
        console.log(`📂 Lendo de: ${backupColName}`);
        console.log(`🎯 Gravando em: ${targetColName}`);

        const cursor = db.collection(backupColName).find({});
        let count = 0;
        let batch = [];
        const BATCH_SIZE = 500;

        while (await cursor.hasNext()) {
            const item = await cursor.next();
            const tema = CATEGORY_MAP[item.category_id] || "Outros / Zeladoria";

            const { _id, ...cleanItem } = item; // Remove o _id original do backup

            const doc = {
                ...cleanItem,
                dominio: 'zeladoria',
                tema_especifico: tema,
                assunto: tema,
                secretaria: resolveSecretaria(item),
                status_simplificado: resolveStatusSimplificado(item.status),
                statusDemanda: resolveStatusDemanda(item.status),
                bairro: (item.neighborhood || 'NÃO INFORMADO').toUpperCase(),
                dataCriacaoIso: item.created_at ? new Date(item.created_at) : null,
                last_sync_at: new Date(),
                _nitro_reprocess: true
            };

            batch.push({
                replaceOne: {
                    filter: { id: item.id },
                    replacement: doc,
                    upsert: true
                }
            });

            if (batch.length >= BATCH_SIZE) {
                await db.collection(targetColName).bulkWrite(batch);
                count += batch.length;
                process.stdout.write(`\r📊 Progresso: ${count} registros reprocessados...`);
                batch = [];
            }
        }

        if (batch.length > 0) {
            await db.collection(targetColName).bulkWrite(batch);
            count += batch.length;
        }

        console.log(`\n\n✅ MODO NITRO CONCLUÍDO!`);
        console.log(`✨ Total de registros restaurados e limpos: ${count}`);

    } catch (err) {
        console.error('\n❌ Erro no Modo Nitro:', err.message);
    } finally {
        await client.close();
    }
}

startNitroReprocess();
