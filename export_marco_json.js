const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function exportMarco() {
    const mongoUri = 'mongodb://127.0.0.1:27017';
    const dbName = 'ColabOuvidoria';
    const collectionName = 'zeladoria';
    const outputPath = path.join('c:', 'Users', '501379.PMDC', 'Desktop', 'records_v2', 'dbjson', 'export_banco_marco_2026.json');

    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        console.log('🚀 Conectado ao MongoDB...');
        const db = client.db(dbName);
        const col = db.collection(collectionName);

        // Filtro para Março 2026 (String e Date)
        const filter = {
            $or: [
                { created_at: { $gte: '2026-03-01T00:00:00', $lte: '2026-03-31T23:59:59' } },
                { created_at: { $gte: new Date('2026-03-01T00:00:00Z'), $lte: new Date('2026-03-31T23:59:59Z') } },
                { dataCriacaoIso: { $gte: new Date('2026-03-01T00:00:00Z'), $lte: new Date('2026-03-31T23:59:59Z') } }
            ]
        };

        console.log('🔍 Buscando documentos de Março de 2026...');
        const cursor = col.find(filter);

        const total = await col.countDocuments(filter);
        console.log(`📊 Total de registros encontrados: ${total}`);

        if (total === 0) {
            console.log('⚠️ Nenhum registro encontrado para o período informado.');
            return;
        }

        console.log(`💾 Salvando em: ${outputPath}`);
        
        // Abre o stream de escrita
        const writeStream = fs.createWriteStream(outputPath);
        writeStream.write('[\n');

        let first = true;
        let count = 0;

        await cursor.forEach(doc => {
            if (!first) {
                writeStream.write(',\n');
            }
            writeStream.write(JSON.stringify(doc, null, 2));
            first = false;
            count++;
            
            if (count % 100 === 0) {
                process.stdout.write(`\rProgress: ${count}/${total} (${Math.round((count/total)*100)}%)`);
            }
        });

        writeStream.write('\n]');
        writeStream.end();

        writeStream.on('finish', () => {
            console.log(`\n\n✅ Exportação concluída com sucesso!`);
            console.log(`✨ ${count} registros exportados.`);
            client.close();
        });

    } catch (err) {
        console.error('❌ Erro durante a exportação:', err);
        await client.close();
    }
}

exportMarco();
