/**
 * GERADOR DE COFRE OBSIDIAN — DADOS REAIS DO MONGODB
 * Conecta no banco ColabOuvidoria.zeladoria e gera arquivos .md
 * com os dados reais: estatísticas, registros, rankings, bairros, etc.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'ColabOuvidoria';
const COLLECTION = process.env.COLLECTION_NAME || 'zeladoria';
const OUTPUT_DIR = path.join(__dirname, 'obsidian_dados');

// Garante que a pasta existe
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function escrever(nomeArquivo, conteudo) {
    const filePath = path.join(OUTPUT_DIR, nomeArquivo);
    fs.writeFileSync(filePath, conteudo, 'utf-8');
    console.log(`✅ Gerado: ${nomeArquivo}`);
}

function formatarData(d) {
    if (!d) return 'N/A';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return String(d); }
}

function formatarDataHora(d) {
    if (!d) return 'N/A';
    try { return new Date(d).toLocaleString('pt-BR'); } catch { return String(d); }
}

async function main() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        console.log('🚀 Conectado ao MongoDB:', MONGO_URI);
        const col = client.db(DB_NAME).collection(COLLECTION);

        // ─── 1. TOTAIS GERAIS ─────────────────────────────────────────────────────
        console.log('\n📊 Coletando totais gerais...');
        const totalGeral = await col.countDocuments();
        const totalZeladoria = await col.countDocuments({ dominio: 'zeladoria' });
        const primeiroDB = await col.findOne({}, { sort: { dataCriacaoIso: 1 } });
        const ultimoDB   = await col.findOne({}, { sort: { dataCriacaoIso: -1 } });
        const ultimoSync = await col.findOne({}, { sort: { last_sync_at: -1 } });

        // ─── 2. POR STATUS ────────────────────────────────────────────────────────
        console.log('📊 Coletando distribuição de status...');
        const porStatus = await col.aggregate([
            { $group: { _id: '$status_simplificado', total: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]).toArray();

        // ─── 3. POR SECRETARIA ────────────────────────────────────────────────────
        console.log('📊 Coletando ranking por secretaria...');
        const porSecretaria = await col.aggregate([
            { $group: {
                _id: '$secretaria',
                total: { $sum: 1 },
                encerradas: { $sum: { $cond: [{ $eq: ['$statusDemanda', 'Encerrada'] }, 1, 0] } },
                emAndamento: { $sum: { $cond: [{ $eq: ['$statusDemanda', 'Em andamento'] }, 1, 0] } }
            }},
            { $addFields: { taxa: {
                $cond: [{ $gt: ['$total', 0] },
                    { $round: [{ $multiply: [{ $divide: ['$encerradas', '$total'] }, 100] }, 1] }, 0]
            }}},
            { $sort: { total: -1 } }
        ]).toArray();

        // ─── 4. POR TEMA ──────────────────────────────────────────────────────────
        console.log('📊 Coletando ranking por tema...');
        const porTema = await col.aggregate([
            { $group: { _id: '$tema_especifico', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 30 }
        ]).toArray();

        // ─── 5. POR BAIRRO ────────────────────────────────────────────────────────
        console.log('📊 Coletando ranking por bairro...');
        const porBairro = await col.aggregate([
            { $match: { bairro: { $exists: true, $ne: 'NÃO INFORMADO', $ne: null } } },
            { $group: { _id: '$bairro', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 50 }
        ]).toArray();

        // ─── 6. POR MÊS ───────────────────────────────────────────────────────────
        console.log('📊 Coletando série mensal...');
        const porMes = await col.aggregate([
            { $match: { dataCriacaoIso: { $exists: true, $type: 'date' } } },
            { $group: {
                _id: {
                    ano: { $year: '$dataCriacaoIso' },
                    mes: { $month: '$dataCriacaoIso' }
                },
                total: { $sum: 1 },
                encerradas: { $sum: { $cond: [{ $eq: ['$statusDemanda', 'Encerrada'] }, 1, 0] } }
            }},
            { $sort: { '_id.ano': 1, '_id.mes': 1 } }
        ]).toArray();

        // ─── 7. MARÇO 2026 ────────────────────────────────────────────────────────
        console.log('📊 Coletando dados de Março 2026...');
        const filtroMarco = {
            dataCriacaoIso: {
                $gte: new Date('2026-03-01T00:00:00Z'),
                $lte: new Date('2026-03-31T23:59:59Z')
            }
        };
        const totalMarco = await col.countDocuments(filtroMarco);
        const marcoSecretaria = await col.aggregate([
            { $match: filtroMarco },
            { $group: {
                _id: '$secretaria',
                total: { $sum: 1 },
                encerradas: { $sum: { $cond: [{ $eq: ['$statusDemanda', 'Encerrada'] }, 1, 0] } }
            }},
            { $addFields: { taxa: {
                $cond: [{ $gt: ['$total', 0] },
                    { $round: [{ $multiply: [{ $divide: ['$encerradas', '$total'] }, 100] }, 1] }, 0]
            }}},
            { $sort: { total: -1 } }
        ]).toArray();

        const marcoBairro = await col.aggregate([
            { $match: { ...filtroMarco, bairro: { $ne: 'NÃO INFORMADO' } } },
            { $group: { _id: '$bairro', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 20 }
        ]).toArray();

        const marcoTema = await col.aggregate([
            { $match: filtroMarco },
            { $group: { _id: '$tema_especifico', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 20 }
        ]).toArray();

        const marcoStatus = await col.aggregate([
            { $match: filtroMarco },
            { $group: { _id: '$status_simplificado', total: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]).toArray();

        // ─── 8. ÚLTIMOS 100 REGISTROS ─────────────────────────────────────────────
        console.log('📊 Coletando últimos 100 registros...');
        const ultimos100 = await col.find({}, {
            projection: { id: 1, citizen: 1, bairro: 1, tema_especifico: 1, secretaria: 1, status_simplificado: 1, dataCriacaoIso: 1, address: 1 }
        }).sort({ dataCriacaoIso: -1 }).limit(100).toArray();

        // ─── 9. SEM SECRETARIA ────────────────────────────────────────────────────
        console.log('📊 Coletando registros sem secretaria...');
        const semSecretaria = await col.countDocuments({ secretaria: 'Sem Secretaria' });
        const semSecretariaExemplos = await col.find({ secretaria: 'Sem Secretaria' }, {
            projection: { id: 1, citizen: 1, bairro: 1, tema_especifico: 1, status: 1, dataCriacaoIso: 1 }
        }).sort({ dataCriacaoIso: -1 }).limit(20).toArray();

        // ─── 10. CIDADÃOS MAIS ATIVOS ────────────────────────────────────────────
        console.log('📊 Coletando cidadãos mais ativos...');
        const cidadaosAtivos = await col.aggregate([
            { $match: { citizen: { $ne: null, $exists: true } } },
            { $group: { _id: '$citizen', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 30 }
        ]).toArray();

        // ─── GERAÇÃO DOS ARQUIVOS MD ──────────────────────────────────────────────

        const nomesMeses = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                            'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

        // ── MOC ──────────────────────────────────────────────────────────────────
        const mocMd = `# 🗄️ MOC — Dados do Banco de Dados
> Gerado automaticamente em: **${new Date().toLocaleString('pt-BR')}**  
> Banco: \`${DB_NAME}\` | Coleção: \`${COLLECTION}\` | URI: \`${MONGO_URI}\`

---

## 📊 Resumo Geral

| Métrica | Valor |
|---------|-------|
| **Total de registros** | ${totalGeral.toLocaleString('pt-BR')} |
| **Domínio zeladoria** | ${totalZeladoria.toLocaleString('pt-BR')} |
| **Sem Secretaria** | ${semSecretaria.toLocaleString('pt-BR')} |
| **Primeiro registro** | ${formatarData(primeiroDB?.dataCriacaoIso || primeiroDB?.created_at)} |
| **Último registro** | ${formatarDataHora(ultimoDB?.dataCriacaoIso || ultimoDB?.created_at)} |
| **Última sincronização** | ${formatarDataHora(ultimoSync?.last_sync_at)} |

---

## 🗂️ Arquivos Deste Cofre

- [[01 - Visao Geral e Estatisticas]] — Totais, status e distribuição geral
- [[02 - Ranking por Secretaria]] — Performance de cada secretaria (todos os períodos)
- [[03 - Ranking por Tema]] — Top 30 temas/categorias com mais manifestações
- [[04 - Ranking por Bairro]] — Top 50 bairros com mais ocorrências
- [[05 - Serie Mensal]] — Evolução mês a mês de manifestações
- [[06 - Marco 2026 - Analise Completa]] — Análise detalhada de Março 2026
- [[07 - Ultimos 100 Registros]] — Os 100 protocolos mais recentes do banco
- [[08 - Registros Sem Secretaria]] — Auditoria de registros não classificados
- [[09 - Cidadaos Mais Ativos]] — Top 30 cidadãos com mais manifestações

---

> **Nota:** Para atualizar estes dados, execute:
> \`\`\`bash
> node gerar_obsidian_dados.js
> \`\`\`
`;
        escrever('00 - MOC Dados do Banco.md', mocMd);

        // ── 1. VISÃO GERAL ────────────────────────────────────────────────────────
        const linhasStatus = porStatus.map(s =>
            `| ${s._id || 'N/A'} | ${s.total.toLocaleString('pt-BR')} | ${((s.total/totalGeral)*100).toFixed(1)}% |`
        ).join('\n');

        const visaoGeralMd = `# 📊 Visão Geral e Estatísticas
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 🔢 Totais do Banco

| Métrica | Valor |
|---------|-------|
| **Total de registros** | ${totalGeral.toLocaleString('pt-BR')} |
| **Domínio zeladoria** | ${totalZeladoria.toLocaleString('pt-BR')} |
| **Sem Secretaria** | ${semSecretaria.toLocaleString('pt-BR')} |
| **ID mais antigo** | #${primeiroDB?.id || 'N/A'} |
| **ID mais recente** | #${ultimoDB?.id || 'N/A'} |
| **Primeiro criado em** | ${formatarDataHora(primeiroDB?.dataCriacaoIso || primeiroDB?.created_at)} |
| **Último criado em** | ${formatarDataHora(ultimoDB?.dataCriacaoIso || ultimoDB?.created_at)} |
| **Última sync** | ${formatarDataHora(ultimoSync?.last_sync_at)} |

---

## 🟡 Distribuição por Status

| Status | Quantidade | % do Total |
|--------|-----------|------------|
${linhasStatus}
| **TOTAL** | **${totalGeral.toLocaleString('pt-BR')}** | **100%** |
`;
        escrever('01 - Visao Geral e Estatisticas.md', visaoGeralMd);

        // ── 2. RANKING POR SECRETARIA ─────────────────────────────────────────────
        const linhasSecretaria = porSecretaria.map((s, i) =>
            `| ${i+1} | ${s._id || 'Sem Secretaria'} | ${s.total.toLocaleString('pt-BR')} | ${s.encerradas.toLocaleString('pt-BR')} | ${s.emAndamento.toLocaleString('pt-BR')} | ${s.taxa}% |`
        ).join('\n');

        const secretariaMd = `# 🏢 Ranking por Secretaria — Todos os Períodos
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Performance por Secretaria

| # | Secretaria | Total | Encerradas | Em Andamento | Taxa Resolução |
|---|-----------|-------|-----------|--------------|---------------|
${linhasSecretaria}

---

> **Total geral:** ${totalGeral.toLocaleString('pt-BR')} registros
`;
        escrever('02 - Ranking por Secretaria.md', secretariaMd);

        // ── 3. RANKING POR TEMA ───────────────────────────────────────────────────
        const linhasTema = porTema.map((t, i) =>
            `| ${i+1} | ${t._id || 'Outros / Zeladoria'} | ${t.total.toLocaleString('pt-BR')} | ${((t.total/totalGeral)*100).toFixed(1)}% |`
        ).join('\n');

        const temaMd = `# 🗂️ Ranking por Tema — Top 30
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Temas Mais Recorrentes

| # | Tema | Ocorrências | % do Total |
|---|------|------------|------------|
${linhasTema}
`;
        escrever('03 - Ranking por Tema.md', temaMd);

        // ── 4. RANKING POR BAIRRO ─────────────────────────────────────────────────
        const linhasBairro = porBairro.map((b, i) =>
            `| ${i+1} | ${b._id || 'NÃO INFORMADO'} | ${b.total.toLocaleString('pt-BR')} | ${((b.total/totalGeral)*100).toFixed(1)}% |`
        ).join('\n');

        const bairroMd = `# 🏘️ Ranking por Bairro — Top 50
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Bairros com Mais Manifestações

| # | Bairro | Ocorrências | % do Total |
|---|--------|------------|------------|
${linhasBairro}
`;
        escrever('04 - Ranking por Bairro.md', bairroMd);

        // ── 5. SÉRIE MENSAL ───────────────────────────────────────────────────────
        const linhasMes = porMes.map(m => {
            const taxa = m.total > 0 ? ((m.encerradas / m.total) * 100).toFixed(1) : '0.0';
            return `| ${m._id.ano} | ${nomesMeses[m._id.mes]} | ${m.total.toLocaleString('pt-BR')} | ${m.encerradas.toLocaleString('pt-BR')} | ${taxa}% |`;
        }).join('\n');

        const serieMd = `# 📅 Série Mensal — Evolução de Manifestações
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Manifestações por Mês

| Ano | Mês | Total | Encerradas | Taxa Resolução |
|-----|-----|-------|-----------|---------------|
${linhasMes}

---

> **Total acumulado:** ${totalGeral.toLocaleString('pt-BR')} registros
`;
        escrever('05 - Serie Mensal.md', serieMd);

        // ── 6. MARÇO 2026 ─────────────────────────────────────────────────────────
        const marcoStatusLinhas = marcoStatus.map(s =>
            `| ${s._id || 'N/A'} | ${s.total.toLocaleString('pt-BR')} | ${totalMarco > 0 ? ((s.total/totalMarco)*100).toFixed(1) : '0'}% |`
        ).join('\n');

        const marcoSecLinhas = marcoSecretaria.map((s, i) =>
            `| ${i+1} | ${s._id || 'Sem Secretaria'} | ${s.total.toLocaleString('pt-BR')} | ${s.encerradas.toLocaleString('pt-BR')} | ${s.taxa}% |`
        ).join('\n');

        const marcoTemaLinhas = marcoTema.map((t, i) =>
            `| ${i+1} | ${t._id || 'Outros'} | ${t.total.toLocaleString('pt-BR')} |`
        ).join('\n');

        const marcoBairroLinhas = marcoBairro.map((b, i) =>
            `| ${i+1} | ${b._id || 'N/A'} | ${b.total.toLocaleString('pt-BR')} |`
        ).join('\n');

        const marcoMd = `# 📅 Março 2026 — Análise Completa
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}  
> Período: **01/03/2026 a 31/03/2026**

---

## 🔢 Totais de Março 2026

| Métrica | Valor |
|---------|-------|
| **Total de manifestações** | ${totalMarco.toLocaleString('pt-BR')} |

---

## 🟡 Status em Março 2026

| Status | Quantidade | % |
|--------|-----------|---|
${marcoStatusLinhas}
| **TOTAL** | **${totalMarco.toLocaleString('pt-BR')}** | **100%** |

---

## 🏢 Performance por Secretaria — Março 2026

| # | Secretaria | Total | Encerradas | Taxa Resolução |
|---|-----------|-------|-----------|---------------|
${marcoSecLinhas}

---

## 🗂️ Temas Mais Recorrentes — Março 2026

| # | Tema | Ocorrências |
|---|------|------------|
${marcoTemaLinhas}

---

## 🏘️ Bairros com Mais Manifestações — Março 2026

| # | Bairro | Ocorrências |
|---|--------|------------|
${marcoBairroLinhas}
`;
        escrever('06 - Marco 2026 - Analise Completa.md', marcoMd);

        // ── 7. ÚLTIMOS 100 REGISTROS ──────────────────────────────────────────────
        const linhasUltimos = ultimos100.map(r =>
            `| #${r.id} | ${formatarData(r.dataCriacaoIso)} | ${r.citizen || 'N/A'} | ${r.bairro || 'N/A'} | ${r.tema_especifico || 'N/A'} | ${r.secretaria || 'N/A'} | ${r.status_simplificado || 'N/A'} |`
        ).join('\n');

        const ultimosMd = `# 🕐 Últimos 100 Registros
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

| Protocolo | Data | Cidadão | Bairro | Tema | Secretaria | Status |
|-----------|------|---------|--------|------|-----------|--------|
${linhasUltimos}
`;
        escrever('07 - Ultimos 100 Registros.md', ultimosMd);

        // ── 8. SEM SECRETARIA ─────────────────────────────────────────────────────
        const linhasSemSec = semSecretariaExemplos.map(r =>
            `| #${r.id} | ${formatarData(r.dataCriacaoIso)} | ${r.citizen || 'N/A'} | ${r.bairro || 'N/A'} | ${r.tema_especifico || 'N/A'} | ${r.status || 'N/A'} |`
        ).join('\n');

        const semSecMd = `# ⚠️ Registros Sem Secretaria — Auditoria
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📌 Resumo

| Métrica | Valor |
|---------|-------|
| **Total sem secretaria** | ${semSecretaria.toLocaleString('pt-BR')} |
| **% do total geral** | ${((semSecretaria/totalGeral)*100).toFixed(1)}% |

---

## 📋 Últimos 20 Registros Sem Secretaria

| Protocolo | Data | Cidadão | Bairro | Tema | Status |
|-----------|------|---------|--------|------|--------|
${linhasSemSec}

---

> **Causa:** Registros com \`branch.id = null\` e \`branch.name = null\` na API Colab.  
> **Solução:** Aguardar atribuição manual pela secretaria ou reprocessar após categorização.
`;
        escrever('08 - Registros Sem Secretaria.md', semSecMd);

        // ── 9. CIDADÃOS MAIS ATIVOS ───────────────────────────────────────────────
        const linhasCidadaos = cidadaosAtivos.map((c, i) =>
            `| ${i+1} | ${c._id} | ${c.total.toLocaleString('pt-BR')} |`
        ).join('\n');

        const cidadaosMd = `# 👥 Cidadãos Mais Ativos — Top 30
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

| # | Cidadão | Total de Manifestações |
|---|---------|----------------------|
${linhasCidadaos}
`;
        escrever('09 - Cidadaos Mais Ativos.md', cidadaosMd);

        console.log('\n🎉 CONCLUÍDO! Todos os arquivos .md foram gerados em:');
        console.log('   📁', OUTPUT_DIR);
        console.log('\n📋 Arquivos gerados:');
        fs.readdirSync(OUTPUT_DIR).forEach(f => console.log('   •', f));

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.close();
    }
}

main();
