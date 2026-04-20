# ⚙️ Variáveis de Ambiente — Eladoria API

> [[00 - MOC - Eladoria API|← Voltar ao MOC]]  
> Arquivo: `.env` (raiz do projeto)

---

## ⚠️ Segurança

> [!CAUTION]
> O arquivo `.env` contém **credenciais reais** de acesso à API Colab. Ele está listado no `.gitignore` e **não deve ser versionado** nem compartilhado publicamente.

---

## 📋 Tabela Completa de Variáveis

| Variável | Valor Atual | Valor Padrão (código) | Descrição |
|---------|------------|----------------------|-----------|
| `COLAB_APP_ID` | `7cd09fab-f27b-4f7e-866a-f9bb9b5ba419` | — | ID da aplicação Colab (header `x-colab-application-id`) |
| `COLAB_API_KEY` | `d30234cd-93c9-4fe7-9242-65324a37a4c1` | — | Chave REST da API Colab (header `x-colab-rest-api-key`) |
| `COLAB_AUTH_TICKET` | `51643b45-bfd7-43cc-82de-13f6ed6cdb1e` | — | Ticket de autenticação admin (header `x-colab-admin-user-auth-ticket`) |
| `MONGO_URI` | `mongodb://127.0.0.1:27017` | `mongodb://127.0.0.1:27017` | URI de conexão do MongoDB local |
| `DB_NAME` | `ColabOuvidoria` | `ColabOuvidoria` | Nome do banco de dados MongoDB |
| `COLLECTION_NAME` | `zeladoria` | `posts` | Nome da coleção MongoDB |
| `API_BASE_URL` | `https://api.colabapp.com/v2/integration/posts` | `https://api.colabapp.com/v2/integration/posts` | URL base da API Colab |
| `DATA_INICIAL` | `2026-04-07T00:00:00Z` | `2025-08-15T00:00:00Z` | Data de início para sincronização histórica |
| `INTERVALO_HORAS` | `3` | `12` | Tamanho da janela temporal de cada requisição (horas) |
| `DOMINIO` | `zeladoria` | `zeladoria` | Domínio para classificar os registros |

---

## 🗂️ Arquivo `.env` Completo

```env
COLAB_APP_ID=7cd09fab-f27b-4f7e-866a-f9bb9b5ba419
COLAB_API_KEY=d30234cd-93c9-4fe7-9242-65324a37a4c1
COLAB_AUTH_TICKET=51643b45-bfd7-43cc-82de-13f6ed6cdb1e
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=ColabOuvidoria
COLLECTION_NAME=zeladoria
API_BASE_URL=https://api.colabapp.com/v2/integration/posts
DATA_INICIAL=2026-04-07T00:00:00Z
INTERVALO_HORAS=3
DOMINIO=zeladoria
```

---

## 📦 `.gitignore`

```
.env
```

---

## 🔌 Uso nos Arquivos

### `sync.js` — usa todas as variáveis
```js
require('dotenv').config();

const CONFIG = {
    dataInicial:    new Date(process.env.DATA_INICIAL     || '2025-08-15T00:00:00Z'),
    intervaloHoras: parseInt(process.env.INTERVALO_HORAS  || '12'),
    mongoUri:       process.env.MONGO_URI                 || 'mongodb://127.0.0.1:27017',
    dbName:         process.env.DB_NAME                   || 'ColabOuvidoria',
    collectionName: process.env.COLLECTION_NAME           || 'posts',
    api: {
        baseUrl: process.env.API_BASE_URL || '...',
        headers: {
            'x-colab-application-id':         process.env.COLAB_APP_ID,
            'x-colab-rest-api-key':           process.env.COLAB_API_KEY,
            'x-colab-admin-user-auth-ticket': process.env.COLAB_AUTH_TICKET
        }
    },
    dominio: process.env.DOMINIO || 'zeladoria',
};
```

### `server.js` — usa variáveis de MongoDB
```js
const uri            = process.env.MONGO_URI        || 'mongodb://127.0.0.1:27017';
const dbName         = process.env.DB_NAME          || 'ColabOuvidoria';
const collectionName = process.env.COLLECTION_NAME  || 'posts';
```

---

## 🔄 Diferença: Valor Atual vs. Padrão do Código

| Variável | Situação |
|---------|---------|
| `COLLECTION_NAME` | `.env` usa `zeladoria`; código tem default `posts` ⚠️ |
| `INTERVALO_HORAS` | `.env` usa `3h`; código tem default `12h` |
| `DATA_INICIAL` | `.env` usa `2026-04-07`; código tem default `2025-08-15` |

---

## 🔗 Ver Também

- [[01 - Arquitetura do Sistema]] — como as variáveis são usadas na arquitetura
- [[04 - Sincronização com Colab API]] — CONFIG detalhado
- [[03 - Endpoints da API REST]] — variáveis de servidor
