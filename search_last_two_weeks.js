const { MongoClient } = require('mongodb');
require('dotenv').config();

async function search() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);
    
    // Data de 2 semanas atrás (aprox 25/03/2026)
    const startDate = new Date('2026-03-25T00:00:00Z');
    const endDate = new Date('2026-04-08T23:59:59Z');
    
    const searchTerm = 'eliza rodrigues';

    try {
        await client.connect();
        const db = client.db('ColabOuvidoria');
        const collections = ['ouvidoria_v2', 'zeladoria', 'posts'];

        console.log(`Buscando manifestações de ${startDate.toISOString()} até ${endDate.toISOString()}...`);
        console.log(`Termo no teor: "${searchTerm}"\n`);

        for (const collName of collections) {
            const collection = db.collection(collName);
            
            // Filtro por data e termo no teor
            const query = {
                $and: [
                    {
                        $or: [
                            { created_at: { $gte: startDate, $lte: endDate } },
                            { created_at: { $gte: '2026-03-25T00:00:00', $lte: '2026-04-08T23:59:59' } }
                        ]
                    },
                    {
                        $or: [
                            { description: { $regex: searchTerm, $options: 'i' } },
                            { "description.text": { $regex: searchTerm, $options: 'i' } },
                            { body: { $regex: searchTerm, $options: 'i' } },
                            { text: { $regex: searchTerm, $options: 'i' } },
                            { original_description: { $regex: searchTerm, $options: 'i' } }
                        ]
                    }
                ]
            };

            const results = await collection.find(query).toArray();

            if (results.length > 0) {
                console.log(`✅ [${collName}] Encontrado ${results.length} registro(s):`);
                results.forEach(res => {
                    console.log(`ID/Protocolo: ${res.id || res.protocolo || res._id}`);
                    console.log(`Data: ${res.created_at}`);
                    console.log(`Cidadão: ${res.citizen || (res.citizen && res.citizen.name) || 'N/A'}`);
                    const teor = res.description?.text || res.description || res.body || res.text || 'N/A';
                    console.log(`Teor: ${teor}`);
                    console.log('-----------------------------------');
                });
            }
        }

        // Se não encontrar nada, vamos tentar listar as ÚLTIMAS manifestações de forma geral para ver o que tem
        if (true) { // Sempre mostrar um sumário das últimas para contexto se nada for achado
            console.log("\n--- Resumo das últimas manifestações (geral) ---");
            for (const collName of collections) {
                const count = await db.collection(collName).countDocuments({
                    $or: [
                        { created_at: { $gte: startDate } },
                        { created_at: { $gte: '2026-03-25T00:00:00' } }
                    ]
                });
                console.log(`Collection ${collName}: ${count} registros nas últimas 2 semanas.`);
            }
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.close();
    }
}

search();
