const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

async function analyze() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('ColabOuvidoria');
        const collection = db.collection('zeladoria');

        const query = { citizen: { $regex: 'Luziana', $options: 'i' } };
        const demands = await collection.find(query).toArray();

        const stats = {
            total: demands.length,
            concluidas: 0,
            em_aberto: 0,
            categorias: {}
        };

        demands.forEach(d => {
            const status = d.statusDemanda === 'Encerrada' ? 'concluidas' : 'em_aberto';
            stats[status]++;

            const cat = d.assunto || d.tema_especifico || 'Outros';
            if (!stats.categorias[cat]) {
                stats.categorias[cat] = { total: 0, concluidas: 0, em_aberto: 0, tempos_dias: [] };
            }

            stats.categorias[cat].total++;
            stats.categorias[cat][status]++;

            // Se for concluída, tentamos calcular o tempo
            if (d.statusDemanda === 'Encerrada') {
                const dataCriacao = d.dataCriacaoIso || d.created_at;
                const dataConclusao = d.dataConclusaoIso || d.finished_at || d.updated_at;

                if (dataCriacao && dataConclusao) {
                    const inicio = new Date(dataCriacao);
                    const fim = new Date(dataConclusao);
                    
                    if (!isNaN(inicio) && !isNaN(fim)) {
                        const diffMs = fim - inicio;
                        const diffDias = diffMs / (1000 * 60 * 60 * 24);
                        if (diffDias >= 0) {
                            stats.categorias[cat].tempos_dias.push(diffDias);
                        }
                    }
                }
            }
        });

        const reportData = {
            total: stats.total,
            concluidas: stats.concluidas,
            em_aberto: stats.em_aberto,
            categorias: []
        };

        for (const cat in stats.categorias) {
            const c = stats.categorias[cat];
            const sortedTempos = [...c.tempos_dias].sort((a, b) => a - b);
            const somaTempos = sortedTempos.reduce((a, b) => a + b, 0);
            const media = sortedTempos.length > 0 ? (somaTempos / sortedTempos.length).toFixed(2) : "N/A";
            
            reportData.categorias.push({
                nome: cat,
                total: c.total,
                concluidas: c.concluidas,
                em_aberto: c.em_aberto,
                tempo_medio_dias: media,
                tempo_min_dias: sortedTempos.length > 0 ? sortedTempos[0].toFixed(2) : "N/A",
                tempo_max_dias: sortedTempos.length > 0 ? sortedTempos[sortedTempos.length-1].toFixed(2) : "N/A",
                volumetria_percent: ((c.total / stats.total) * 100).toFixed(1)
            });
        }

        fs.writeFileSync('luziana_final_stats.json', JSON.stringify(reportData, null, 2));
        console.log('Análise (v2) concluída e salva em luziana_final_stats.json');

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

analyze();
