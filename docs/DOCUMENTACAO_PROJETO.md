# Diretório Institucional de Contatos - PJES

## Documentação Executiva e Técnica

**Projeto:** Diretório Institucional de Contatos do Poder Judiciário do Estado do Espírito Santo (PJES/TJES)  
**Versão do sistema:** 5.0  
**Tecnologia principal:** Google Apps Script + Google Sheets + Web App  
**Repositório:** `EnzoMoulin/Sistema-de-Telefones-do-PJES`

---

## 1. Visão geral

O **Diretório Institucional de Contatos - PJES** é uma aplicação web destinada à **consulta, organização e gestão centralizada dos contatos institucionais** do Poder Judiciário do Estado do Espírito Santo.

A solução substitui uma abordagem baseada em listas dispersas de telefones por uma estrutura hierárquica que representa a organização institucional e permite localizar contatos de forma mais rápida e controlada.

A versão atual adota o seguinte modelo conceitual:

```text
MUNICÍPIO / ÓRGÃO
       │
       ├── FÓRUM (quando aplicável)
       │      │
       │      └── UNIDADES ORGANIZACIONAIS
       │              │
       │              ├── Unidade
       │              │    └── Setor
       │              │         └── Contatos
       │              │
       │              └── Estruturas adicionais
       │
       └── UNIDADES ORGANIZACIONAIS diretamente vinculadas ao Órgão
```

O projeto mantém compatibilidade com estruturas legadas de versões anteriores, enquanto a arquitetura V5 utiliza como fonte operacional principal **MUNICIPIOS → FORUM → UNIDADES_ORGANIZACIONAIS → CONTATOS**.

---

## 2. Objetivos do projeto

### Objetivo principal

Disponibilizar um diretório institucional único, atualizado e pesquisável para os contatos do PJES.

### Objetivos específicos

- Centralizar os dados institucionais de contato.
- Organizar os contatos de acordo com a estrutura administrativa real.
- Facilitar a busca por telefone, ramal, WhatsApp e e-mail.
- Permitir manutenção controlada dos dados.
- Registrar alterações para fins de rastreabilidade.
- Separar consulta pública de operações administrativas.
- Restringir a edição conforme o perfil e o escopo de atuação do usuário.
- Reduzir duplicidades e inconsistências de cadastro.
- Permitir evolução da base de dados sem depender de uma aplicação servidor tradicional.

---

## 3. Público e perfis de utilização

### 3.1 Consulta pública

A interface pública é destinada à consulta dos contatos institucionais. As permissões **VISUALIZAR** e **PESQUISAR** são disponibilizadas no contexto público, enquanto operações administrativas exigem contexto privado.

### 3.2 Gestor de Conteúdo

Responsável pela manutenção dos dados dentro do escopo de unidades/comarcas para o qual possui autorização.

O sistema calcula esse escopo a partir dos vínculos existentes e filtra os dados retornados pela API para impedir que um gestor de conteúdo atue fora da sua área autorizada.

### 3.3 Gestor do Sistema

Possui o nível administrativo mais alto previsto na aplicação, podendo operar funcionalidades administrativas e não ficando limitado ao escopo de unidades utilizado pelo Gestor de Conteúdo.

### Perfis definidos no sistema

| Perfil | Finalidade |
|---|---|
| `USUARIO_CONSULTA` | Consulta pública dos contatos |
| `GESTOR_CONTEUDO` | Manutenção de conteúdo dentro do escopo autorizado |
| `GESTOR_SISTEMA` | Administração ampla do sistema |

Os níveis configurados são `1` para Gestor de Conteúdo e `2` para Gestor do Sistema.

---

## 4. Arquitetura da solução

A aplicação utiliza **Google Apps Script** como camada de aplicação/backend e **Google Sheets** como persistência estruturada dos dados.

### Componentes principais

```text
┌──────────────────────────────┐
│          Usuário             │
│ navegador / Web App          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        Interface Web         │
│ HTML / CSS / JavaScript      │
└──────────────┬───────────────┘
               │ chamadas
               ▼
┌──────────────────────────────┐
│      Google Apps Script      │
│ API + Serviços + Repositório │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Google Sheets│  │ Propriedades │
│ dados        │  │ do Script    │
└──────────────┘  └──────────────┘
```

