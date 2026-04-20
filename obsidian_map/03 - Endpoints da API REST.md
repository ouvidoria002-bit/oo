# 🔌 Endpoints da API REST — Eladoria API

> [[00 - MOC - Eladoria API|← Voltar ao MOC]]  
> Arquivo fonte: `server.js` | Porta: `3000`

---

## 📡 Configuração Base do Servidor

```
Base URL: http://localhost:3000
Framework: Express ^5.2.1
Middlewares: cors(), express.json(), express.static('public')
```

| Middleware | Função |
|-----------|--------|
| `cors()` | Permite requisições cross-origin |
| `express.json()` | Parse de body JSON |
| `express.static('public')` | Serve os arquivos do frontend |

---

## 🗺️ Mapa de Rotas

| Método | Rota | Função |
|--------|------|--------|
| `GET` | `/api/search` | Busca de manifestações com filtros |
| `POST` | `/api/report` | Gera e faz download de relatório PDF |
| `GET` | `/*` | Serve o frontend estático (`public/`) |

---

## 🔍 `GET /api/search`

### Descrição
Busca manifestações na coleção `zeladoria` com filtros opcionais. Retorna até **100 registros** ordenados pelo `created_at` decrescente.

### Query Parameters

| Parâmetro | Tipo | Filtro MongoDB | Exemplo |
|-----------|------|---------------|---------|
| `citizen` | `string` | `$regex`, case-insensitive | `?citizen=Luciandro` |
| `id` | `number` | Igualdade exata (`parseInt`) | `?id=858775` |
| `status` | `string` | Igualdade exata | `?status=ABERTO` |
| `neighborhood` | `string` | `$regex`, case-insensitive | `?neighborhood=Taquara` |

> **Nota:** Todos os filtros são cumulativos (AND). O filtro `dominio: 'zeladoria'` é sempre aplicado automaticamente.

### Query MongoDB Gerada
```js
{
  dominio: 'zeladoria',
  citizen: { $regex: 'Luciandro', $options: 'i' },  // se citizen informado
  id: 858775,                                          // se id informado
  status: 'ABERTO',                                    // se status informado
  neighborhood: { $regex: 'Taquara', $options: 'i' }  // se neighborhood informado
}
```

### Exemplo de Requisição
```http
GET /api/search?citizen=Marcos&status=ATENDIMENTO&neighborhood=Taquara
```

### Exemplo de Resposta (200 OK)
```json
[
  {
    "id": 858775,
    "citizen": "Marcos Campos",
    "address": "Estrada da Soledade, 80",
    "neighborhood": "Taquara",
    "status": "ATENDIMENTO",
    "tema_especifico": "Iluminação Pública (Lâmpada Apagada)",
    "secretaria": "Secretaria de Transportes",
    "created_at": "2026-03-31T12:33:22.435Z"
  }
]
```

### Respostas de Erro

| Código | Causa |
|--------|-------|
| `500` | Erro de conexão com MongoDB ou query inválida |

---

## 📄 `POST /api/report`

### Descrição
Gera um relatório PDF em formato A4 contendo os dados do cidadão e a listagem de manifestações. O arquivo é retornado como **stream de download** (não salvo em disco).

### Body (JSON)

```json
{
  "citizen": "Luciandro Pereira Lima",
  "citizenInfo": {
    "nascimento": "27/12/1985",
    "celular": "+5521989200123",
    "email": "email@exemplo.com"
  },
  "posts": [
    {
      "id": 858775,
      "created_at": "2026-03-31T12:33:22.435Z",
      "tema_especifico": "Iluminação Pública (Lâmpada Apagada)",
      "address": "Estrada da Soledade, 80",
      "status": "ATENDIMENTO"
    }
  ]
}
```

### Campos do Body

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `citizen` | `string` | Nome do cidadão (usado no título e nome do arquivo) |
| `citizenInfo.nascimento` | `string` | Data de nascimento (exibição livre) |
| `citizenInfo.celular` | `string` | Telefone do cidadão |
| `citizenInfo.email` | `string` | E-mail do cidadão |
| `posts` | `Array` | Lista de manifestações (resultado de `/api/search`) |

### Estrutura do PDF Gerado

```
┌─────────────────────────────────────────────────┐
│  Eladoria API - Relatório de Zeladoria           │
│  Gerado em: 13/04/2026 13:30:00                  │
├─────────────────────────────────────────────────┤
│  Dados do Munícipe                               │
│  Nome:        Luciandro Pereira Lima             │
│  Nascimento:  27/12/1985                         │
│  Celular:     +5521989200123                     │
│  Email:       email@exemplo.com                  │
├─────────────────────────────────────────────────┤
│  Listagem de Manifestações (N registros)         │
│  ┌──────┬──────┬───────┬──────────┬──────────┐  │
│  │ ID   │ Data │ Tema  │ Endereço │ Status   │  │
│  └──────┴──────┴───────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────┘
```

### Headers de Resposta

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename=Relatorio_Zeladoria_Luciandro_Pereira_Lima.pdf
```

### Respostas de Erro

| Código | Causa |
|--------|-------|
| `500` | Erro na geração do PDF ou dados inválidos |

---

## 🔗 Ver Também

- [[01 - Arquitetura do Sistema]] — diagrama de fluxo completo
- [[09 - Frontend Web]] — como o frontend consome estes endpoints
- [[10 - Geração de Relatórios PDF]] — detalhes da renderização com pdfkit
