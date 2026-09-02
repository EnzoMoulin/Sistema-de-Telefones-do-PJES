# Diretório Institucional de Contatos - PJES

Sistema Web App do **Poder Judiciário do Estado do Espírito Santo (TJES)** para consulta e gestão de contatos institucionais, construído com **Google Apps Script + Google Sheets**.

## Arquitetura atual

```text
   MUNICIPIOS / ORGAOS
        ↓          ↓
 FORUM (opcional)  │
        └────┬─────┘
             ↓
 UNIDADES_ORGANIZACIONAIS
            ↳ (UNIDADES E SETORES)
                        ↓
                     CONTATOS
```

## Regras principais

- Comarca pode possuir um ou vários Fóruns.
- Órgão pode possuir Unidades diretamente, sem Fórum intermediário.
- O Tribunal de Justiça é catalogado como Órgão independente e aparece antes de Vitória.
- Fórum possui Endereço, E-mail (não necessariamente) e Contatos Gerais próprios.
- Cada estrutura organizacional (Unidades e Setores) pertence a um Fórum ou diretamente a um Órgão.
- E-mail e Endereço são herdados para visualização apenas quando não houver dado próprio.

## Consulta pública

O mapa responsivo do Espírito Santo permanece na consulta. No desktop ele integra o layout; no mobile é apresentado no topo. A navegação é Comarca/Órgão → Fórum opcional → árvore organizacional (Unidade e Setor) → Contato, com busca por Unidade, Setor, Telefone, Ramal, WhatsApp e E-mail.