A configuração do projeto utiliza runtime **V8**, fuso horário `America/Sao_Paulo` e registro de exceções via Stackdriver/Cloud Logging.

---

## 5. Estrutura de dados

### 5.1 Estrutura organizacional

A arquitetura atual utiliza:

- `MUNICIPIOS`: catálogo territorial/institucional.
- `FORUM`: fóruns vinculados aos municípios/comarcas.
- `UNIDADES_ORGANIZACIONAIS`: árvore de unidades e setores.
- `CONTATOS`: registros dos meios de contato.
- `TELEFONES_UTEIS`: contatos gerais/utilitários.

### 5.2 Administração e controle

A solução possui também estruturas específicas para:

- `USUARIOS`
- `ACESSOS_UNIDADES`
- `SOLICITACOES_ACESSO`
- `NOTIFICACOES`
- `HISTORICO`
- `CONFIGURACAO`
- `LOG`

Essas abas são tratadas como **restritas** e não fazem parte do catálogo público de dados.

### 5.3 Compatibilidade e migração

As estruturas `UNIDADES`, `SETORES` e `TELEFONES` continuam definidas para compatibilidade, migração e/ou rollback de versões anteriores. A configuração V5 informa explicitamente que a aba `TELEFONES` não é a fonte operacional da arquitetura atual.

---

## 6. Modelo de contato

Cada registro de contato possui uma identificação e vínculos com a estrutura organizacional, além de dados como tipo, valor, descrição, ordem, datas, situação e observações.

Campos definidos para contatos incluem:

- `ID`
- `FORUM_ID`
- `UNIDADE_ORGANIZACIONAL_ID`
- `UNIDADE_ID` e `SETOR_ID` para compatibilidade/legado
- `TIPO`
- `DESCRICAO`
- `VALOR`
- `ORDEM`
- `DATA_CRIACAO`
- `DATA_ATUALIZACAO`
- `ATIVO`
- `OBSERVACAO`

Essa modelagem permite que telefone, ramal, WhatsApp e e-mail sejam tratados como diferentes **tipos de contato**, em vez de obrigar que cada entidade tenha uma quantidade fixa de colunas para cada canal.

---

## 7. Regras de negócio e validação

O sistema possui uma camada específica de validação antes da gravação dos contatos.

### Regras relevantes

1. Deve existir vínculo com a estrutura organizacional conforme o modelo utilizado.
2. O tipo do contato é obrigatório na arquitetura normalizada.
3. Deve ser informado pelo menos um meio de contato.
4. O cadastro aceita **um único meio de contato por registro**.
5. O campo preenchido deve ser compatível com o tipo selecionado.
6. E-mails passam por validação de formato.
7. Telefones, ramais e WhatsApp passam por validação de caracteres e quantidade de dígitos.
8. O sistema verifica duplicidade de telefone dentro do setor.
9. O status do registro é validado como `ATIVO` ou `INATIVO`.

Essa camada reduz entradas inconsistentes e torna a manutenção da base mais confiável.

---

## 8. Pesquisa e consulta

A API disponibiliza operações de consulta e pesquisa sobre os contatos.

A pesquisa trabalha com dados institucionais e pode ser utilizada para localizar registros por informações como:

- Unidade;
- Setor;
- Telefone;
- Ramal;
- WhatsApp;
- E-mail.

Há também uma regra mínima de tamanho para pesquisas textuais: termos com menos de dois caracteres são rejeitados como consulta efetiva.

Na consulta de listas e comarcas, o sistema procura preservar a ordem definida pelo catálogo `MUNICIPIOS`, em vez de depender exclusivamente da ordem alfabética derivada dos contatos.

---

## 9. Autenticação e autorização

A área administrativa utiliza a **identidade Google da implantação privada**, com validação do domínio institucional configurado como `tjes.jus.br`.

### Controle por contexto

A aplicação trabalha com dois contextos:

- `PUBLIC`: acesso público para consulta;
- `PRIVATE`: acesso administrativo.

Operações administrativas são recusadas quando executadas pela URL pública.

### Autorização por perfil e escopo

Além do perfil, o sistema considera vínculos do usuário com unidades. Gestores de Conteúdo recebem somente os dados relacionados às unidades/comarcas autorizadas, enquanto o Gestor do Sistema possui escopo administrativo amplo.

O próprio serviço de autenticação implementa verificações específicas para:

