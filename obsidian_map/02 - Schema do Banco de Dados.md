# 📦 Schema do Banco de Dados — Eladoria API

> [[00 - MOC - Eladoria API|← Voltar ao MOC]]

---

## 🗄️ Identificação do Banco

| Propriedade | Valor |
|------------|-------|
| **Banco** | `ColabOuvidoria` |
| **Coleção** | `zeladoria` |
| **URI** | `mongodb://127.0.0.1:27017` |
| **Driver** | MongoDB Node.js v7.1.1 |
| **Índice Único** | `id` (upsert por ID de protocolo) |

---

## 📋 Campos da API Colab (Origem — `schema_discovery.json`)

Estes campos são recebidos diretamente da **API Colab v2** e armazenados no MongoDB:

| Campo | Tipo(s) | Descrição |
|-------|--------|-----------|
| `id` | `Number` | ⭐ Identificador único do protocolo (chave de upsert) |
| `address` | `String` | Endereço completo da manifestação |
| `created_at` | `String` (ISO 8601) | Data de criação da manifestação |
| `updated_at` | `String` (ISO 8601) | Data da última atualização |
| `description` | `String` | Descrição livre do cidadão |
| `category_id` | `Number` | ID da categoria (ver [[05 - Categorias e Temas]]) |
| `lat` | `Number` | Latitude geográfica |
| `lng` | `Number` | Longitude geográfica |
| `neighborhood` | `String` \| `Null` | Nome do bairro |
| `status` | `String` | Status original da API (ex: `ABERTO`, `CONCLUIDO`) |
| `type` | `String` | Tipo do registro: `event` ou `post` |
| `citizen` | `String` \| `Null` | Nome do cidadão que abriu a manifestação |
| `branch` | `Object` | Objeto da secretaria responsável |
| `branch.id` | `Number` \| `Null` | ID numérico da branch/secretaria |
| `branch.name` | `String` \| `Null` | Nome completo da branch |
| `image_url` | `Array<String>` | URLs das fotos anexadas |
| `tags` | `Array<Object>` | Tags classificatórias |
| `tags.id` | `Number` | ID da tag |
| `tags.name` | `String` | Nome da tag |
| `files` | `Array<Object>` | Arquivos anexados |
| `files.link` | `String` | URL do arquivo |
| `files.name` | `String` | Nome do arquivo |
| `files.deleted_at` | `Null` | Data de exclusão (sempre null nos dados atuais) |

---

## ✨ Campos Canônicos (Adicionados pelo Daemon — Cérebro X-3)

Estes campos são **enriquecidos** pelo `sync.js` e não existem na API original:

| Campo | Tipo | Origem | Descrição |
|-------|------|--------|-----------|
| `dominio` | `String` | `.env DOMINIO` | Domínio do registro. Padrão: `"zeladoria"` |
| `tema_especifico` | `String` | `CATEGORY_MAP[category_id]` | Nome legível da categoria |
| `assunto` | `String` | Igual ao `tema_especifico` | Campo espelho (compatibilidade) |
| `secretaria` | `String` | `BRANCH_TO_SECRETARIA[branch.id]` | Nome canônico da secretaria |
| `status_simplificado` | `String` | `resolveStatusSimplificado()` | `"Em Aberto"`, `"Concluídas"`, `"Recusado"`, `"Indeferido"`, `"Outros"` |
| `statusDemanda` | `String` | `resolveStatusDemanda()` | `"Em andamento"` ou `"Encerrada"` |
| `bairro` | `String` | `neighborhood.toUpperCase()` | Bairro em caixa alta, `"NÃO INFORMADO"` se ausente |
| `dataCriacaoIso` | `Date` | `new Date(created_at)` | Data de criação como objeto Date nativo |
| `last_sync_at` | `Date` | `new Date()` | Timestamp da última sincronização |

---

## 🧪 Documento de Exemplo Completo

```json
{
  "_id": "<ObjectId gerado pelo MongoDB>",
  "id": 858775,
  "address": "Estrada da Soledade, 80",
  "created_at": "2026-03-31T12:33:22.435Z",
  "updated_at": "2026-04-05T21:42:17.175Z",
  "description": "Lâmpada queimada\nPonto de referência: Em frente a barraca do Russinho",
  "category_id": 12870,
  "lat": -22.6110891743926,
  "lng": -43.231491185724735,
  "neighborhood": "Taquara",
  "status": "ATENDIMENTO",
  "type": "event",
  "citizen": "Marcos Campos",
  "branch": {
    "id": 6347,
    "name": "Secretaria Municipal de Transportes e Serviços Públicos"
  },
  "image_url": [
    "https://content.colab.re/event_2db36c1d-...jpg"
  ],
  "tags": [],
  "files": [],

  "dominio": "zeladoria",
  "tema_especifico": "Iluminação Pública (Lâmpada Apagada)",
  "assunto": "Iluminação Pública (Lâmpada Apagada)",
  "secretaria": "Secretaria de Transportes",
  "status_simplificado": "Em Aberto",
  "statusDemanda": "Em andamento",
  "bairro": "TAQUARA",
  "dataCriacaoIso": "2026-03-31T12:33:22.435Z",
  "last_sync_at": "2026-04-13T13:00:00.000Z"
}
```

---

## 📊 Agregações Usadas em Produção

### Ranking por Secretaria (Março 2026)
```js
collection.aggregate([
  { $match: { dataCriacaoIso: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') } } },
  { $group: {
      _id: '$secretaria',
      total: { $sum: 1 },
      concluidos: { $sum: { $cond: [{ $eq: ['$statusDemanda', 'Encerrada'] }, 1, 0] } }
  }},
  { $addFields: { taxaResolucao: { $multiply: [{ $divide: ['$concluidos', '$total'] }, 100] } } },
  { $sort: { total: -1 } }
])
```

### Exportação de Março 2026 (multi-tipo de data)
```js
{ $or: [
    { created_at: { $gte: '2026-03-01T00:00:00', $lte: '2026-03-31T23:59:59' } },
    { dataCriacaoIso: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') } }
]}
```

---

## 🔗 Ver Também

- [[05 - Categorias e Temas]] — mapa de `category_id`
- [[06 - Secretarias e Branches]] — mapa de `branch.id`
- [[07 - Status e Regras de Negócio]] — funções de resolução de status
- [[04 - Sincronização com Colab API]] — como o enriquecimento acontece
