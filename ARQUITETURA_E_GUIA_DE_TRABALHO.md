# Arquitetura e guia de trabalho econômico

Este arquivo é o índice rápido do projeto. Antes de ler código, consulte a seção relacionada à tarefa e abra apenas os arquivos indicados. Ele não substitui o código: se houver divergência, o código e os testes/validações executados prevalecem, e este índice deve ser atualizado.

## 1. Resumo operacional

- Stack: Google Apps Script V8, HTML/CSS/JavaScript no cliente e Google Sheets como banco.
- Entrada web: `Main.gs` (`doGet`, composição de templates e `include`).
- Configuração central: `01_Config.gs` (`CONFIG`, nomes das abas, perfis, permissões e limites).
- Acesso ao banco: `03_Database.gs`.
- API pública para o cliente: `11_API.gs`.
- Arquitetura vigente: V5, `MUNICIPIOS -> FORUM -> UNIDADES_ORGANIZACIONAIS` (árvore) `-> CONTATOS`.
- V4: `UNIDADES` e `SETORES` permanecem para migração/compatibilidade; não tratar como fonte operacional V5 sem confirmação.

## 2. Mapa por tipo de tarefa

| Tarefa | Leia primeiro | Leia/edite depois, somente se necessário |
|---|---|---|
| Nova regra de negócio, aba, campo ou limite | `01_Config.gs`, `MODELAGEM_V5.md`, `03_Database.gs` | `12_Install.gs`, `04_TelefoneRepository.gs`, `11_API.gs`, planilha afetada |
| Consulta pública, busca ou filtros | `ConsultarJS.html`, `SearchJS.html`, `11_API.gs` | `DashboardJS.html`, HTML da tela afetada |
| Dashboard/mapa/impressão pública | `Dashboard.html`, `DashboardJS.html`, `ConsultarJS.html` | `CSS.html`, `11_API.gs` |
| Cadastro/edição/exclusão de contatos | `ModalTelefone.html`, `ModalJS.html`, `04_TelefoneRepository.gs`, `11_API.gs` | `TableJS.html`, `05_HistoryService.gs`, `09_LogService.gs` |
| Login, perfis, permissões e acesso | `10_AuthService.gs`, `11_API.gs`, `01_Config.gs` | `UsuariosJS.html`, `FormularioAcesso.html`, `SolicitacoesJS.html` |
| Usuários e solicitações | `Usuarios.html`, `UsuariosJS.html`, `Solicitacoes.html`, `SolicitacoesJS.html`, `11_API.gs` | `10_AuthService.gs`, abas internas |
| Histórico/auditoria/log | `05_HistoryService.gs`, `09_LogService.gs`, `17_AuditoriaMigracaoV4.gs` | `RegistroAlteracoesJS.html`, `11_API.gs` |
| Publicação externo/interno | `18_PublicacaoService.gs`, `01_Config.gs` | `03_Database.gs`, planilhas Externo/Interno |
| Migração ou integridade V4/V5 | `MODELAGEM_V5.md`, `18_MigracaoHierarquiaOrganizacional.gs`, `16_ForumV4Integration.gs`, `17_AuditoriaMigracaoV4.gs` | `14_ForumAPI.gs`, `18_PublicacaoService.gs` |
| Instalação/estrutura do banco | `12_Install.gs`, `03_Database.gs`, `01_Config.gs` | somente a planilha e os cabeçalhos diretamente envolvidos |
| Estilo/layout/componentes compartilhados | `Layout.html`, `CSS.html`, `AppJS.html`, `index.html` | tela específica e JS específico |
| Integração Fórum | `13_ForumContatoService.gs`, `14_ForumAPI.gs`, `15_ForumInstallation.gs`, `16_ForumV4Integration.gs` | `11_API.gs`, `18_MigracaoHierarquiaOrganizacional.gs` |

## 3. Arquivos de suporte

### Organização local

- `src/` contém todo o código publicado pelo Clasp e o `appsscript.json`.
- `src/backend/` contém os arquivos `.gs`, incluindo `src/backend/Main.gs`, a entrada web da aplicação (`doGet`, templates e `include`).
- `src/frontend/` contém os arquivos `.html` de telas, estilos e JavaScript cliente.
- `data/` contém planilhas locais `.xlsx` e não faz parte do pacote sincronizado.
- `scripts/` contém ferramentas auxiliares de desenvolvimento local, como `scripts/clasp-alvo.sh`.
- As configurações `.clasp.*.json.example` usam `rootDir: "src"`; arquivos `.clasp.*.json` reais permanecem locais por conterem identificadores/configurações do ambiente.

