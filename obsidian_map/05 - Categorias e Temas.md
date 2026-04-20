# 🗂️ Categorias e Temas — Eladoria API

> [[00 - MOC - Eladoria API|← Voltar ao MOC]]  
> Fonte: `CATEGORY_MAP` em `sync.js` + `api_full_report.json`

---

## 📌 Visão Geral

O campo `category_id` recebido da API Colab é mapeado para um **tema legível** (`tema_especifico`) via o dicionário `CATEGORY_MAP` no `sync.js`.

A API Colab possui dois **tipos** de categorias:
- **`event`** — categorias de manifestações públicas (cidadão cria via app)
- **`post`** — categorias internas (uso operacional da prefeitura)

---

## 📊 Tabela Completa de Categorias

### Categorias Públicas (`type: event`)

| `category_id` | Nome Original (API) | Nome Canônico (`CATEGORY_MAP`) | Secretaria Típica |
|--------------|--------------------|---------------------------------|-------------------|
| `12807` | Troca de manilha quebrada | Manilha Arriada / Drenagem | Secretaria de Obras |
| `12808` | Tapa buraco | Reparo de Asfalto / Pavimentação | Secretaria de Obras |
| `12809` | Limpeza de valão | Limpeza de Rio / Canal | Secretaria de Obras |
| `12811` | Desobstrução de rede de esgoto | Esgoto e Drenagem | Secretaria de Obras |
| `12814` | Obstrução de calçada (notificação) | Fiscalização / Passarela | Secretaria de Urbanismo |
| `12817` | Lâmpada acesa de dia | Iluminação (Lâmpada Acesa Dia) | Secretaria de Transportes |
| `12818` | Lâmpada piscando | Iluminação (Lâmpada Piscando) | Secretaria de Transportes |
| `12820` | Retirada de entulho | Remoção de Entulho / Obras | Secretaria de Obras |
| `12821` | Retirada de lixo | Limpeza de Logradouro | Secretaria de Obras |
| `12822` | Retirada de galhos | Capina e Roçagem | Secretaria de Obras |
| `12823` | Capina e roçada | Capina e Roçagem | Secretaria de Obras |
| `12824` | Poste dando choque | Fiação Elétrica / Risco | Secretaria de Transportes |
| `12825` | Poste em risco de queda ou caído | Manutenção de Poste | Secretaria de Transportes |
| `12826` | Poste/iluminação com defeitos | Manutenção de Iluminação | Secretaria de Transportes |
| `12831` | Postes/iluminação em praça pública | Iluminação de Praças | Secretaria de Transportes |
| `12834` | Placa de trânsito danificada | Sinalização Viária | Secretaria de Transportes |
| `12835` | Programação de Semáforo – Revisão | Ouvidoria Geral / Teste | Secretaria de Transportes |
| `12836` | Semáforo apagado | Segurança / Guarda Municipal | Secretaria de Segurança |
| `12837` | Semáforo colidido, caído ou virado | Retirada de Semáforo | Secretaria de Transportes |
| `12838` | Semáforo com falha nas cores | Semáforo Defeituoso (Vermelho) | Secretaria de Transportes |
| `12839` | Semáforo em amarelo piscante | Sinalização (Semáforo Piscando) | Secretaria de Transportes |
| `12840` | Semáforo travado | Sinalização Semafórica | Secretaria de Transportes |
| `12870` | Troca de lâmpada queimada | Iluminação Pública (Lâmpada Apagada) | Secretaria de Transportes |
| `12871` | Estacionamento irregular de veículo | Fiscalização de Estacionamento | Secretaria de Segurança |
| `12885` | Substituição de Tampões e Grelhas | Manutenção de Esgoto | Secretaria de Obras |
| `12916` | Fisc. Perturbação do Sossego | *(sem mapa canônico)* | — |
| `12917` | Desobstrução de calçadas | *(sem mapa canônico)* | — |
| `12918` | Retirada food truck em calçadas | *(sem mapa canônico)* | — |

### Categorias Internas (`type: post`)

| `category_id` | Nome Original (API) | Nome Canônico (`CATEGORY_MAP`) |
|--------------|--------------------|---------------------------------|
| `225667` | [Interno] Lâmpada acesa de dia | Retirada de Fiação Solta |
| `225668` | [Interno] Lâmpada piscando | — |
| `225669` | [Interno] Troca de lâmpada queimada | Troca de Luz |
| `225670` | [Interno] Poste dando choque | Poste Pegando Fogo |
| `225672` | [Interno] lluminação praça pública | Falta de Iluminação |
| `225673` | [Interno] Poste/iluminação defeito | Colocação de Luz |
| `225675` | [Interno] Desobstrução rede esgoto | Desentupimento (Vacall) |
| `225676` | [Interno] Tapa Buraco | Equipe de Obras / Reparos |
| `225677` | [Interno] Capina e roçada | Roçagem (SMMA) |
| `225678` | [Interno] Retirada de entulho | Retirada de Entulho |
| `225679` | [Interno] Retirada de galhos | Retirada de Galhos |
| `225680` | [Interno] Retirada de lixo | Retirada de Lixo |
| `225681` | [Interno] Placa trânsito danificada | Colocação de Placa |
| `225689` | [Interno] Obstrução de calçada | Reparo em Calçada |
| `225690` | [Interno] Troca de lâmpada queimada | Caça-fio (GPE) |
| `225695` | [Interno] Drenagem e Pavimentação | Pavimentação / Buracos |
| `225696` | [Interno] Troca de manilha quebrada | Colocação de Manilha / Caixa |
| `225697` | [Interno] Manutenção de praças | Manutenção de Canteiro |
| `225698` | [Interno] Implantação braço de luz | Instalação de Braço de Luz |
| `225699` | [Interno] Limpeza de Valão | Limpeza Manual de Canal |
| `225700` | [Int] Troca tampões/bocas de lobo | Reparo de Ralo e Tampão |
| `225703` | [Interno] Estacionamento irregular | Retirada de Veículo |

---

## ⚠️ Categorias Desativadas (NÃO ATIVAR)

| `category_id` | Nome |
|--------------|------|
| `12810` | [NÃO ATIVAR] Fiscalização de obras |
| `12815` | [NÃO ATIVAR] vistoria técnica |
| `12816` | [NÃO ATIVAR] Lâmpada apagada à noite |
| `12832` | [NÃO ATIVAR] Semáforo quebrado |

---

## 📝 Agrupamentos por Secretaria

### Secretaria de Obras
`12808, 12809, 12811, 12820, 12821, 12822, 12823, 12885, 225676, 225677, 225678, 225679, 225680, 225695, 225696, 225699, 225700`

### Secretaria de Transportes
`12817, 12818, 12824, 12825, 12826, 12831, 12834, 12835, 12837, 12838, 12839, 12840, 12870, 225667, 225669, 225670, 225672, 225673, 225690, 225698`

### Secretaria de Urbanismo
`12814, 225689`

### Secretaria de Segurança
`12836, 12871, 225703`

### Limpeza Urbana Geral
`12822, 225677, 225697`

---

## 🔗 Ver Também

- [[02 - Schema do Banco de Dados]] — campo `tema_especifico` e `assunto`
- [[06 - Secretarias e Branches]] — mapeamento por branch
- [[04 - Sincronização com Colab API]] — onde o CATEGORY_MAP é aplicado
