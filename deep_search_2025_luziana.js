const { MongoClient } = require('mongodb');
require('dotenv').config();

async function deepSearch2025() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('ColabOuvidoria');
        const collection = db.collection('zeladoria');

        console.log('Pesquisando exaustivamente por "Luziana" em 2025...');

        // Busca por qualquer campo que contenha "Luziana" em documentos de 2025
        const query = {
            $and: [
                { $text: { $search: "Luziana" } }, // text index check (might not exist)
                { dataCriacaoIso: { $regex: '^2025' } }
            ]
        };

        // If text index fails, we use a broader $or
        const fallbackQuery = {
            $and: [
                { $or: [
                    { citizen: { $regex: 'Luziana', $options: 'i' } },
                    { "citizen.name": { $regex: 'Luziana', $options: 'i' } },
                    { description: { $regex: 'Luziana', $options: 'i' } },
                    { "description.text": { $regex: 'Luziana', $options: 'i' } },
                    { author: { $regex: 'Luziana', $options: 'i' } },
                    { comments: { $regex: 'Luziana', $options: 'i' } }
                ]},
                { dataCriacaoIso: { $regex: '^2025' } }
            ]
        };

        const count = await collection.countDocuments(fallbackQuery);
        console.log(`\nResultado da busca exaustiva 2025: ${count} documentos.`);

        if (count > 0) {
            const results = await collection.find(fallbackQuery).toArray();
            results.forEach(r => {
                console.log(` - ID: ${r.id} | Data: ${r.dataCriacaoIso} | Citizen: ${JSON.stringify(r.citizen)}`);
            });
        } else {
             // Let's check 2026 again to be sure our logic works
             const count2026 = await collection.countDocuments({
                 citizen: { $regex: 'Luziana', $options: 'i' },
                 dataCriacaoIso: { $regex: '^2026' }
             });
             console.log(`Confirmação 2026: ${count2026} documentos.`);
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

deepSearch2025();