- contexto privado;
- usuário ativo;
- perfil válido;
- domínio autorizado;
- permissão de edição de unidade;
- escopo de acesso do usuário.

---

## 10. Auditoria e histórico

Alterações podem ser registradas na aba `HISTORICO` com informações de:

- identificador do evento;
- identificador do registro alterado;
- ação executada;
- estado anterior;
- estado posterior;
- usuário responsável;
- data/hora.

Os estados anterior e posterior são armazenados em formato estruturado, permitindo reconstruir o contexto da alteração.

O registro utiliza `LockService` para evitar concorrência na geração e gravação do evento de histórico.

Além disso, existe uma camada de `LOG` para tratamento e registro de ocorrências do sistema.

---

## 11. Cache e desempenho

O projeto possui um serviço de cache próprio e configura um tempo padrão de **300 segundos (5 minutos)** para dados de consulta hierárquica.

A chave principal configurada para esse catálogo é `CONTATOS_HIERARQUIA_V5`.

O objetivo é reduzir leituras repetitivas da planilha e melhorar a resposta da aplicação durante consultas recorrentes.

---

## 12. API da aplicação

A API interna do projeto padroniza as respostas em dois formatos principais:

### Sucesso

```json
{
  "sucesso": true,
  "dados": {}
}
```

### Erro

```json
{
  "sucesso": false,
  "erro": "Mensagem do erro"
}
```

Os dados também passam por serialização antes de serem retornados pela API, reduzindo problemas com valores não serializáveis na comunicação entre backend e interface.

Entre as operações principais encontram-se:

- carregamento do sistema;
- listagem de contatos;
- listagem de comarcas;
- pesquisa de contatos;
- operações administrativas protegidas por autenticação e permissão.

---

## 13. Organização do código

A estrutura do projeto separa responsabilidades em arquivos de serviço:

```text
src/
├── appsscript.json
├── backend/
│   ├── 01_Config.gs
│   ├── 02_Utils.gs
│   ├── 03_Database.gs
│   ├── 04_TelefoneRepository.gs
│   ├── 05_HistoryService.gs
│   ├── 06_ValidationService.gs
│   ├── 07_IdService.gs
│   ├── 08_CacheService.gs
│   ├── 09_LogService.gs
│   ├── 10_AuthService.gs
│   └── 11_API.gs
└── ... interface / módulos complementares
```

### Responsabilidade das principais camadas

| Componente | Responsabilidade |
|---|---|
| `Config` | parâmetros, nomes de abas, perfis, permissões e limites |
| `Utils` | funções utilitárias e normalização |
| `Database` | acesso à planilha e suas abas |
| `TelefoneRepository` | leitura, criação, edição, exclusão e pesquisa de contatos |
| `HistoryService` | auditoria e histórico |
| `ValidationService` | regras de validação e duplicidade |
| `IdService` | geração de identificadores |
| `CacheService` | cache de dados de consulta |
| `LogService` | registro técnico de eventos/erros |
| `AuthService` | autenticação, perfis e escopos |
| `API` | interface entre frontend e backend |

Essa separação reduz acoplamento e facilita manutenção e evolução do sistema.

---

## 14. Implantação e versionamento

O código é versionado no **GitHub** e possui automação de implantação para o Google Apps Script via **GitHub Actions + Clasp**.

O workflow atual é disparado a cada `push` na branch `main` e executa, entre outras etapas:

1. checkout do repositório;
2. configuração do Node.js 20;
3. instalação do `@google/clasp`;
4. carregamento de credencial por Secret do GitHub;
5. seleção da configuração do projeto;
6. `clasp push -f` para publicação do código no Apps Script.

Isso estabelece um fluxo reprodutível entre o código versionado e o ambiente de execução.

---

## 15. Segurança operacional

A solução adota algumas medidas relevantes para um sistema corporativo baseado em Apps Script:

- separação entre implantação pública e privada;
- autenticação pela identidade Google na área administrativa;
- validação de domínio institucional;
- perfis com níveis distintos;
- controle de escopo por unidade;
- bloqueio de operações administrativas na URL pública;
- abas administrativas separadas das abas públicas;
- uso de `LockService` em operações sensíveis de histórico;
- utilização de propriedades do script para parâmetros de implantação;
- credenciais de implantação mantidas por Secrets no GitHub Actions.

