# Sistema Inteligente de Gestão de Contatos do PJES

Sistema Web App do **Poder Judiciário do Estado do Espírito Santo (TJES)** para consulta e gestão de contatos institucionais, construído com **Google Apps Script + Google Sheets**.

## Arquitetura atual

```text
MUNICIPIOS
    ↓
  FORUM
    ↓
 UNIDADES
    ↓
 SETORES
    ↓
 CONTATOS
```

A aba `TELEFONES` não faz parte da arquitetura operacional e não deve ser recriada.

## Regras principais

- Município pode possuir um ou vários Fóruns.
- Município com um único Fórum pode abrir diretamente o Fórum na consulta.
- Fórum possui endereço, e-mail (não necessariamente) e contatos gerais próprios.
- Unidade pertence a um Fórum e pode possuir endereço/e-mail próprios.
- Telefones, ramais e WhatsApps pertencem aos setores quando a fonte indicar isso.
- E-mail e endereço são herdados para visualização quando não houver dado próprio.
- Contatos podem estar diretamente vinculados ao Fórum ou, quando previsto pelo schema, diretamente à Unidade.
- A ordem funcional deve respeitar `ORDEM`; quando ausente, preserva-se a ordem física da planilha.
- `Protocolo • Distribuição` permanece como uma única entidade quando assim estiver na fonte.

## Consulta pública

O mapa responsivo do Espírito Santo permanece na consulta. No desktop ele integra o layout; no mobile é apresentado no topo. A navegação é Município → Fórum → Unidade → Setor → Contato, com busca por unidade, setor, telefone, ramal, WhatsApp e e-mail.

## Backend e compatibilidade

O frontend mantém os nomes históricos de API para evitar regressões, mas `APIJS.html` agora direciona os caminhos de listagem, pesquisa, CRUD, histórico, usuário e dashboard para a integração V4 em `16_ForumV4Integration.gs`.

Essa camada opera diretamente sobre `CONTATOS` e usa `FORUM_ID`, `UNIDADE_ID` e `SETOR_ID`, preservando contatos diretos do Fórum e a herança de endereço/e-mail.

## Autenticação e controle de acesso

O sistema não possui senha própria. A identidade administrativa vem exclusivamente de `Session.getActiveUser().getEmail()` na implantação privada. E-mail e senha enviados pelo navegador nunca são aceitos como credenciais.

Existem dois ambientes independentes, em dois projetos do Apps Script e com bases de dados separadas por finalidade:

- **Público (`APP_MODE=PUBLIC`)**: consulta anônima. A ausência de `APP_MODE` e qualquer valor diferente de `PRIVATE` também caem neste modo. Nenhum registro de `USUARIOS` pode elevar privilégios nesta URL.
- **Privado (`APP_MODE=PRIVATE`)**: identifica a conta Google e valida `USUARIOS`. É o único ambiente que expõe entrada, solicitação e ferramentas administrativas.

Dois projetos são necessários para uma separação confiável porque propriedades de script são compartilhadas por todas as implantações do mesmo projeto. Não use parâmetro de URL, dado do cliente ou comparação de URL como decisão de segurança.

- **Base institucional canônica**: fica na conta institucional e contém catálogo, usuários, acessos, solicitações, histórico, configuração e logs. Somente o projeto Interno usa essa base.
- **Espelho público sanitizado**: pode ficar na conta pessoal que hospeda o projeto Externo e contém apenas `MUNICIPIOS`, `FORUM`, `UNIDADES`, `SETORES`, `CONTATOS` e `TELEFONES_UTEIS`.

Embora um projeto independente consiga abrir uma planilha compartilhada por ID, não se deve compartilhar a base institucional completa com o projeto externo: ela contém dados e rotinas administrativas que não pertencem à superfície pública. O projeto Interno publica somente as abas permitidas no espelho por `18_PublicacaoService.gs`.

Na aba `USUARIOS`, o schema é exatamente `ID | NOME | EMAIL | NIVEL | ATIVO`:

- `NIVEL=1`: Gestor de Conteúdo. Pode editar somente Unidades com vínculo ativo em `ACESSOS_UNIDADES` para o seu `USUARIO_ID`. Lista vazia significa **nenhum acesso**, nunca acesso global.
- `NIVEL=2`: Gestor do Sistema. Possui escopo global e não depende de vínculos.
- `ATIVO`: `SIM` ou `NÃO`. Conta desativada permanece em Consulta e recebe aviso.

Na URL privada, a validação é automática ao abrir a página. O botão **Sair** grava `pjes_usuario_clicou_sair=true` no `sessionStorage` e recarrega a página. Enquanto essa marca existir, a interface respeita o modo Consulta; o botão **Entrar na Área Administrativa** remove a marca e repete a validação Google. Esse logout é um estado da interface e não encerra a conta Google do navegador; todas as mutações continuam sendo autorizadas novamente no servidor.

