# 🗄️ Bancos de Dados Disponíveis — Eladoria API

> [[00 - MOC - Eladoria API|← Voltar ao MOC]]

---

## 📌 Inventário de Bancos MongoDB Locais

> URI de conexão: `mongodb://127.0.0.1:27017`  
> Fonte: `dbs.json`

```json
["ColabOuvidoria", "admin", "config", "local", "ouvidoria_v2"]
```

---

## 🗂️ Detalhamento por Banco

### ⭐ `ColabOuvidoria` — Banco Principal

| Propriedade | Valor |
|------------|-------|
| **Banco** | `ColabOuvidoria` |
| **Coleção Principal** | `zeladoria` |
| **Origem dos Dados** | API Colab v2 via `sync.js` |
| **Índice Único** | Campo `id` (ID do protocolo Colab) |
| **Domínio** | `zeladoria` |

**Campos disponíveis na coleção `zeladoria`:**
→ Ver [[02 - Schema do Banco de Dados]]

---

### `ouvidoria_v2` — Banco Legado / Alternativo

| Propriedade | Valor |
|------------|-------|
| **Banco** | `ouvidoria_v2` |
| **Status** | Legado / uso alternativo |
| **Uso** | Versão anterior do sistema de ouvidoria |

---

### `admin` — Administração MongoDB

| Propriedade | Valor |
|------------|-------|
| **Banco** | `admin` |
| **Tipo** | Banco interno do MongoDB |
| **Uso** | Gerenciamento de usuários e operações administrativas |

---

### `config` — Configuração Interna

| Propriedade | Valor |
|------------|-------|
| **Banco** | `config` |
| **Tipo** | Banco interno do MongoDB |
| **Uso** | Metadados de configuração do servidor MongoDB |

---

### `local` — Replicação

| Propriedade | Valor |
|------------|-------|
| **Banco** | `local` |
| **Tipo** | Banco interno do MongoDB |
| **Uso** | Dados de replicação e oplog |

---

## 🔌 Cadeia de Conexão

```
mongodb://127.0.0.1:27017
```

A conexão é **lazy** (criada apenas quando necessária) e reutilizada via singleton no `server.js`:

```js
let client;
async function getCollection() {
    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
    }
    return client.db(dbName).collection(collectionName);
}
```

No `sync.js`, uma nova conexão é criada por ciclo de `syncData()` e fechada no `finally`.

---

## 🧩 Mapa de Coleções por Banco

| Banco | Coleção | Uso |
|-------|---------|-----|
| `ColabOuvidoria` | `zeladoria` | ⭐ Manifestações de Zeladoria Urbana |
| `ouvidoria_v2` | *(não mapeado)* | Legado |

---

## 📊 Comandos Úteis MongoDB

### Contar documentos em zeladoria
```js
db.zeladoria.countDocuments()
```

### Contar por mês
```js
db.zeladoria.aggregate([
  { $match: { dataCriacaoIso: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') } } },
  { $count: "total_marco_2026" }
])
```

### Contar por secretaria
```js
db.zeladoria.aggregate([
  { $group: { _id: "$secretaria", total: { $sum: 1 } } },
  { $sort: { total: -1 } }
])
```

### Verificar último registro sincronizado
```js
db.zeladoria.findOne({}, { sort: { last_sync_at: -1 } })
```

### Listar branches únicas na coleção
```js
db.zeladoria.distinct("branch.id")
```

### Listar bairros únicos
```js
db.zeladoria.distinct("bairro")
```

---

## 🔗 Ver Também

- [[02 - Schema do Banco de Dados]] — schema completo da coleção zeladoria
- [[04 - Sincronização com Colab API]] — como os dados chegam ao banco
- [[11 - Variáveis de Ambiente]] — variáveis de conexão
- [[08 - Scripts de Auditoria]] — scripts de consulta e auditoria
