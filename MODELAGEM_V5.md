# Decisão arquitetural — hierarquia organizacional V5

## Veredito

A hierarquia auto-relacionada resolve melhor o domínio real do que as tabelas rígidas `UNIDADES` e `SETORES`. A mudança vale a pena agora porque o catálogo já contém profundidades que o modelo anterior não representa sem duplicação ou perda de contexto.

A proposta original foi adotada com uma correção: contatos não são colunas de `UNIDADES_ORGANIZACIONAIS`. Eles permanecem em `CONTATOS`, relacionados a qualquer nó por `UNIDADE_ORGANIZACIONAL_ID`. Isso permite vários telefones, ramais, WhatsApps e e-mails no mesmo nível.

## Comparação

| Critério | Quatro níveis rígidos | Árvore auto-relacionada |
| --- | --- | --- |
| Consultas | `JOIN`s simples e previsíveis | CTE recursiva em SQL; mapa de adjacência no Apps Script |
| Profundidade | Limitada a Unidade → Setor | Arbitrária, com limite técnico de segurança |
| Novos níveis | Exigem tabela/coluna/código novos | Exigem apenas novos nós e `PAI_ID` |
| Integridade | FKs simples | Exige impedir ciclos, órfãos e pais de outro Fórum |
| UI | Telas fixas por nível | Componente recursivo e breadcrumb |
| Desempenho | Excelente para estrutura fixa | Excelente no volume atual se lida em bloco; ruim com consultas N+1 |
| Permissões | Unidade fixa | Nó selecionável com escopo herdado para descendentes |

## Schema adotado

```text
MUNICIPIOS(ID, NOME, ...)
FORUM(ID, MUNICIPIO_ID, NOME, ...)
UNIDADES_ORGANIZACIONAIS(
  ID, FORUM_ID, PAI_ID, TIPO, NOME,
  ENDERECO, CEP, OBSERVACAO,
  SELECIONAVEL_ACESSO, ATIVO, ORDEM
)
CONTATOS(
  ID, FORUM_ID, UNIDADE_ORGANIZACIONAL_ID,
  TIPO, DESCRICAO, VALOR, ATIVO, ORDEM, ...
)
```

`FORUM_ID` é gravado em todos os nós para tornar filtros, permissões e carregamento por Fórum simples. A validação exige que pai e filho pertençam ao mesmo Fórum.

`TIPO` descreve o papel semântico (`UNIDADE`, `SECRETARIA`, `VARA`, `JUIZADO`, `SETOR`, `GABINETE`, `ASSESSORIA` etc.). A aplicação não deduz o tipo pela profundidade ou pelo nome.

`SELECIONAVEL_ACESSO` separa a estrutura visual da regra de autorização. Um vínculo em `ACESSOS_UNIDADES` referencia um nó selecionável e concede acesso a ele e a seus descendentes.

## Busca e carregamento

Em um banco SQL, descendentes podem ser buscados por CTE recursiva:

```sql
WITH RECURSIVE arvore AS (
  SELECT id, forum_id, pai_id, nome, 0 AS nivel
  FROM unidades_organizacionais
  WHERE id = :raiz_id

  UNION ALL

  SELECT filho.id, filho.forum_id, filho.pai_id, filho.nome, pai.nivel + 1
  FROM unidades_organizacionais filho
  JOIN arvore pai ON filho.pai_id = pai.id
  WHERE filho.ativo = TRUE
)
SELECT * FROM arvore;
```

No Google Sheets não há CTE. A implementação lê cada aba uma vez, cria mapas `id → nó` e `pai → filhos` e percorre a árvore em memória em `O(n + c)`, onde `n` é a quantidade de nós e `c` a de contatos. Não se deve fazer `getRange()` ou busca de linha dentro de cada passo da recursão.

A busca mantém os ancestrais quando um descendente casa, produz `caminhoNomes` para breadcrumb e limita a travessia a 50 níveis como proteção contra dados corrompidos.

## Cuidados obrigatórios

- rejeitar `PAI_ID = ID`;
- rejeitar pai inexistente ou de outro `FORUM_ID`;
- detectar ciclos antes de renderizar ou autorizar;
- ordenar apenas irmãos por `ORDEM`;
- preservar IDs na migração para não quebrar acessos e histórico;
- não inferir relações profundas a partir de texto livre em `OBSERVACAO`;
- manter `CONTATOS` normalizada;
- validar permissões no servidor usando os ancestrais do nó.

## Migração do catálogo atual

- 203 registros de `UNIDADES` viraram nós-raiz selecionáveis;
- 438 registros de `SETORES` viraram filhos, preservando seus IDs;
- 1.483 registros de `CONTATOS` receberam a coluna canônica `UNIDADE_ORGANIZACIONAL_ID` quando existia vínculo legado;
- `UNIDADES` e `SETORES` foram preservadas para rollback.

O catálogo atual não contém todos os níveis intermediários como linhas próprias. Assim, relações como `10ª Secretaria Inteligente → 1º JEC → Gabinete do Juiz 1º JEC` devem ser cadastradas explicitamente em novas linhas e `PAI_ID`; a migração não transforma texto de `OBSERVACAO` em relações sem confirmação oficial.