Conta institucional ainda não cadastrada pode solicitar acesso. O e-mail é sempre obtido pelo servidor; o formulário recebe nome, nível desejado e, para nível 1, as Unidades. Gestores de Conteúdo também podem usar o formulário para solicitar Unidades adicionais; a aprovação preserva os vínculos existentes e acrescenta os novos. O Dashboard é administrativo e fica oculto no ambiente público e para usuários sem perfil ativo.

Para testes privados com Gmail, configure uma lista explícita na propriedade `EMAILS_TESTE_PRIVADO`. A exceção só funciona com `APP_MODE=PRIVATE` e somente quando o Google efetivamente disponibiliza o e-mail para `Session.getActiveUser()`.

## Abas principais

- `MUNICIPIOS`
- `FORUM`
- `UNIDADES`
- `SETORES`
- `CONTATOS`
- `TELEFONES_UTEIS`
- `USUARIOS`
- `ACESSOS_UNIDADES`
- `SOLICITACOES_ACESSO`
- `NOTIFICACOES`
- `HISTORICO`
- `CONFIGURACAO`
- `LOG`


## Instalação e validação

1. Crie dois projetos **independentes** do Apps Script: `PJES Contatos - Interno`, na conta institucional, e `PJES Contatos - Externo`, na conta pessoal. Em **Configurações do projeto → Propriedades do script**, crie `SETUP_SECRET` com um valor aleatório de pelo menos 20 caracteres, diferente em cada projeto.
2. Mantenha a planilha completa na conta institucional. No projeto Interno, configure `PLANILHA_VINCULADA_ID` com o ID dessa base canônica. Em projeto vinculado à planilha, o wrapper visível `registrarPlanilhaVinculadaEditor()` registra novamente a base ativa sem exigir que o operador informe o segredo manualmente.
3. Crie uma planilha vazia na conta pessoal para o catálogo público e compartilhe-a como **Editor** somente com a conta institucional que executará a publicação. Não crie nem copie abas administrativas nela. No projeto Externo, configure `PLANILHA_VINCULADA_ID` com o ID desse espelho.
4. Configure no projeto Externo: `APP_MODE=PUBLIC`, `URL_PUBLICA` e `URL_PRIVADA`. A função protegida `configurarAmbientePublico(segredo, urlPublica, urlPrivada)` permanece disponível para automação via Apps Script API. Não execute o instalador neste projeto.
5. Configure no projeto Interno: `APP_MODE=PRIVATE`, `URL_PUBLICA`, `URL_PRIVADA`, `PLANILHA_PUBLICA_ID` com o ID do espelho e, se necessário, `EMAILS_TESTE_PRIVADO`. A função protegida `configurarAmbientePrivado(segredo, urlPublica, urlPrivada, emailsTeste)` é a alternativa programática.
6. Para a migração inicial em que a planilha pessoal esteja mais atual, configure também `PLANILHA_FONTE_MIGRACAO_ID`. Compartilhe essa fonte como Leitora com a conta institucional e execute `importarCatalogoParaBaseInstitucionalEditor()` no editor Interno. Antes de alterar a base, a função cria automaticamente um backup integral na conta institucional; depois substitui somente o conteúdo das seis abas públicas e preserva todas as abas administrativas. Após validar a migração, remova o compartilhamento da fonte pessoal e apague a propriedade de migração.
7. Pelo botão **Executar** do editor Interno, execute `instalarSistemaForumEditor()`. Esse wrapper visível no editor é restrito ao operador institucional autorizado. A versão programática `instalarSistemaForum(segredo)` exige o segredo, impedindo que a rotina seja disparada sem autorização. A rotina:
   - preserva as abas operacionais e não cria `TELEFONES`;
   - normaliza `USUARIOS` para as cinco colunas vigentes e converte `ATIVO` para `SIM`/`NÃO`;
   - garante `SOLICITACOES_ACESSO` e `ACESSOS_UNIDADES`;
   - remove o trigger legado de e-mails;
   - remove `EMAILS_PENDENTES` somente se estiver vazia. Se houver registros, a migração é interrompida e exige revisão manual para evitar perda silenciosa.
8. Ainda no projeto Interno, execute `publicarCatalogoExterno()` uma vez e confira o espelho. Depois execute `instalarTriggerPublicacaoDiaria()` para atualizar somente as seis abas públicas diariamente. A publicação recusa um destino que contenha qualquer aba administrativa.
9. Execute `validarSegurancaAutenticacao()` nos dois projetos. No Externo, confirme `modo: PUBLIC`, ausência de abas restritas e presença das seis abas públicas; no Interno, confirme `modo: PRIVATE` e o e-mail identificado.
10. Execute `validarIntegridadeForumV4()` e `validarDadosReaisForumV4()` no projeto Interno para validar a estrutura operacional:
   - abas obrigatórias;
   - ausência de `TELEFONES`;
   - IDs duplicados;
   - referências `FORUM_ID`, `UNIDADE_ID` e `SETOR_ID` válidas;
   - contatos órfãos.

