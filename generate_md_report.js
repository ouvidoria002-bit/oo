const fs = require('fs');

function generateMarkdown() {
    const demands = JSON.parse(fs.readFileSync('c:/Users/501379.PMDC/Desktop/eladoriaapi/demandas_luziana_completo.json', 'utf8'));

    let md = `# Levantamento de Zeladoria - Subprefeita Luziana\n\n`;
    md += `**Data do Relatório:** ${new Date().toLocaleString('pt-BR')}\n`;
    md += `**Total de Demandas:** ${demands.length}\n`;
    
    const inicio = new Date(demands[0].data).toLocaleDateString('pt-BR');
    const fim = new Date(demands[demands.length - 1].data).toLocaleDateString('pt-BR');
    md += `**Período:** ${inicio} a ${fim}\n\n`;

    // Resumo por Status
    const statusCount = {};
    demands.forEach(d => statusCount[d.status] = (statusCount[d.status] || 0) + 1);
    
    md += `## Resumo por Status\n\n`;
    md += `| Status | Quantidade |\n`;
    md += `| :--- | :--- |\n`;
    for (const s in statusCount) {
        md += `| ${s} | ${statusCount[s]} |\n`;
    }
    md += `\n`;

    // Resumo por Secretaria
    const secCount = {};
    demands.forEach(d => {
        const s = d.secretaria || 'N/A';
        secCount[s] = (secCount[s] || 0) + 1;
    });

    md += `## Resumo por Secretaria\n\n`;
    md += `| Secretaria | Quantidade |\n`;
    md += `| :--- | :--- |\n`;
    for (const s in secCount) {
        md += `| ${s} | ${secCount[s]} |\n`;
    }
    md += `\n`;

    md += `## Lista de Demandas\n\n`;
    md += `| ID | Data | Status | Secretaria | Bairro | Assunto |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    
    demands.forEach(d => {
        const dataStr = new Date(d.data).toLocaleDateString('pt-BR');
        md += `| ${d.id} | ${dataStr} | ${d.status} | ${d.secretaria || 'N/A'} | ${d.bairro || 'N/A'} | ${d.assunto || 'N/A'} |\n`;
    });

    fs.writeFileSync('c:/Users/501379.PMDC/Desktop/asa_v2/obsidian_vault/07 - Relatorios/Levantamento Zeladoria - Luziana.md', md);
    console.log('Relatório Markdown gerado com sucesso.');
}

generateMarkdown();
