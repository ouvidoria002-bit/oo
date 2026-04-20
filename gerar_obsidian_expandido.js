/**
 * GERADOR EXPANDIDO — COFRE OBSIDIAN COM DADOS REAIS DO MONGODB
 * Gera arquivos .md adicionais com análises profundas do banco
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME   = process.env.DB_NAME   || 'ColabOuvidoria';
const COLLECTION = process.env.COLLECTION_NAME || 'zeladoria';
const OUTPUT_DIR = path.join(__dirname, 'obsidian_dados');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function escrever(nome, conteudo) {
    fs.writeFileSync(path.join(OUTPUT_DIR, nome), conteudo, 'utf-8');
    console.log(`✅ ${nome}`);
}

function fmtData(d) {
    if (!d) return 'N/A';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return 'N/A'; }
}

function fmtDH(d) {
    if (!d) return 'N/A';
    try { return new Date(d).toLocaleString('pt-BR'); } catch { return 'N/A'; }
}

const DIAS = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

async function main() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        console.log('🚀 Conectado ao MongoDB:', MONGO_URI);
        const col = client.db(DB_NAME).collection(COLLECTION);

        const totalGeral = await col.countDocuments();
        console.log(`📦 Total de registros: ${totalGeral.toLocaleString('pt-BR')}\n`);

        // ══════════════════════════════════════════════════════════════════════════
        // 10 — DIA DA SEMANA
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Analisando por dia da semana...');
        const porDiaSemana = await col.aggregate([
            { $match: { dataCriacaoIso: { $exists: true, $type: 'date' } } },
            { $group: {
                _id: { $dayOfWeek: '$dataCriacaoIso' },
                total: { $sum: 1 },
                encerradas: { $sum: { $cond: [{ $eq: ['$statusDemanda','Encerrada'] }, 1, 0] } }
            }},
            { $sort: { '_id': 1 } }
        ]).toArray();

        const linhasDia = porDiaSemana.map(d => {
            const taxa = d.total > 0 ? ((d.encerradas/d.total)*100).toFixed(1) : '0.0';
            const pct  = ((d.total/totalGeral)*100).toFixed(1);
            const bar  = '█'.repeat(Math.round(d.total / (totalGeral/70)));
            return `| ${DIAS[d._id - 1]} | ${d.total.toLocaleString('pt-BR')} | ${pct}% | ${taxa}% | \`${bar}\` |`;
        }).join('\n');

        escrever('10 - Distribuicao por Dia da Semana.md', `# 📅 Distribuição por Dia da Semana
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Manifestações por Dia da Semana

| Dia | Total | % do Total | Taxa Resolução | Volume |
|-----|-------|-----------|----------------|--------|
${linhasDia}

---

> **Base:** ${totalGeral.toLocaleString('pt-BR')} registros com data válida.
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 11 — HORA DO DIA
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Analisando por hora do dia...');
        const porHora = await col.aggregate([
            { $match: { dataCriacaoIso: { $exists: true, $type: 'date' } } },
            { $group: {
                _id: { $hour: '$dataCriacaoIso' },
                total: { $sum: 1 }
            }},
            { $sort: { '_id': 1 } }
        ]).toArray();

        const maxHora = Math.max(...porHora.map(h => h.total));
        const linhasHora = porHora.map(h => {
            const pct  = ((h.total/totalGeral)*100).toFixed(1);
            const bar  = '█'.repeat(Math.round((h.total/maxHora)*30));
            const hora = String(h._id).padStart(2,'0') + ':00';
            return `| ${hora} | ${h.total.toLocaleString('pt-BR')} | ${pct}% | \`${bar}\` |`;
        }).join('\n');

        escrever('11 - Distribuicao por Hora do Dia.md', `# 🕐 Distribuição por Hora do Dia
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Horários de Abertura de Manifestações

| Hora | Total | % | Volume |
|------|-------|---|--------|
${linhasHora}

---

> Horários em **UTC-3 (Brasília)**. Base: ${totalGeral.toLocaleString('pt-BR')} registros.
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 12 — TEMPO MÉDIO DE RESOLUÇÃO POR SECRETARIA
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Calculando tempo médio de resolução...');
        const tempoResolucao = await col.aggregate([
            { $match: {
                statusDemanda: 'Encerrada',
                dataCriacaoIso: { $exists: true, $type: 'date' },
                updated_at: { $exists: true }
            }},
            { $addFields: {
                updatedDate: { $toDate: '$updated_at' },
                diffMs: { $subtract: [{ $toDate: '$updated_at' }, '$dataCriacaoIso'] }
            }},
            { $match: { diffMs: { $gt: 0 } } },
            { $group: {
                _id: '$secretaria',
                mediaMs:  { $avg: '$diffMs' },
                medianaMs: { $avg: '$diffMs' },
                totalEncerradas: { $sum: 1 },
                minMs: { $min: '$diffMs' },
                maxMs: { $max: '$diffMs' }
            }},
            { $sort: { mediaMs: 1 } }
        ]).toArray();

        const msToDias = ms => (ms / (1000*60*60*24)).toFixed(1);

        const linhasTempo = tempoResolucao.map((t, i) => {
            return `| ${i+1} | ${t._id || 'Sem Secretaria'} | ${msToDias(t.mediaMs)} dias | ${msToDias(t.minMs)} dias | ${msToDias(t.maxMs)} dias | ${t.totalEncerradas.toLocaleString('pt-BR')} |`;
        }).join('\n');

        escrever('12 - Tempo Medio de Resolucao.md', `# ⏱️ Tempo Médio de Resolução por Secretaria
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}  
> Considera apenas registros com \`statusDemanda = "Encerrada"\` e data de atualização válida.

---

## 📊 Tempo de Resolução (Criação → Atualização Final)

| # | Secretaria | Média | Mínimo | Máximo | Total Encerradas |
|---|-----------|-------|--------|--------|-----------------|
${linhasTempo}

---

> **Atenção:** O tempo calculado é da criação até a última atualização do registro (campo \`updated_at\`).
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 13 — PIORES BAIRROS (MENOR TAXA DE RESOLUÇÃO)
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Identificando piores bairros...');
        const pioresBairros = await col.aggregate([
            { $match: { bairro: { $nin: ['NÃO INFORMADO', null, ''] } } },
            { $group: {
                _id: '$bairro',
                total: { $sum: 1 },
                encerradas: { $sum: { $cond: [{ $eq: ['$statusDemanda','Encerrada'] }, 1, 0] } },
                emAberto: { $sum: { $cond: [{ $eq: ['$status_simplificado','Em Aberto'] }, 1, 0] } }
            }},
            { $match: { total: { $gte: 20 } } }, // só bairros com volume relevante
            { $addFields: { taxa: {
                $round: [{ $multiply: [{ $divide: ['$encerradas','$total'] }, 100] }, 1]
            }}},
            { $sort: { taxa: 1 } },
            { $limit: 30 }
        ]).toArray();

        const linhasPiores = pioresBairros.map((b, i) =>
            `| ${i+1} | ${b._id} | ${b.total.toLocaleString('pt-BR')} | ${b.encerradas.toLocaleString('pt-BR')} | ${b.emAberto.toLocaleString('pt-BR')} | ${b.taxa}% |`
        ).join('\n');

        escrever('13 - Piores Bairros Taxa Resolucao.md', `# 🔴 Piores Bairros — Menor Taxa de Resolução
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}  
> Apenas bairros com **20+ manifestações**. Ordenado da pior para a melhor taxa.

---

## 📊 Bairros com Maior Represamento

| # | Bairro | Total | Encerradas | Em Aberto | Taxa Resolução |
|---|--------|-------|-----------|----------|---------------|
${linhasPiores}

---

> **Interpretação:** Taxa de resolução baixa = maior gargalo operacional neste bairro.
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 14 — TEMA PREDOMINANTE POR BAIRRO (TOP 20 BAIRROS)
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Mapeando tema predominante por bairro...');
        const topBairros = await col.aggregate([
            { $match: { bairro: { $nin: ['NÃO INFORMADO', null, ''] } } },
            { $group: { _id: '$bairro', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 25 }
        ]).toArray();

        const linhasBairroTema = [];
        for (const b of topBairros) {
            const top = await col.aggregate([
                { $match: { bairro: b._id } },
                { $group: { _id: '$tema_especifico', cnt: { $sum: 1 } } },
                { $sort: { cnt: -1 } },
                { $limit: 1 }
            ]).toArray();
            const temaPred = top[0]?._id || 'N/A';
            const cntPred  = top[0]?.cnt || 0;
            linhasBairroTema.push(`| ${b._id} | ${b.total.toLocaleString('pt-BR')} | ${temaPred} | ${cntPred} |`);
        }

        escrever('14 - Tema Predominante por Bairro.md', `# 🏘️ Tema Predominante por Bairro — Top 25
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Perfil de Demanda por Bairro

| Bairro | Total Manifestações | Tema Predominante | Ocorrências do Tema |
|--------|--------------------|--------------------|---------------------|
${linhasBairroTema.join('\n')}
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 15 — TAXA DE RECUSA POR SECRETARIA
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Calculando taxa de recusa por secretaria...');
        const taxaRecusa = await col.aggregate([
            { $group: {
                _id: '$secretaria',
                total: { $sum: 1 },
                recusados: { $sum: { $cond: [{ $eq: ['$status_simplificado','Recusado'] }, 1, 0] } },
                indeferidos: { $sum: { $cond: [{ $eq: ['$status_simplificado','Indeferido'] }, 1, 0] } }
            }},
            { $match: { total: { $gte: 10 } } },
            { $addFields: {
                taxaRecusa:     { $round: [{ $multiply: [{ $divide: ['$recusados','$total'] }, 100] }, 1] },
                taxaIndeferido: { $round: [{ $multiply: [{ $divide: ['$indeferidos','$total'] }, 100] }, 1] },
                taxaNegativa:   { $round: [{ $multiply: [{ $divide: [{ $add: ['$recusados','$indeferidos'] }, '$total'] }, 100] }, 1] }
            }},
            { $sort: { taxaNegativa: -1 } }
        ]).toArray();

        const linhasRecusa = taxaRecusa.map((r, i) =>
            `| ${i+1} | ${r._id || 'Sem Secretaria'} | ${r.total.toLocaleString('pt-BR')} | ${r.recusados} | ${r.indeferidos} | ${r.taxaRecusa}% | ${r.taxaIndeferido}% | **${r.taxaNegativa}%** |`
        ).join('\n');

        escrever('15 - Taxa de Recusa por Secretaria.md', `# 🚫 Taxa de Recusa e Indeferimento por Secretaria
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Negativação por Secretaria

| # | Secretaria | Total | Recusados | Indeferidos | % Recusa | % Indeferido | % Negativo Total |
|---|-----------|-------|----------|------------|---------|-------------|-----------------|
${linhasRecusa}

---

> **Taxa Negativa Total** = Recusados + Indeferidos sobre o total da secretaria.
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 16 — AGING: DEMANDAS EM ABERTO HÁ MAIS TEMPO
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Calculando aging (demandas mais antigas em aberto)...');
        const agora = new Date();
        const aging = await col.aggregate([
            { $match: {
                status_simplificado: 'Em Aberto',
                dataCriacaoIso: { $exists: true, $type: 'date' }
            }},
            { $addFields: {
                diasAberto: { $divide: [{ $subtract: [agora, '$dataCriacaoIso'] }, 86400000] }
            }},
            { $sort: { diasAberto: -1 } },
            { $limit: 50 },
            { $project: {
                id: 1, citizen: 1, bairro: 1, tema_especifico: 1,
                secretaria: 1, status: 1, dataCriacaoIso: 1, diasAberto: 1, address: 1
            }}
        ]).toArray();

        // Distribuição por faixa de aging
        const agingFaixas = await col.aggregate([
            { $match: { status_simplificado: 'Em Aberto', dataCriacaoIso: { $exists: true, $type: 'date' } } },
            { $addFields: { diasAberto: { $divide: [{ $subtract: [agora, '$dataCriacaoIso'] }, 86400000] } } },
            { $bucket: {
                groupBy: '$diasAberto',
                boundaries: [0, 7, 15, 30, 60, 90, 180, 365, 99999],
                default: 'Outros',
                output: { total: { $sum: 1 } }
            }}
        ]).toArray();

        const faixasNomes = { 0:'0-7 dias', 7:'8-15 dias', 15:'16-30 dias', 30:'31-60 dias', 60:'61-90 dias', 90:'91-180 dias', 180:'181-365 dias', 365:'+365 dias', Outros:'Outros' };
        const linhasFaixas = agingFaixas.map(f =>
            `| ${faixasNomes[f._id] || f._id} | ${f.total.toLocaleString('pt-BR')} |`
        ).join('\n');

        const linhasAging = aging.map(r => {
            const dias = Math.round(r.diasAberto);
            return `| #${r.id} | ${fmtData(r.dataCriacaoIso)} | **${dias} dias** | ${r.citizen || 'N/A'} | ${r.bairro || 'N/A'} | ${r.tema_especifico || 'N/A'} | ${r.secretaria || 'N/A'} |`;
        }).join('\n');

        escrever('16 - Aging Demandas em Aberto.md', `# ⏳ Aging — Demandas em Aberto há Mais Tempo
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}  
> Referência: ${fmtDH(agora)}

---

## 📊 Distribuição por Faixa de Tempo em Aberto

| Faixa | Quantidade |
|-------|-----------|
${linhasFaixas}

---

## 🔴 Top 50 Protocolos Mais Antigos em Aberto

| Protocolo | Aberto em | Dias Aberto | Cidadão | Bairro | Tema | Secretaria |
|-----------|----------|------------|---------|--------|------|-----------|
${linhasAging}
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 17 — TEMAS COM MAIS DEMANDAS REPRESADAS
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Analisando temas represados...');
        const temasRepresados = await col.aggregate([
            { $group: {
                _id: '$tema_especifico',
                total: { $sum: 1 },
                emAberto: { $sum: { $cond: [{ $eq: ['$status_simplificado','Em Aberto'] }, 1, 0] } },
                encerradas: { $sum: { $cond: [{ $eq: ['$statusDemanda','Encerrada'] }, 1, 0] } }
            }},
            { $match: { total: { $gte: 10 } } },
            { $addFields: {
                taxa: { $round: [{ $multiply: [{ $divide: ['$encerradas','$total'] }, 100] }, 1] },
                pctAberto: { $round: [{ $multiply: [{ $divide: ['$emAberto','$total'] }, 100] }, 1] }
            }},
            { $sort: { emAberto: -1 } },
            { $limit: 30 }
        ]).toArray();

        const linhasRepresados = temasRepresados.map((t, i) =>
            `| ${i+1} | ${t._id || 'N/A'} | ${t.total.toLocaleString('pt-BR')} | ${t.emAberto.toLocaleString('pt-BR')} | ${t.pctAberto}% | ${t.taxa}% |`
        ).join('\n');

        escrever('17 - Temas Represados.md', `# 🔥 Temas com Mais Demandas Represadas
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Temas Ordenados por Volume em Aberto

| # | Tema | Total | Em Aberto | % Em Aberto | Taxa Resolução |
|---|------|-------|----------|------------|---------------|
${linhasRepresados}
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 18 — COMPARATIVO MENSAL FEVEREIRO vs MARÇO 2026
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Gerando comparativo Feb vs Mar 2026...');

        async function dadosMes(inicio, fim, nome) {
            const filtro = { dataCriacaoIso: { $gte: new Date(inicio), $lte: new Date(fim) } };
            const total = await col.countDocuments(filtro);
            const status = await col.aggregate([
                { $match: filtro },
                { $group: { _id: '$status_simplificado', total: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ]).toArray();
            const secretarias = await col.aggregate([
                { $match: filtro },
                { $group: {
                    _id: '$secretaria',
                    total: { $sum: 1 },
                    encerradas: { $sum: { $cond: [{ $eq: ['$statusDemanda','Encerrada'] }, 1, 0] } }
                }},
                { $addFields: { taxa: { $round: [{ $multiply: [{ $divide: ['$encerradas','$total'] }, 100] }, 1] }}},
                { $sort: { total: -1 } }
            ]).toArray();
            const temas = await col.aggregate([
                { $match: filtro },
                { $group: { _id: '$tema_especifico', total: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: 10 }
            ]).toArray();
            return { nome, total, status, secretarias, temas };
        }

        const jan2026 = await dadosMes('2026-01-01T00:00:00Z','2026-01-31T23:59:59Z','Janeiro/2026');
        const fev2026 = await dadosMes('2026-02-01T00:00:00Z','2026-02-28T23:59:59Z','Fevereiro/2026');
        const mar2026 = await dadosMes('2026-03-01T00:00:00Z','2026-03-31T23:59:59Z','Março/2026');
        const abr2026 = await dadosMes('2026-04-01T00:00:00Z','2026-04-13T23:59:59Z','Abril/2026 (parcial)');

        const meses = [jan2026, fev2026, mar2026, abr2026];

        // Linha de totais
        const linhaTotais = `| Mês | ${meses.map(m => `**${m.nome}**`).join(' | ')} |\n|-----|-${meses.map(()=>'------').join('-|-')}|\n| Total Manifestações | ${meses.map(m => m.total.toLocaleString('pt-BR')).join(' | ')} |`;

        // Status por mês
        const allStatus = ['Em Aberto','Concluídas','Indeferido','Recusado','Outros'];
        const linhasStatusComp = allStatus.map(s => {
            const vals = meses.map(m => {
                const found = m.status.find(x => x._id === s);
                return found ? `${found.total.toLocaleString('pt-BR')} (${m.total > 0 ? ((found.total/m.total)*100).toFixed(0) : 0}%)` : '0';
            });
            return `| ${s} | ${vals.join(' | ')} |`;
        }).join('\n');

        // Secretarias por mês
        const allSecs = [...new Set(meses.flatMap(m => m.secretarias.map(s => s._id)))].filter(Boolean);
        const linhasSecComp = allSecs.map(sec => {
            const vals = meses.map(m => {
                const found = m.secretarias.find(x => x._id === sec);
                return found ? `${found.total.toLocaleString('pt-BR')} (${found.taxa}%)` : '0';
            });
            return `| ${sec} | ${vals.join(' | ')} |`;
        }).join('\n');

        escrever('18 - Comparativo Mensal 2026.md', `# 📈 Comparativo Mensal — 2026
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 🔢 Volume Total por Mês

${linhaTotais}

---

## 🟡 Status por Mês

| Status | Jan/2026 | Fev/2026 | Mar/2026 | Abr/2026 (parcial) |
|--------|---------|---------|---------|-------------------|
${linhasStatusComp}

---

## 🏢 Secretarias por Mês (Total | Taxa Resolução)

| Secretaria | Jan/2026 | Fev/2026 | Mar/2026 | Abr/2026 (parcial) |
|-----------|---------|---------|---------|-------------------|
${linhasSecComp}

---

## 🗂️ Top 10 Temas por Mês

### Janeiro/2026
| # | Tema | Total |
|---|------|-------|
${jan2026.temas.map((t,i)=>`| ${i+1} | ${t._id || 'N/A'} | ${t.total} |`).join('\n')}

### Fevereiro/2026
| # | Tema | Total |
|---|------|-------|
${fev2026.temas.map((t,i)=>`| ${i+1} | ${t._id || 'N/A'} | ${t.total} |`).join('\n')}

### Março/2026
| # | Tema | Total |
|---|------|-------|
${mar2026.temas.map((t,i)=>`| ${i+1} | ${t._id || 'N/A'} | ${t.total} |`).join('\n')}

### Abril/2026 (até dia 13)
| # | Tema | Total |
|---|------|-------|
${abr2026.temas.map((t,i)=>`| ${i+1} | ${t._id || 'N/A'} | ${t.total} |`).join('\n')}
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 19 — ABRIL 2026 (PARCIAL)
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Analisando Abril 2026...');
        const filtroAbr = {
            dataCriacaoIso: { $gte: new Date('2026-04-01T00:00:00Z'), $lte: new Date('2026-04-13T23:59:59Z') }
        };
        const totalAbr = await col.countDocuments(filtroAbr);
        const abrStatus = await col.aggregate([
            { $match: filtroAbr },
            { $group: { _id: '$status_simplificado', total: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]).toArray();
        const abrSec = await col.aggregate([
            { $match: filtroAbr },
            { $group: {
                _id: '$secretaria',
                total: { $sum: 1 },
                encerradas: { $sum: { $cond: [{ $eq: ['$statusDemanda','Encerrada'] }, 1, 0] } }
            }},
            { $addFields: { taxa: { $round: [{ $multiply: [{ $divide: ['$encerradas','$total'] }, 100] }, 1] }}},
            { $sort: { total: -1 } }
        ]).toArray();
        const abrTema = await col.aggregate([
            { $match: filtroAbr },
            { $group: { _id: '$tema_especifico', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 15 }
        ]).toArray();
        const abrBairro = await col.aggregate([
            { $match: { ...filtroAbr, bairro: { $ne: 'NÃO INFORMADO' } } },
            { $group: { _id: '$bairro', total: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 15 }
        ]).toArray();

        escrever('19 - Abril 2026 Parcial.md', `# 📅 Abril 2026 — Análise Parcial (até dia 13)
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}  
> Período: **01/04/2026 a 13/04/2026**

---

## 🔢 Totais

| Métrica | Valor |
|---------|-------|
| **Total de manifestações** | ${totalAbr.toLocaleString('pt-BR')} |
| **Média diária estimada** | ${(totalAbr/13).toFixed(0)} por dia |
| **Projeção mensal** | ~${Math.round((totalAbr/13)*30).toLocaleString('pt-BR')} (se mantiver ritmo) |

---

## 🟡 Status

| Status | Total | % |
|--------|-------|---|
${abrStatus.map(s=>`| ${s._id} | ${s.total} | ${((s.total/totalAbr)*100).toFixed(1)}% |`).join('\n')}

---

## 🏢 Por Secretaria

| Secretaria | Total | Encerradas | Taxa |
|-----------|-------|-----------|------|
${abrSec.map(s=>`| ${s._id || 'Sem Secretaria'} | ${s.total} | ${s.encerradas} | ${s.taxa}% |`).join('\n')}

---

## 🗂️ Top 15 Temas

| # | Tema | Total |
|---|------|-------|
${abrTema.map((t,i)=>`| ${i+1} | ${t._id || 'N/A'} | ${t.total} |`).join('\n')}

---

## 🏘️ Top 15 Bairros

| # | Bairro | Total |
|---|--------|-------|
${abrBairro.map((b,i)=>`| ${i+1} | ${b._id} | ${b.total} |`).join('\n')}
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 20 — REGISTROS COM FOTO vs SEM FOTO
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Analisando registros com/sem foto...');
        const comFoto = await col.countDocuments({ image_url: { $exists: true, $not: { $size: 0 } } });
        const semFoto = totalGeral - comFoto;
        const comFotoEncerradas = await col.countDocuments({
            image_url: { $exists: true, $not: { $size: 0 } },
            statusDemanda: 'Encerrada'
        });
        const semFotoEncerradas = await col.countDocuments({
            $or: [{ image_url: { $exists: false } }, { image_url: { $size: 0 } }],
            statusDemanda: 'Encerrada'
        });

        // Foto por secretaria
        const fotoSecretaria = await col.aggregate([
            { $group: {
                _id: '$secretaria',
                comFoto: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$image_url',[]] }}, 0] }, 1, 0] } },
                total: { $sum: 1 }
            }},
            { $match: { total: { $gte: 20 } } },
            { $addFields: { pctFoto: { $round: [{ $multiply: [{ $divide: ['$comFoto','$total'] }, 100] }, 1] } } },
            { $sort: { pctFoto: -1 } }
        ]).toArray();

        escrever('20 - Registros Com e Sem Foto.md', `# 📷 Registros Com e Sem Foto
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Visão Geral

| Métrica | Quantidade | % do Total | Taxa Resolução |
|---------|-----------|------------|---------------|
| **Com foto** | ${comFoto.toLocaleString('pt-BR')} | ${((comFoto/totalGeral)*100).toFixed(1)}% | ${((comFotoEncerradas/comFoto)*100).toFixed(1)}% |
| **Sem foto** | ${semFoto.toLocaleString('pt-BR')} | ${((semFoto/totalGeral)*100).toFixed(1)}% | ${((semFotoEncerradas/semFoto)*100).toFixed(1)}% |
| **Total** | ${totalGeral.toLocaleString('pt-BR')} | 100% | — |

---

## 🏢 % Com Foto por Secretaria

| Secretaria | Total | Com Foto | % Com Foto |
|-----------|-------|---------|-----------|
${fotoSecretaria.map(s=>`| ${s._id || 'Sem Secretaria'} | ${s.total} | ${s.comFoto} | ${s.pctFoto}% |`).join('\n')}

---

> **Insight:** Registros com foto tendem a ter maior taxa de resolução pois fornecem evidência ao agente de campo.
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 21 — HEAT MAP SECRETARIA × TEMA
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Gerando heat map Secretaria × Tema...');
        const heatmap = await col.aggregate([
            { $group: {
                _id: { secretaria: '$secretaria', tema: '$tema_especifico' },
                total: { $sum: 1 }
            }},
            { $sort: { total: -1 } },
            { $limit: 50 }
        ]).toArray();

        const linhasHeat = heatmap.map((h, i) =>
            `| ${i+1} | ${h._id.secretaria || 'Sem Secretaria'} | ${h._id.tema || 'N/A'} | ${h.total.toLocaleString('pt-BR')} |`
        ).join('\n');

        escrever('21 - Heatmap Secretaria x Tema.md', `# 🌡️ Heatmap — Secretaria × Tema
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}  
> Top 50 combinações mais frequentes de Secretaria + Tema.

---

## 📊 Combinações Mais Frequentes

| # | Secretaria | Tema | Ocorrências |
|---|-----------|------|------------|
${linhasHeat}
`);

        // ══════════════════════════════════════════════════════════════════════════
        // 22 — EVOLUÇÃO SEMANAL
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📊 Gerando evolução semanal...');
        const semanal = await col.aggregate([
            { $match: { dataCriacaoIso: { $exists: true, $type: 'date' } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%U', date: '$dataCriacaoIso', timezone: '-03:00' } },
                total: { $sum: 1 },
                encerradas: { $sum: { $cond: [{ $eq: ['$statusDemanda','Encerrada'] }, 1, 0] } }
            }},
            { $sort: { _id: 1 } }
        ]).toArray();

        const linhasSemanal = semanal.map(s => {
            const taxa = s.total > 0 ? ((s.encerradas/s.total)*100).toFixed(1) : '0.0';
            const [ano, semana] = s._id.split('-');
            return `| ${ano} | Semana ${semana} | ${s.total.toLocaleString('pt-BR')} | ${s.encerradas.toLocaleString('pt-BR')} | ${taxa}% |`;
        }).join('\n');

        escrever('22 - Evolucao Semanal.md', `# 📅 Evolução Semanal de Manifestações
> [[00 - MOC Dados do Banco|← MOC]] | Atualizado: ${new Date().toLocaleString('pt-BR')}

---

## 📊 Volume Semana a Semana

| Ano | Semana | Abertas | Encerradas | Taxa |
|-----|--------|---------|-----------|------|
${linhasSemanal}
`);

        // ══════════════════════════════════════════════════════════════════════════
        // ATUALIZA MOC
        // ══════════════════════════════════════════════════════════════════════════
        console.log('📝 Atualizando MOC...');
        const mocAtualizado = `# 🗄️ MOC — Dados do Banco de Dados
> Gerado automaticamente em: **${new Date().toLocaleString('pt-BR')}**  
> Banco: \`${DB_NAME}\` | Coleção: \`${COLLECTION}\` | Total: **${totalGeral.toLocaleString('pt-BR')} registros**

---

## 📋 Índice Completo

### 📊 Análises Gerais
- [[01 - Visao Geral e Estatisticas]] — Totais, status e resumo geral
- [[02 - Ranking por Secretaria]] — Performance de cada secretaria
- [[03 - Ranking por Tema]] — Top 30 temas mais recorrentes
- [[04 - Ranking por Bairro]] — Top 50 bairros com mais ocorrências
- [[05 - Serie Mensal]] — Mês a mês desde o início

### 📅 Análise Temporal
- [[10 - Distribuicao por Dia da Semana]] — Quais dias concentram mais demandas
- [[11 - Distribuicao por Hora do Dia]] — Horário de pico de abertura
- [[22 - Evolucao Semanal]] — Semana a semana completo

### 📆 Análises Mensais
- [[06 - Marco 2026 - Analise Completa]] — Março 2026 completo
- [[18 - Comparativo Mensal 2026]] — Jan, Fev, Mar e Abr 2026 comparados
- [[19 - Abril 2026 Parcial]] — Abril 2026 (até dia 13)

### 🏢 Desempenho Operacional
- [[12 - Tempo Medio de Resolucao]] — Dias para encerrar por secretaria
- [[15 - Taxa de Recusa por Secretaria]] — Recusa e indeferimento por secretaria
- [[21 - Heatmap Secretaria x Tema]] — Top 50 combinações secretaria × tema

### 🏘️ Análise Geográfica
- [[13 - Piores Bairros Taxa Resolucao]] — Bairros com maior represamento
- [[14 - Tema Predominante por Bairro]] — Perfil de demanda por bairro

### 🔍 Auditoria e Qualidade
- [[07 - Ultimos 100 Registros]] — 100 protocolos mais recentes
- [[08 - Registros Sem Secretaria]] — ${(await col.countDocuments({ secretaria: 'Sem Secretaria' })).toLocaleString('pt-BR')} registros não classificados
- [[16 - Aging Demandas em Aberto]] — Demandas abertas há mais tempo
- [[17 - Temas Represados]] — Temas com maior volume em aberto

### 👥 Análise de Cidadãos e Evidências
- [[09 - Cidadaos Mais Ativos]] — Top 30 cidadãos com mais manifestações
- [[20 - Registros Com e Sem Foto]] — Impacto da foto na resolução

---

> Para atualizar todos os dados, execute:
> \`\`\`bash
> node gerar_obsidian_dados.js
> node gerar_obsidian_expandido.js
> \`\`\`
`;
        escrever('00 - MOC Dados do Banco.md', mocAtualizado);

        console.log('\n🎉 CONCLUÍDO! Arquivos gerados em:');
        console.log('   📁', OUTPUT_DIR);
        const todos = fs.readdirSync(OUTPUT_DIR).sort();
        console.log(`\n📋 ${todos.length} arquivos no total:`);
        todos.forEach(f => console.log('   •', f));

    } catch (err) {
        console.error('❌ Erro:', err.message);
        console.error(err.stack);
    } finally {
        await client.close();
    }
}

main();