> **Observação:** a segurança efetiva em produção depende também das configurações das implantações, permissões da planilha, contas autorizadas e Secrets configurados no ambiente.

---

## 16. Benefícios institucionais

### Centralização

Um único diretório reduz a dispersão de listas e versões diferentes de contatos.

### Agilidade

A pesquisa por múltiplos campos reduz o tempo necessário para localizar uma unidade ou canal de atendimento.

### Padronização

A validação técnica evita registros incompatíveis e reduz duplicidades.

### Governança

A associação entre usuário, perfil e escopo permite distribuir responsabilidades sem conceder acesso administrativo irrestrito.

### Rastreabilidade

O histórico registra quem alterou os dados, quando alterou e qual foi a mudança realizada.

### Escalabilidade operacional

A hierarquia organizacional permite representar estruturas com ou sem Fórum e acomodar diferentes níveis de organização sem alterar o conceito de contato.

### Baixo custo de infraestrutura

A solução aproveita serviços Google já utilizados no ecossistema institucional, sem exigir um servidor web próprio para sua camada de aplicação.

---

## 17. Fluxo operacional resumido

```text
1. Usuário acessa o diretório
          ↓
2. Sistema identifica contexto público ou privado
          ↓
3. Consulta pública → pesquisa e visualização
          │
          └── acesso privado → autenticação Google
                                  ↓
                              valida perfil
                                  ↓
                            calcula escopo
                                  ↓
                        permite operações autorizadas
                                  ↓
                         valida dados antes de gravar
                                  ↓
                         registra histórico / log
```

---

## 18. Ciclo de manutenção de um contato

```text
Cadastro / edição
       ↓
Validação de campos
       ↓
Validação de duplicidade
       ↓
Verificação de autorização
       ↓
Persistência na planilha
       ↓
Registro da alteração
       ↓
Atualização / invalidação de cache quando aplicável
       ↓
Retorno padronizado à interface
```

Esse fluxo mantém a regra de negócio concentrada no backend, evitando depender exclusivamente de validações realizadas no navegador.

---

## 19. Estado atual e compatibilidade

A versão documentada é a **V5.0**. A base de código mostra uma arquitetura em transição controlada de modelos anteriores para o modelo normalizado atual.

A compatibilidade com estruturas antigas é mantida de forma explícita para apoiar migração, rollback e evolução incremental. A fonte operacional do modelo atual é identificada pelo próprio código como:

```text
MUNICIPIOS
    ↓
FORUM
    ↓
UNIDADES_ORGANIZACIONAIS
    ↓
CONTATOS
```

---

## 20. Considerações para apresentação à gestão

O ponto central do projeto não é apenas o cadastro de números telefônicos. O sistema funciona como um **diretório institucional estruturado**, no qual o contato é associado à organização à qual pertence.

Isso permite evoluir de uma simples lista de telefones para uma solução de gestão de informações institucionais, com:

- estrutura organizacional;
- pesquisa;
- governança de acesso;
- validação;
- auditoria;
- histórico;
- automação de implantação;
- separação entre consulta pública e manutenção administrativa.

Em termos gerenciais, a principal entrega é a transformação de uma informação operacional dispersa em um **cadastro institucional centralizado, pesquisável, rastreável e administrável**.

---

## 21. Referências técnicas no repositório

Arquivos utilizados como principais referências desta documentação:

- `README.md`
- `src/backend/01_Config.gs`
- `src/backend/03_Database.gs`
- `src/backend/05_HistoryService.gs`
- `src/backend/06_ValidationService.gs`
- `src/backend/10_AuthService.gs`
- `src/backend/11_API.gs`
- `src/appsscript.json`
- `.github/workflows/deploy.yml`

---

## 22. Conclusão

O **Diretório Institucional de Contatos - PJES** fornece uma base tecnológica para centralizar e organizar os contatos institucionais do Poder Judiciário do Estado do Espírito Santo, conciliando facilidade de consulta com mecanismos de controle administrativo.

A arquitetura baseada em Google Apps Script e Google Sheets simplifica a operação e a manutenção da solução, enquanto a organização modular do código permite evoluções futuras sem depender de uma reescrita integral do sistema.

A versão V5 estabelece uma base mais adequada para crescimento do diretório ao representar explicitamente a estrutura institucional e separar dados públicos, administração, permissões, auditoria e serviços de suporte.