- `02_Utils.gs`: normalização, conversões, datas, serialização e utilidades compartilhadas.
- `06_ValidationService.gs`: validações de dados e regras de entrada.
- `07_IdService.gs`: geração/controle de identificadores.
- `08_CacheService.gs`: cache da hierarquia/contatos.
- `09_LogService.gs`: registro técnico de operações.
- `11_API.gs`: fachada principal chamada por `google.script.run`; mudanças aqui têm alto impacto.
- `13_ForumContatoService.gs`: regras de contatos relacionadas ao Fórum.
- `Toast.html`/`ToastJS.html`: mensagens toast.
- `APIJS.html`: camada cliente de chamadas à API.
- `Notificacoes.html`/`NotificacoesJS.html`: notificações.
- `RegistroAlteracoes.html`/`RegistroAlteracoesJS.html`: visualização do histórico.
- `scripts/clasp-alvo.sh`: seleção do alvo clasp; não editar sem necessidade.
- `README.md`: visão geral curta para humanos.
- `MODELAGEM_V5.md`: decisões arquiteturais e schema V5; consultar antes de mudar a modelagem.
- `.clasp.*.json.example`: exemplos de configuração, sem segredos.

## 4. Banco e planilhas

Fonte estrutural V5 nas duas planilhas: `MUNICIPIOS`, `FORUM`, `UNIDADES_ORGANIZACIONAIS`, `CONTATOS`, `TELEFONES_UTEIS`.

Planilha Interno também contém: `USUARIOS`, `SOLICITACOES_ACESSO`, `ACESSOS_UNIDADES`, `NOTIFICACOES`, `HISTORICO`, `CONFIGURACAO`, `LOG`, além das abas legadas `UNIDADES`, `SETORES` e auxiliares `__mapa`, `__validacao`.

Planilha Externo contém as abas públicas V5 e as legadas `UNIDADES`/`SETORES`. A lista de abas públicas/restritas deve ser conferida em `CONFIG.PUBLICACAO` antes de alterar publicação.

Cabeçalhos canônicos são criados/garantidos em `12_Install.gs`; não inventar nomes de colunas em uma função isolada.

## 5. Regra de leitura e edição mínima

1. Classifique o pedido em uma linha da tabela acima.
2. Leia o arquivo “primeiro” e procure os símbolos/fluxo envolvidos.
3. Abra apenas os dependentes necessários; prefira `rg -n "nomeDaFuncao|nomeDaAba|idDoElemento" arquivo`.
4. Edite o menor conjunto de arquivos possível.
5. Se mudar contrato de API, aba, campo, permissão ou fluxo V5/V4, atualize este arquivo e `MODELAGEM_V5.md` quando aplicável.
6. Valide com o teste/validador mais próximo; não faça varredura integral por padrão.
7. No relatório final, informe arquivos lidos, arquivos alterados e validações executadas.

## 6. Prompt econômico recomendado

Use este formato nos próximos pedidos:

> Consulte `ARQUITETURA_E_GUIA_DE_TRABALHO.md`. Tarefa: [resultado exato]. Escopo: [tela/função/aba]. Leia primeiro: [arquivos, se souber]. Não leia/edite fora do escopo sem justificar. Preserve V5 e compatibilidade V4. Faça a menor alteração possível. Valide com [comando/critério] e retorne arquivos alterados, teste e riscos.

Se o pedido for apenas diagnóstico, acrescente: “não altere arquivos”. Se já souber o arquivo, indique-o no prompt; isso costuma economizar mais tokens do que descrever o problema de forma genérica.

## 7. Estratégia de custo e qualidade

- Preferir uma tarefa por mudança coesa; evitar misturar refatoração, visual e banco no mesmo prompt.
- Pedir diff/patch focado, não “revisar o projeto inteiro”.
- Para erros, incluir mensagem exata, arquivo, função e passos para reproduzir.
- Para UI, informar tela, elemento e comportamento esperado; não pedir auditoria visual global.
- Para planilhas, indicar arquivo, aba e faixa; evitar pedir leitura de todas as abas.
- Manter este índice como contexto persistente do projeto; revisar após mudanças estruturais.
- Usar validações incrementais e somente uma revisão ampla quando houver mudança transversal.

## 8. Modelo e esforço

Recomendação econômica padrão:

- Luna + leve: leitura, inventário, documentação, pequenas alterações isoladas e consultas simples.
- Luna + médio: bug localizado ou mudança pequena que exige validação.
- Terra + médio: regra de negócio em vários arquivos, API + UI, planilha/banco ou migração controlada.
- Terra + alto: integração, segurança, publicação e mudanças com impacto transversal.
- Sol + alto/extra alto: arquitetura nova, depuração difícil, migração arriscada ou revisão crítica de segurança.

Evite “máximo” e “ultra” por padrão. Use-os somente quando houver falhas persistentes, alta incerteza ou risco elevado; eles aumentam tempo/custo e não melhoram proporcionalmente uma tarefa bem especificada. O maior ganho vem de reduzir o escopo e fornecer caminhos exatos, não apenas de trocar de modelo.

## 9. Checklist rápido antes de enviar um prompt

- Qual é o resultado observável?
- Qual tela, função, aba ou arquivo está envolvido?
- É diagnóstico ou alteração?
- Quais arquivos podem ser editados?
- Qual comportamento deve ser preservado?
- Qual validação mínima prova que terminou?
