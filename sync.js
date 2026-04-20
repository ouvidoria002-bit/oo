require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const qs = require('qs');

/**
 * CONFIGURAÇÃO REFINADA
 */
const CONFIG = {
    dataInicial: new Date(process.env.DATA_INICIAL || '2025-01-01T00:00:00Z'),
    intervaloHoras: parseInt(process.env.INTERVALO_HORAS || '12'),
    overlapHours: parseInt(process.env.OVERLAP_HOURS || '24'),
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
    dbName: process.env.DB_NAME || 'ColabOuvidoria',
    collectionName: process.env.COLLECTION_NAME || 'zeladoria',
    api: {
        baseUrl: process.env.API_BASE_URL || 'https://api.colabapp.com/v2/integration/posts',
        headers: {
            'x-colab-application-id': process.env.COLAB_APP_ID,
            'x-colab-rest-api-key': process.env.COLAB_API_KEY,
            'x-colab-admin-user-auth-ticket': process.env.COLAB_AUTH_TICKET
        }
    },
    dominio: process.env.DOMINIO || 'zeladoria',
    delayMs: 4000
};

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

function resolveSecretaria(item) {
    if (item.branch?.id && BRANCH_TO_SECRETARIA[item.branch.id]) {
        return BRANCH_TO_SECRETARIA[item.branch.id];
    }
    return item.branch?.name || "Sem Secretaria";
}

function resolveStatusSimplificado(status) {
    const s = String(status).toUpperCase();
    if (["ABERTO", "ATENDIMENTO", "NOVO"].includes(s)) return "Em Aberto";
    if (["CONCLUIDO", "FECHADO", "ATENDIDO"].includes(s)) return "Concluídas";
    return "Outros";
}

function formatApiDate(date) {
    return date.toISOString().replace('T', ' ').replace('Z', '').padEnd(24, '0');
}

async function syncData() {
    const client = new MongoClient(CONFIG.mongoUri);

    try {
        console.log('🚀 Iniciando sincronização retroativa...');
        await client.connect();
        const db = client.db(CONFIG.dbName);
        const collection = db.collection(CONFIG.collectionName);
        
        // Determina a data de parada (hoje lá atrás até o último registro + overlap)
        const lastRecord = await collection.find().sort({dataCriacaoIso: -1}).limit(1).toArray();
        let stopDate = CONFIG.dataInicial;

        if (lastRecord.length > 0 && lastRecord[0].dataCriacaoIso) {
            const lastDate = new Date(lastRecord[0].dataCriacaoIso);
            stopDate = new Date(lastDate.getTime() - (CONFIG.overlapHours * 60 * 60 * 1000));
            console.log(`📌 Último registro encontrado: ${lastDate.toISOString()}. Parando em: ${stopDate.toISOString()}`);
        } else {
            console.log(`📌 Banco vazio ou sem datas. Retrocedendo até o limite: ${stopDate.toISOString()}`);
        }

        let cursorFim = new Date();
        let totalSincronizado = 0;

        while (cursorFim > stopDate) {
            let cursorInicio = new Date(cursorFim);
            cursorInicio.setHours(cursorInicio.getHours() - CONFIG.intervaloHoras);

            if (cursorInicio < stopDate) cursorInicio = new Date(stopDate);

            const startStr = cursorInicio.toISOString();
            const endStr = cursorFim.toISOString();
            
            console.log(`\n📡 [${new Date().toLocaleTimeString()}] Buscando (RETROATIVO): ${startStr} até ${endStr}`);

            try {
                const response = await axios.get(CONFIG.api.baseUrl, {
                    headers: CONFIG.api.headers,
                    params: {
                        start_date: formatApiDate(cursorInicio),
                        end_date: formatApiDate(cursorFim)
                    },
                    paramsSerializer: params => qs.stringify(params, { arrayFormat: 'brackets' }),
                    timeout: 30000
                });

                const items = response.data;

                if (Array.isArray(items) && items.length > 0) {
                    console.log(`✅ Recebidos ${items.length} itens.`);

                    const operations = items.map(item => {
                        const tema = CATEGORY_MAP[item.category_id] || "Outros / Zeladoria";
                        const doc = { 
                            ...item, 
                            dominio: CONFIG.dominio,
                            tema_especifico: tema,
                            assunto: tema,
                            secretaria: resolveSecretaria(item),
                            status_simplificado: resolveStatusSimplificado(item.status),
                            statusDemanda: resolveStatusDemanda(item.status),
                            bairro: (item.neighborhood || 'NÃO INFORMADO').toUpperCase(),
                            dataCriacaoIso: item.created_at ? new Date(item.created_at) : null,
                            dataConclusaoIso: item.finished_at ? new Date(item.finished_at) : null,
                            last_sync_at: new Date()
                        };
                        
                        return {
                            replaceOne: {
                                filter: { id: item.id },
                                replacement: doc,
                                upsert: true
                            }
                        };
                    });

                    await collection.bulkWrite(operations);
                    totalSincronizado += items.length;
                } else {
                    console.log('ℹ️ Nenhum dado neste intervalo.');
                }

            } catch (err) {
                console.error(`❌ Erro no intervalo: ${err.message}`);
                if (err.response?.status === 429) {
                    await new Promise(r => setTimeout(r, 10000));
                }
            }

            cursorFim = new Date(cursorInicio);
            await new Promise(r => setTimeout(r, CONFIG.delayMs));
        }

        console.log(`\n🏁 Ciclo finalizado. Total: ${totalSincronizado} itens.`);

    } catch (err) {
        console.error('💥 Erro fatal:', err.message);
    } finally {
        await client.close();
    }
}

async function startDaemon() {
    console.log("🛠️ Iniciando Motor Retroativo...");
    while (true) {
        await syncData();
        console.log(`\n💤 Aguardando próxima varredura em 15 minutos...`);
        await new Promise(r => setTimeout(r, 15 * 60 * 1000)); 
    }
}

startDaemon();
