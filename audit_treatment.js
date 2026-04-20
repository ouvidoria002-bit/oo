
require('dotenv').config();
const { MongoClient } = require('mongodb');

// Mapa que está no sync.js para comparação
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

async function auditData() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');

    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'ColabOuvidoria');
        const col = db.collection('posts');

        console.log('--- AUDITORIA DE TRATAMENTO DE DADOS (ZELADORIA) ---\n');

        const audit = await col.aggregate([
            {
                $group: {
                    _id: {
                        catId: "$category_id",
                        tema: "$tema_especifico",
                        secretaria: "$secretaria"
                    },
                    total: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]).toArray();

        console.log('ID_CAT | TOTAL  | TEMA (NO BANCO)                 | SECRETARIA ATRIBUÍDA         | STATUS');
        console.log('-------|--------|---------------------------------|------------------------------|---------');

        audit.forEach(a => {
            const catId = a._id.catId;
            const temaBanco = a._id.tema || 'NULO';
            const secBanco = a._id.secretaria || 'NULA';
            const total = String(a.total).padEnd(6);
            
            const temaEsperado = CATEGORY_MAP[catId] || "Outros / Zeladoria";
            
            let status = '✅ OK';
            if (temaBanco !== temaEsperado) {
                status = '❌ ERRO (Tema Divergente)';
            } else if (secBanco === 'Sem Secretaria' && total > 0) {
                status = '⚠️ ALERTA (Sem Sec)';
            }

            console.log(`${String(catId).padEnd(6)} | ${total} | ${temaBanco.padEnd(31).substring(0,31)} | ${secBanco.padEnd(28).substring(0,28)} | ${status}`);
        });

        // Verificação de tipos estranhos em ouvidoria_v2
        console.log('\n\n--- AUDITORIA DE TRATAMENTO DE DADOS (OUVIDORIA_V2) ---\n');
        const colOuv = db.collection('ouvidoria_v2');
        const auditOuv = await colOuv.aggregate([
            {
                $group: {
                    _id: "$secretaria",
                    total: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]).toArray();

        console.log('SECRETARIA / SETOR               | TOTAL  | TIPO');
        console.log('---------------------------------|--------|-------');
        auditOuv.forEach(a => {
            const nome = (a._id || 'NULO').padEnd(32);
            const total = String(a.total).padEnd(6);
            
            // Heurística simples para detectar nomes de pessoas
            const isPessoa = a._id && a._id.split(' ').length > 2 && !a._id.includes('OUVIDORIA') && !a._id.includes('SECRETARIA') && !a._id.includes('DEPARTAMENTO');
            const tipo = isPessoa ? '👤 PESSOA?' : '🏛️ SETOR';

            console.log(`${nome} | ${total} | ${tipo}`);
        });

    } catch (err) {
        console.error('Erro na auditoria:', err.message);
    } finally {
        await client.close();
    }
}

auditData();
