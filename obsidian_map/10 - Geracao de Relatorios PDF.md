# 📄 Geração de Relatórios PDF — Eladoria API

> [[00 - MOC - Eladoria API|← Voltar ao MOC]]  
> Biblioteca: `pdfkit` + `pdfkit-table` | Rota: `POST /api/report`

---

## 📌 Visão Geral

O sistema gera relatórios PDF de manifestações de Zeladoria por cidadão sob demanda. O PDF é gerado em **memória** (stream) e entregue diretamente ao navegador como download, sem salvar em disco.

---

## 📚 Bibliotecas Utilizadas

| Biblioteca | Versão | Função |
|-----------|--------|--------|
| `pdfkit` | ^0.18.0 | Engine de geração de PDF |
| `pdfkit-table` | ^0.1.99 | Extensão para tabelas no PDF |

---

## 🏗️ Estrutura do PDF

```
┌─────────────────────────────────────────────────────────────┐
│ CABEÇALHO                                                    │
│ Cor: #1a5a3a (verde escuro)                                 │
│ Título: "Eladoria API - Relatório de Zeladoria"             │
│ Subtítulo: "Gerado em: DD/MM/YYYY HH:MM:SS"                │
│ Linha separadora: rect(30, 75, 535, 1) fill #1a5a3a        │
├─────────────────────────────────────────────────────────────┤
│ SEÇÃO: Dados do Munícipe                                     │
│ Caixa cinza clara (fillOpacity 0.05)                        │
│ · Nome: {citizen}                                           │
│ · Nascimento: {citizenInfo.nascimento}                      │
│ · Celular: {citizenInfo.celular}                            │
│ · Email: {citizenInfo.email}                                │
├─────────────────────────────────────────────────────────────┤
│ TABELA: Listagem de Manifestações ({N} registros)           │
│                                                              │
│ Colunas:                                                     │
│  ID | Data | Tema | Endereço | Status                       │
│                                                              │
│ · Header: Helvetica-Bold, 10pt                              │
│ · Rows: Helvetica, 9pt                                      │
│ · Endereço truncado em 25 chars                             │
│ · Largura total: 535pt (margem 30pt)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuração do PDFDocument

```js
const doc = new PDFDocument({
    margin: 30,    // 30pt em todos os lados
    size: 'A4'     // 595 × 842 pt
});
```

---

## 🎨 Paleta de Cores

| Elemento | Cor | Uso |
|---------|-----|-----|
| Títulos / Cabeçalho | `#1a5a3a` | Verde escuro institucional |
| Texto normal | `#000000` | Preto |
| Data de geração | `#444444` | Cinza escuro |
| Fundo caixa dados | `#eeeeee` (opacity 0.05) | Cinza muito suave |

---

## 📊 Dados da Tabela de Manifestações

Cada linha da tabela exibe:

| Coluna | Campo Fonte | Transformação |
|--------|------------|---------------|
| `ID` | `post.id` | `.toString()` |
| `Data` | `post.created_at` | `new Date().toLocaleDateString('pt-BR')` |
| `Tema` | `post.tema_especifico` | Valor direto (fallback `"Zeladoria"`) |
| `Endereço` | `post.address` | Truncado em 22 chars + `"..."` se > 25 |
| `Status` | `post.status` | Valor direto |

---

## 🌊 Fluxo de Streaming

```js
// O PDF é enviado como stream sem salvar em disco
const doc = new PDFDocument({ margin: 30, size: 'A4' });

res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', `attachment; filename=Relatorio_Zeladoria_${citizen}.pdf`);

doc.pipe(res);   // Conecta o stream do PDF ao response HTTP

// ... renderiza o PDF ...

doc.end();       // Finaliza e envia
```

---

## 🖨️ Modo de Impressão (Frontend)

O frontend também possui um botão de **impressão direta** do navegador:

```js
document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
});
```

Isso usa o CSS `@media print` definido no `style.css` para formatar a tabela de resultados para impressão sem abrir um PDF.

---

## 📁 PDF Manual Gerado

Existe um PDF pré-gerado no projeto para referência:

| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| `Relatorio_Zeladoria_Luciandro_Lima.pdf` | 9.979 bytes | Exemplo de relatório gerado |

---

## 🔗 Ver Também

- [[03 - Endpoints da API REST]] — rota `POST /api/report`
- [[09 - Frontend Web]] — fluxo de acionamento do modal
- [[02 - Schema do Banco de Dados]] — campos usados na tabela