A verificação de conteúdo contra o PDF do catálogo e a planilha deve continuar sendo feita contra os arquivos oficiais antes de qualquer correção de dados. Nesta etapa, o PDF foi mantido fora da pasta local e nenhum dado da planilha foi alterado.
Link do repositório: https://github.com/EnzoMoulin/Sistema-de-Telefones-do-PJES

## Deploy

Use uma única pasta Git como fonte de código. Os arquivos locais `.clasp.externo.json` e `.clasp.interno.json` selecionam projetos diferentes e ficam ignorados pelo Git; os arquivos `.example` versionados documentam o formato. A pasta atual está configurada como alvo **Externo** no arquivo local `.clasp.externo.json`. Depois de obter o Script ID institucional, copie `.clasp.interno.json.example` para `.clasp.interno.json` e preencha o ID.

Autentique cada conta uma vez com perfis nomeados:

```bash
clasp --user pessoal login
clasp --user institucional login
```

Confira e envie explicitamente cada alvo:

```bash
./scripts/clasp-alvo.sh externo status
./scripts/clasp-alvo.sh externo push
./scripts/clasp-alvo.sh interno status
./scripts/clasp-alvo.sh interno push
```

O manifesto local não fixa `webapp.access`; configure cada implantação na interface do Apps Script:

- **Pública**: executar como o desenvolvedor; acesso para qualquer pessoa, inclusive anônima.
- **Privada**: executar como o desenvolvedor; acesso para o domínio TJES. Para testes domésticos, use temporariamente acesso para contas Google e mantenha a allowlist explícita.

Depois de `clasp push`, crie uma nova versão/implantação em cada projeto e execute novamente `validarSegurancaAutenticacao()`. Nunca configure `APP_MODE=PRIVATE` no projeto Externo.

Não use `clasp redeploy` diretamente com o manifesto neutro: uma versão sem a seção `webapp` perde o ponto de entrada e a URL passa a retornar página não encontrada. Para implantação via CLI, gere a versão Externa com `webapp.access=ANYONE_ANONYMOUS` e a Interna com `webapp.access=DOMAIN`, ambas com `executeAs=USER_DEPLOYING`. Depois restaure o manifesto neutro local. Pela interface do Apps Script, selecione os níveis equivalentes ao atualizar a implantação.

As contas do GitHub não precisam coincidir com as contas Google dos projetos Apps Script. Para evitar versões divergentes, prefira um repositório canônico ou dois remotes do mesmo repositório local, em vez de duplicar a pasta e manter duas cópias manuais do código.

### Propriedades por instalação

Não versione IDs reais, URLs de implantação, e-mails ou segredos. Cadastre-os somente em **Configurações do projeto → Propriedades do script** e mantenha os arquivos `.clasp.*.json` reais ignorados pelo Git.

No projeto Interno, configure:

```text
APP_MODE=PRIVATE
PLANILHA_VINCULADA_ID=<ID_DA_BASE_INSTITUCIONAL>
PLANILHA_FONTE_MIGRACAO_ID=<ID_DA_FONTE_TEMPORARIA>
PLANILHA_PUBLICA_ID=<ID_DO_ESPELHO_PUBLICO>
URL_PUBLICA=<URL_DO_WEB_APP_EXTERNO>
URL_PRIVADA=<URL_DO_WEB_APP_INTERNO>
OPERADORES_INSTALACAO=<EMAIL_DOS_OPERADORES_AUTORIZADOS>
```

No projeto Externo, configure:

```text
APP_MODE=PUBLIC
PLANILHA_VINCULADA_ID=<ID_DO_ESPELHO_PUBLICO>
URL_PUBLICA=<URL_DO_WEB_APP_EXTERNO>
URL_PRIVADA=<URL_DO_WEB_APP_INTERNO>
```

A função `configurarInstalacaoReal()` valida as propriedades cadastradas e gera um `SETUP_SECRET` aleatório quando necessário. Ela não contém valores específicos da instalação e pode ser executada pelo editor ou por `clasp run configurarInstalacaoReal` quando a implantação da API Executable estiver disponível.

O manifesto habilita a Apps Script Execution API com acesso `MYSELF`, exclusivamente para que o proprietário execute rotinas administrativas por `clasp run`. Isso não concede execução a visitantes das URLs Web App.
