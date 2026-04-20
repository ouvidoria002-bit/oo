const fs = require('fs');

function generateFinalReport() {
    const stats = JSON.parse(fs.readFileSync('c:/Users/501379.PMDC/Desktop/eladoriaapi/luziana_final_stats.json', 'utf8'));

    let md = `# Relatório Analítico de Zeladoria - Subprefeita Luziana\n\n`;
    md += `> [!NOTE]\n`;
    md += `> Relatório consolidado com foco em indicadores de performance e volumetria.\n`;
    md += `> **Data de Emissão:** ${new Date().toLocaleString('pt-BR')}\n`;
    md += `> **Período de Dados:** 06/01/2026 - 20/04/2026\n\n`;

    md += `## 📊 Resumo Executivo\n\n`;
    md += `| Indicador | Valor |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Total de Demandas** | ${stats.total} |\n`;
    md += `| **Concluídas** | ${stats.concluidas} (${((stats.concluidas/stats.total)*100).toFixed(1)}%) |\n`;
    md += `| **Em Aberto** | ${stats.em_aberto} (${((stats.em_aberto/stats.total)*100).toFixed(1)}%) |\n\n`;

    md += `### Distribuição de Status\n\n`;
    md += `\`\`\`mermaid\npie title Status das Demandas\n    "Concluídas" : ${stats.concluidas}\n    "Em Aberto" : ${stats.em_aberto}\n\`\`\`\n\n`;

    md += `## 📂 Indicadores por Categoria\n\n`;
    md += `O gráfico abaixo apresenta as principais categorias e a relação entre demandas concluídas e pendentes.\n\n`;
    
    // Gráfico de Barras por Categoria (Top 10)
    const topCats = [...stats.categorias].sort((a, b) => b.total - a.total).slice(0, 10);
    
    md += `\`\`\`mermaid\ngraph BT\n`;
    topCats.forEach((c, i) => {
        const safeName = c.nome.replace(/[/]/g, '-');
        md += `    Cat${i}["${c.nome}"] --> Val${i}("${c.total} total")\n`;
        md += `    style Cat${i} fill:#f9f,stroke:#333,stroke-width:2px\n`;
    });
    md += `\`\`\`\n\n`;

    md += `### Tabela Analítica de Categorias\n\n`;
    md += `| Categoria | Total | Concluídas | Em Aberto | Volumetria (%) |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: |\n`;
    
    stats.categorias.sort((a,b) => b.total - a.total).forEach(c => {
        md += `| ${c.nome} | ${c.total} | ${c.concluidas} | ${c.em_aberto} | ${c.volumetria_percent}% |\n`;
    });
    md += `\n`;

    md += `## ⏱️ Performance de Atendimento\n\n`;
    md += `Indicador de tempo médio (em dias) calculado a partir da data de criação até a data de conclusão.\n\n`;

    md += `| Categoria | Tempo Médio (Dias) | Mínimo | Máximo |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    
    stats.categorias.filter(c => c.tempo_medio_dias !== "N/A").sort((a,b) => parseFloat(a.tempo_medio_dias) - parseFloat(b.tempo_medio_dias)).forEach(c => {
        md += `| ${c.nome} | **${c.tempo_medio_dias}** | ${c.tempo_min_dias} | ${c.tempo_max_dias} |\n`;
    });
    md += `\n`;

    md += `### Insight de Performance\n\n`;
    const rapidas = stats.categorias.filter(c => c.tempo_medio_dias !== "N/A").sort((a,b) => parseFloat(a.tempo_medio_dias) - parseFloat(b.tempo_medio_dias))[0];
    const lentas = stats.categorias.filter(c => c.tempo_medio_dias !== "N/A").sort((a,b) => parseFloat(b.tempo_medio_dias) - parseFloat(a.tempo_medio_dias))[0];
    
    if (rapidas && lentas) {
        md += `> [!TIP]\n`;
        md += `> - **Maior Eficiência:** \`${rapidas.nome}\` com média de ${rapidas.tempo_medio_dias} dias.\n`;
        md += `> - **Gargalo Identificado:** \`${lentas.nome}\` com média de ${lentas.tempo_medio_dias} dias.\n\n`;
    }

    fs.writeFileSync('c:/Users/501379.PMDC/Desktop/asa_v2/obsidian_vault/07 - Relatorios/Relatório Analítico Zeladoria - Luziana.md', md);
    console.log('Relatório Analítico final gerado com sucesso.');
}

generateFinalReport();
