# 📜 Scripts de Auditoria — Eladoria API

> [[00 - MOC - Eladoria API|← Voltar ao MOC]]

---

## 📌 Visão Geral

O projeto possui **29 scripts utilitários** (`.js`) além dos dois principais (`server.js` e `sync.js`). Estes scripts foram criados para auditoria, descoberta, exportação e reprocessamento dos dados.

---

## 🔍 Scripts de Descoberta e Análise de Schema

### `analyze_schema.js`
**Propósito:** Analisa o schema da API Colab exaustivamente, amostrando múltiplos períodos de tempo.

| Propriedade | Valor |
|------------|-------|
| API | Colab v2 `/posts` |
| Períodos amostrados | Jun/2025, Ago/2025, Mar/2026 |
| Delay entre requisições | 4 segundos |
| Saída | `schema_discovery.json` |

**Como executar:**
```bash
node analyze_schema.js
```

---

### `discover_api.js` / `discover_v2.js`
**Propósito:** Scripts de descoberta inicial da API Colab — mapeamento de endpoints disponíveis.

---

### `explore_full_api.js`
**Propósito:** Exploração completa dos endpoints da API para identificar categorias, branches e outros recursos.

---

### `fetch_samples.js`
**Propósito:** Coleta amostras de registros da API para inspeção manual.

---

### `mapa_dados.js`
**Propósito:** Mapeamento de dados — identifica campos e tipos presentes nos registros reais.

---

## 📤 Scripts de Exportação

### `export_marco_json.js` ⭐
**Propósito:** Exporta todos os registros de Março 2026 da coleção `zeladoria` para um arquivo JSON.

| Propriedade | Valor |
|------------|-------|
| Banco | `ColabOuvidoria` |
| Coleção | `zeladoria` |
| Período | `2026-03-01` a `2026-03-31` |
| Saída | `C:\Users\501379.PMDC\Desktop\records_v2\dbjson\export_banco_marco_2026.json` |
| Filtro multi-tipo | `created_at` (String + Date) e `dataCriacaoIso` (Date) |

**Como executar:**
```bash
node export_marco_json.js
```

**Filtro MongoDB usado:**
```js
{ $or: [
    { created_at: { $gte: '2026-03-01T00:00:00', $lte: '2026-03-31T23:59:59' } },
    { created_at: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') } },
    { dataCriacaoIso: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') } }
]}
```

---

### `generate_report.js`
**Propósito:** Geração de relatório consolidado a partir dos dados do banco.

---

## 📊 Scripts de Relatório e KPI

### `report_atendimento_marco.js` ⭐
**Propósito:** Relatório de atendimento por Secretaria — ranking por total, concluídos e taxa de resolução para Março 2026.

**Saída no console:**
```
RANKING DE ATENDIMENTO POR SETORIAL - MARÇO/2026
SETORIAL                         | TOTAL  | CONCLUÍDOS | % TAXA
---------------------------------|--------|------------|--------
Secretaria de Obras               | 1234   | 987        | 79.9%
...
```

**Como executar:**
```bash
node report_atendimento_marco.js
```

---

### `marco2026.js`
**Propósito:** Análise e KPIs específicos de Março 2026.

---

### `audit_ranking.js`
**Propósito:** Auditoria do ranking de performance por secretaria — verificação de integridade.

---

### `audit_treatment.js`
**Propósito:** Auditoria do fluxo de tratamento de manifestações — identifica anomalias no ciclo de vida.

---

### `search_last_two_weeks.js`
**Propósito:** Busca manifestações das últimas duas semanas para análise rápida.

---

## 🔍 Scripts de Busca e Pesquisa

### `find_one_eliza.js`
**Propósito:** Localiza registros específicos associados à cidadã "Eliza" para análise individual.

---

### `search_deep_match.js`
**Propósito:** Busca profunda com múltiplos critérios — encontra correspondências em campos aninhados.

---

### `search_manifestacao.js` / `search_manifestacao_final.js`
**Propósito:** Sistema de busca avançada de manifestações com filtros combinados.

---

### `check_email.js`
**Propósito:** Verificação de registros por e-mail de cidadão.

---

### `deep_research.js`
**Propósito:** Pesquisa aprofundada de registros para casos específicos de investigação.

---

### `investigate_sem_secretaria.js`
**Propósito:** Identifica manifestações sem secretaria atribuída (`branch.id = null`) para auditoria e correção.

---

## ⚙️ Scripts de Reprocessamento

### `nitro_reprocess.js` ⭐
**Propósito:** Reprocessamento em massa ("modo nitro") — recalcula campos canônicos em todos os documentos existentes. Útil após atualização do `CATEGORY_MAP` ou `BRANCH_TO_SECRETARIA`.

**Tamanho:** 5.977 bytes (o maior script utilitário)

---

### `reprocess_secretaria.js`
**Propósito:** Reprocessamento específico do campo `secretaria` — recalcula usando o `BRANCH_TO_SECRETARIA` atualizado.

---

### `reprocess_status.js`
**Propósito:** Reprocessamento dos campos de status — recalcula `status_simplificado` e `statusDemanda`.

---

### `enrich_data.js`
**Propósito:** Enriquecimento de dados — adiciona campos faltantes em documentos antigos.

---

## 🔧 Scripts Utilitários

### `verify_sync.js`
**Propósito:** Verifica a integridade da sincronização — confirma que os dados do MongoDB correspondem ao esperado.

---

### `list_branches_mongo.js`
**Propósito:** Lista todas as branches únicas presentes na coleção MongoDB — útil para atualizar o `BRANCH_TO_SECRETARIA`.

---

### `list_categories.js`
**Propósito:** Lista todas as categorias presentes nos dados sincronizados.

---

### `list_secretarias_temp.js`
**Propósito:** Lista temporária de secretarias para validação cruzada.

---

### `fetch_api_ids.js`
**Propósito:** Coleta IDs de protocolo da API para verificação e auditoria.

---

### `check_ranking_besteiras.js`
**Propósito:** Auditoria do ranking de zeladoria — verifica a qualidade e confiabilidade dos dados.

---

## 📑 Arquivos de Dados de Referência

| Arquivo | Tipo | Conteúdo |
|---------|------|---------|
| `schema_discovery.json` | JSON | Schema completo dos campos da API Colab |
| `api_full_report.json` | JSON | Catálogo de categorias e branches da API |
| `modelo.json` | JSON | 4 documentos de exemplo do MongoDB |
| `dbs.json` | JSON | Lista dos bancos MongoDB disponíveis |

---

## 🔗 Ver Também

- [[01 - Arquitetura do Sistema]] — visão geral
- [[02 - Schema do Banco de Dados]] — campos manipulados pelos scripts
- [[04 - Sincronização com Colab API]] — processo de sincronização principal
