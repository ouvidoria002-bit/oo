const fs = require('fs');

function analyzeData() {
    const rawData = fs.readFileSync('c:/Users/501379.PMDC/Desktop/eladoriaapi/demandas_luziana_completo.json', 'utf8');
    const demands = JSON.parse(rawData);

    // 1. Total de demandas, desmembrando concluídas e em aberto
    const total = demands.length;
    let concluidas = 0;
    let emAberto = 0;

    demands.forEach(d => {
        if (d.status === 'Encerrada') concluidas++;
        else emAberto++;
    });

    // 2. Indicador de categorias cadastradas, desmembrando concluídas e em aberto
    const categories = {};
    demands.forEach(d => {
        const cat = d.assunto || 'Outros';
        if (!categories[cat]) {
            categories[cat] = { total: 0, concluídas: 0, em_aberto: 0, tempos_resolucao: [] };
        }
        categories[cat].total++;
        if (d.status === 'Encerrada') {
            categories[cat].concluídas++;
            if (d.data && d.data_conclusao) {
                 // Note: The structure in JSON might be different. Let's fetch from DB to be safer or update export script.
            }
        } else {
            categories[cat].em_aberto++;
        }
    });

    // Let's RE-RUN the export with more fields (conclusion date) and actual calculation
}
