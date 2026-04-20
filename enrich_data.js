const { MongoClient } = require('mongodb');
require('dotenv').config();

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

async function enrichData() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const dbName = process.env.DB_NAME || 'ColabOuvidoria';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collectionName = process.env.COLLECTION_NAME || 'zeladoria';
        const collection = db.collection(collectionName);

        console.log('Iniciando enriquecimento de temas...');

        const cursor = collection.find({ category_id: { $exists: true } });
        let updatedCount = 0;

        const results = await cursor.toArray();
        const total = results.length;

        console.log(`Processando ${total} documentos...`);

        const operations = results.map(doc => {
            const newTema = CATEGORY_MAP[doc.category_id] || "Outros / Zeladoria";
            return {
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: { tema_especifico: newTema } }
                }
            };
        });

        if (operations.length > 0) {
            // Bulk write in batches to avoid overhead
            const batchSize = 1000;
            for (let i = 0; i < operations.length; i += batchSize) {
                const batch = operations.slice(i, i + batchSize);
                await collection.bulkWrite(batch);
                updatedCount += batch.length;
                process.stdout.write(`\rProgresso: ${updatedCount}/${total}`);
            }
        }

        console.log('\n\n✅ Enriquecimento concluído com sucesso!');
        console.log(`Total de registros atualizados: ${updatedCount}`);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

enrichData();
