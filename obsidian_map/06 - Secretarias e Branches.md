# 🏢 Secretarias e Branches — Eladoria API

> [[00 - MOC - Eladoria API|← Voltar ao MOC]]  
> Fonte: `BRANCH_TO_SECRETARIA` em `sync.js`

---

## 📌 Visão Geral

Cada manifestação possui um campo `branch` (objeto) com `id` e `name`. O daemon `sync.js` mapeia o `branch.id` para um **nome canônico de secretaria** via o dicionário `BRANCH_TO_SECRETARIA`.

### Regra de Resolução (`resolveSecretaria`)

```js
function resolveSecretaria(item) {
    if (item.branch?.id && BRANCH_TO_SECRETARIA[item.branch.id]) {
        return BRANCH_TO_SECRETARIA[item.branch.id];  // 1. Usa o mapa canônico
    }
    if (item.branch?.name) {
        return item.branch.name;                       // 2. Usa o nome bruto da API
    }
    return "Sem Secretaria";                           // 3. Fallback
}
```

---

## 📊 Mapa Completo de Branches

### Secretaria de Obras

| `branch.id` | Nome Original na API | Secretaria Canônica |
|------------|---------------------|---------------------|
| `6333` | Superintendência de Limpeza Urbana | **Secretaria de Obras** |
| `6343` | Coordenadoria de Engenharia Pública | **Secretaria de Obras** |
| `6412` | Ouvidoria Setorial de Obras | **Secretaria de Obras** |
| `6413` | 1ª Residência de Obras | **Secretaria de Obras** |
| `6414` | 2ª Residência de Obras A | **Secretaria de Obras** |
| `6415` | 2ª Residência de Obras B | **Secretaria de Obras** |
| `6416` | 3ª Residência de Obras | **Secretaria de Obras** |
| `6417` | 4ª Residência de Obras | **Secretaria de Obras** |
| `6420` | GPE | **Secretaria de Obras** |

> **Total de branches mapeadas para Obras:** 9

---

### Secretaria de Transportes

| `branch.id` | Nome Original na API | Secretaria Canônica |
|------------|---------------------|---------------------|
| `6347` | Secretaria Municipal de Transportes e Serviços Públicos | **Secretaria de Transportes** |

---

### Secretaria de Segurança

| `branch.id` | Nome Original na API | Secretaria Canônica |
|------------|---------------------|---------------------|
| `6447` | Gabinete Secretário de Segurança | **Secretaria de Segurança** |
| `6448` | Guarda Municipal | **Secretaria de Segurança** |

---

### Secretaria de Urbanismo

| `branch.id` | Nome Original na API | Secretaria Canônica |
|------------|---------------------|---------------------|
| `6342` | Gabinete | **Secretaria de Urbanismo** |
| `6346` | Setor de Fiscalização (Urbanismo) | **Secretaria de Urbanismo** |
| `6411` | Planejamento | **Secretaria de Urbanismo** |

---

### Outros / Administrativo

| `branch.id` | Nome Original na API | Secretaria Canônica |
|------------|---------------------|---------------------|
| `6264` | Colab | **Outros** |
| `6305` | Ouvidoria Geral | **Outros** |
| `6449` | Empresa SEPLAQUE | **Outros** |

---

## 📈 Resumo por Secretaria

| Secretaria | Qtd de Branches Mapeadas |
|-----------|--------------------------|
| Secretaria de Obras | 9 |
| Secretaria de Urbanismo | 3 |
| Secretaria de Segurança | 2 |
| Outros / Administrativo | 3 |
| Secretaria de Transportes | 1 |
| **Total** | **18** |

---

## ⚠️ Casos Especiais

### Branch `null`
Quando `branch.id = null` e `branch.name = null`, o campo `secretaria` é atribuído como `"Sem Secretaria"`.

```json
"branch": { "id": null, "name": null }
→ secretaria: "Sem Secretaria"
```

### Branch não mapeada
Se o `branch.id` não existir no dicionário mas `branch.name` estiver preenchido, o nome bruto da API é usado diretamente.

---

## 🔢 Bancos Disponíveis no MongoDB Local

> Fonte: `dbs.json`

```json
["ColabOuvidoria", "admin", "config", "local", "ouvidoria_v2"]
```

| Banco | Uso |
|-------|-----|
| `ColabOuvidoria` | ⭐ Banco principal — coleção `zeladoria` |
| `ouvidoria_v2` | Banco alternativo / legado |
| `admin` | Administração MongoDB |
| `config` | Configuração interna MongoDB |
| `local` | Replicação interna MongoDB |

---

## 🔗 Ver Também

- [[02 - Schema do Banco de Dados]] — campo `secretaria`
- [[05 - Categorias e Temas]] — agrupamentos por secretaria
- [[07 - Status e Regras de Negócio]] — funções de resolução
