/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 12_Install.gs
 * ==========================================================
 */

/**
 * Instala as abas e os cabeçalhos do sistema.
 */
function instalarSistema() {
  const lock =
    LockService.getScriptLock();

  let bloqueado =
    false;

  try {
    lock.waitLock(30000);

    bloqueado =
      true;

    /*
     * O DB utiliza a planilha ativa quando
     * executado pelo editor e a vinculação salva
     * quando executado pelo Web App.
     */
    const spreadsheet =
      DB.getSpreadsheet();

    criarAbaTelefones(
      spreadsheet
    );

    // V4 — modelo definitivo MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS (mantém TELEFONES legado para compat)
    criarAbaMunicipios(spreadsheet);
    criarAbaForum(spreadsheet);
    criarAbaUnidades(spreadsheet);
    criarAbaSetores(spreadsheet);
    criarAbaContatos(spreadsheet);
    criarAbaTelefonesUteis(spreadsheet);
    criarAbaAcessosUnidades(spreadsheet);

    criarAbaUsuarios(
      spreadsheet
    );

    criarAbaConfiguracao(
      spreadsheet
    );

    criarAbaSolicitacoesAcesso(
      spreadsheet
    );

    criarAbaHistorico(
      spreadsheet
    );

    criarAbaLog(
      spreadsheet
    );

    criarAbaEmailsPendentes(
      spreadsheet
    );

    criarAbaNotificacoes(
      spreadsheet
    );

    garantirGestorInicial(
      spreadsheet
    );

    SpreadsheetApp.flush();

    CACHE.limparTudo();

    return (
      "Sistema instalado com sucesso."
    );
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

/**
 * Registra a planilha vinculada ao projeto.
 *
 * Execute esta função manualmente pelo editor do Apps Script,
 * aberto em:
 *
 * Planilha > Extensões > Apps Script
 */
function registrarPlanilhaVinculada() {
  const spreadsheet =
    DB.registrarPlanilhaAtiva();

  const mensagem =
    "Planilha vinculada com sucesso: " +
    spreadsheet.getName();

  Logger.log(mensagem);

  return mensagem;
}

/**
 * Testa a planilha vinculada e lista suas abas.
 */
function testarPlanilhaVinculada() {
  const spreadsheet =
    DB.getSpreadsheet();

  const resultado = {
    nome:
      spreadsheet.getName(),

    url:
      spreadsheet.getUrl(),

    abas:
      spreadsheet
        .getSheets()
        .map(function (sheet) {
          return sheet.getName();
        })
  };

  Logger.log(
    JSON.stringify(
      resultado,
      null,
      2
    )
  );

  return resultado;
}

/**
 * Cria uma aba caso ela não exista
 * e garante a primeira linha de cabeçalho.
 * Se a aba já existe, adiciona colunas faltantes (V4).
 */
function garantirAbaComCabecalho(
  spreadsheet,
  nome,
  cabecalho
) {
  let sheet =
    spreadsheet.getSheetByName(
      nome
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        nome
      );
  }

  if (
    sheet.getLastRow() === 0
  ) {
    sheet.appendRow(
      cabecalho
    );
    return sheet;
  }
  // V4: garante colunas faltantes sem duplicar
  try {
    const atuais = DB.headers(sheet).map(normalizarChave);
    cabecalho.forEach(function(header){
      if (atuais.indexOf(normalizarChave(header)) === -1) {
        const col = sheet.getLastColumn() + 1;
        sheet.getRange(1, col).setValue(header);
        atuais.push(normalizarChave(header));
      }
    });
  } catch(e) {}
  return sheet;
}

/**
 * Cria a aba TELEFONES.
 */
function criarAbaTelefones(spreadsheet) {
  return garantirAbaComCabecalho(
    spreadsheet,
    CONFIG.SHEETS.TELEFONES,
    [
      "ID",
      "MICRORREGIAO",
      "COMARCA",
      "SETOR",
      "TIPO",
      "TELEFONE",
      "RAMAL",
      "WHATSAPP",
      "E-MAIL",
      "ENDERECO",
      "STATUS",
      "OBSERVACAO",
      "DATA_CRIACAO",
      "DATA_ATUALIZACAO"
    ]
  );
}

/**
 * Cria a aba USUARIOS.
 */
function criarAbaUsuarios(
  spreadsheet
) {
  // v3.34 — detecta modelo: se já existe MUNICIPIOS/CONTATOS, usa NIVEL schema; senão legado PERFIL
  const temNormalizado = !!(spreadsheet.getSheetByName(CONFIG.SHEETS.MUNICIPIOS) && spreadsheet.getSheetByName(CONFIG.SHEETS.CONTATOS));
  const cabecalho = temNormalizado
    ? ["ID","NOME","EMAIL","NIVEL","ATIVO"]
    : [
        "EMAIL",
        "NOME",
        "PERFIL",
        "ATIVO",
        "COMARCAS",
        "SENHA"
      ];
  const sheet =
    garantirAbaComCabecalho(
      spreadsheet,
      CONFIG.SHEETS.USUARIOS,
      cabecalho
    );

  if (!temNormalizado) {
    garantirColunaComarcasUsuarios(
      spreadsheet,
      sheet
    );

    garantirColunaSenhaUsuarios(
      spreadsheet,
      sheet
    );
  } else {
    // v3.34 — normalizado: garante ID/NIVEL se faltarem
    garantirColunaIdNivelUsuarios(spreadsheet, sheet);
  }

  return sheet;
}

/**
 * Migração: garante a coluna COMARCAS na aba USUARIOS
 * de instalações antigas (limitadores de comarca para
 * gestores de conteúdo).
 */
function garantirColunaIdNivelUsuarios(spreadsheet, sheet){
  var headers = DB.headers(sheet);
  var temId = headers.some(function(h){ return normalizarChave(h)==="ID"; });
  var temNivel = headers.some(function(h){ return normalizarChave(h)==="NIVEL"; });
  if(!temId){
    var ultima = sheet.getLastColumn();
    sheet.insertColumns(1,1);
    sheet.getRange(1,1).setValue("ID");
    headers = DB.headers(sheet);
  }
  headers = DB.headers(sheet);
  temNivel = headers.some(function(h){ return normalizarChave(h)==="NIVEL"; });
  if(!temNivel){
    var ultima2 = sheet.getLastColumn();
    sheet.insertColumns(Math.max(ultima2,1)+1,1);
    sheet.getRange(1, Math.max(ultima2,1)+1).setValue("NIVEL");
  }
  return sheet;
}

function garantirColunaComarcasUsuarios(
  spreadsheet,
  sheet
) {
  const headers = DB.headers(sheet);

  const temComarcas =
    headers.some(header =>
      normalizarChave(header) === "COMARCAS"
    );

  if (temComarcas) {
    return sheet;
  }

  const ultimaColuna = sheet.getLastColumn();

  sheet.insertColumns(
    Math.max(ultimaColuna, 1) + 1,
    1
  );

  sheet
    .getRange(1, Math.max(ultimaColuna, 1) + 1)
    .setValue("COMARCAS");

  return sheet;
}

function garantirColunaSenhaUsuarios(spreadsheet, sheet){
  var headers = DB.headers(sheet);
  var tem = headers.some(function(h){ return normalizarChave(h)==="SENHA"; });
  if(tem) return sheet;
  var ultima = sheet.getLastColumn();
  sheet.insertColumns(Math.max(ultima,1)+1, 1);
  sheet.getRange(1, Math.max(ultima,1)+1).setValue("SENHA");
  return sheet;
}

/**
 * Cria a aba de solicitações de acesso.
 *
 * Usa o nome canônico ("Solicitações de Acesso do sistema");
 * se a aba legada "SOLICITACOES_ACESSO" existir, ela é
 * reaproveitada em vez de criar uma duplicata.
 */
function criarAbaSolicitacoesAcesso(
  spreadsheet
) {
  const nomeCanonico =
    CONFIG.SHEETS.SOLICITACOES_ACESSO;

  const nomeLegado =
    CONFIG.SHEETS.SOLICITACOES_ACESSO_LEGADO;

  let sheet =
    spreadsheet.getSheetByName(nomeCanonico) ||
    spreadsheet.getSheetByName(nomeLegado);

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(nomeCanonico);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(
      [
        "ID",
        "EMAIL",
        "NOME",
        "COMARCA",
        "PERFIL_SOLICITADO",
        "JUSTIFICATIVA",
        "STATUS",
        "DATA_SOLICITACAO",
        "APROVADOR",
        "DATA_APROVACAO"
      ]
    );
  }

  garantirColunaComarca(
    spreadsheet,
    sheet
  );

  return sheet;
}

/**
 * Migração: garante a coluna COMARCA na aba
 * SOLICITACOES_ACESSO de instalações antigas.
 *
 * A coluna é inserida logo após NOME, preservando
 * os dados já existentes (as demais colunas são
 * deslocadas para a direita).
 */
function garantirColunaComarca(
  spreadsheet,
  sheet
) {
  const headers = DB.headers(sheet);

  const temComarca =
    headers.some(header =>
      normalizarChave(header) === "COMARCA"
    );

  if (temComarca) {
    return sheet;
  }

  const indiceNome =
    headers.findIndex(header =>
      normalizarChave(header) === "NOME"
    );

  const posicao =
    indiceNome >= 0
      ? indiceNome + 2
      : headers.length + 1;

  sheet.insertColumns(posicao, 1);
  sheet.getRange(1, posicao).setValue("COMARCA");

  return sheet;
}

/**
 * Executa apenas a migração da aba SOLICITACOES_ACESSO
 * (adiciona a coluna COMARCA em instalações antigas).
 */
function atualizarAbaSolicitacoesAcesso() {
  const spreadsheet = DB.getSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.SHEETS.SOLICITACOES_ACESSO
    );

  if (!sheet) {
    throw new Error(
      "Aba SOLICITACOES_ACESSO não encontrada. Execute instalarSistema() primeiro."
    );
  }

  garantirColunaComarca(
    spreadsheet,
    sheet
  );

  SpreadsheetApp.flush();

  return "Coluna COMARCA garantida na aba SOLICITACOES_ACESSO.";
}

/**
 * Cria a aba CONFIGURACAO.
 */
function criarAbaConfiguracao(
  spreadsheet
) {
  const sheet =
    garantirAbaComCabecalho(
      spreadsheet,
      CONFIG.SHEETS.CONFIGURACAO,
      [
        "CHAVE",
        "VALOR"
      ]
    );

  garantirConfiguracao(
    sheet,
    "VERSAO",
    CONFIG.SISTEMA.VERSAO
  );

  return sheet;
}

/**
 * Garante que uma configuração exista.
 */
function garantirConfiguracao(
  sheet,
  chave,
  valor
) {
  const chaveBusca =
    normalizarChave(chave);

  const ultimaLinha =
    sheet.getLastRow();

  if (
    ultimaLinha <= 1
  ) {
    sheet.appendRow([
      chave,
      valor
    ]);

    return;
  }

  const dados =
    sheet.getRange(
      2,
      1,
      ultimaLinha - 1,
      2
    ).getValues();

  for (
    let i = 0;
    i < dados.length;
    i++
  ) {
    if (
      normalizarChave(
        dados[i][0]
      ) === chaveBusca
    ) {
      if (
        String(
          dados[i][1] || ""
        ).trim() === ""
      ) {
        sheet
          .getRange(
            i + 2,
            2
          )
          .setValue(valor);
      }

      return;
    }
  }

  sheet.appendRow([
    chave,
    valor
  ]);
}

/**
 * V4 — Cria aba MUNICIPIOS.
 */
function criarAbaMunicipios(spreadsheet) {
  return garantirAbaComCabecalho(spreadsheet, CONFIG.SHEETS.MUNICIPIOS, ["ID","NOME","CODIGO_IBGE","MICRORREGIAO","ATIVO"]);
}

/**
 * V4 — Cria aba FORUM (MUNICIPIO -> FORUM).
 */
function criarAbaForum(spreadsheet) {
  return garantirAbaComCabecalho(spreadsheet, CONFIG.SHEETS.FORUM, ["ID","MUNICIPIO_ID","NOME","ENDERECO","CEP","EMAIL","ORDEM","ATIVO","OBSERVACAO"]);
}

/**
 * V4 — Cria aba UNIDADES (FORUM -> UNIDADES).
 */
function criarAbaUnidades(spreadsheet) {
  return garantirAbaComCabecalho(spreadsheet, CONFIG.SHEETS.UNIDADES, ["ID","FORUM_ID","MUNICIPIO_ID","NOME","ENDERECO","CEP","EMAIL","ORDEM","ATIVO","OBSERVACAO"]);
}

/**
 * V4 — Cria aba SETORES.
 */
function criarAbaSetores(spreadsheet) {
  return garantirAbaComCabecalho(spreadsheet, CONFIG.SHEETS.SETORES, ["ID","UNIDADE_ID","NOME","ENDERECO","CEP","OBSERVACAO","ORDEM","ATIVO"]);
}

/**
 * V4 — Cria aba CONTATOS (FORUM/UNIDADE/SETOR -> CONTATOS).
 */
function criarAbaContatos(spreadsheet) {
  return garantirAbaComCabecalho(spreadsheet, CONFIG.SHEETS.CONTATOS, ["ID","FORUM_ID","UNIDADE_ID","SETOR_ID","TIPO","DESCRICAO","VALOR","ORDEM","DATA_CRIACAO","DATA_ATUALIZACAO","ATIVO","OBSERVACAO"]);
}

/**
 * v3.34 — Cria aba TELEFONES_UTEIS (p.78).
 */
function criarAbaTelefonesUteis(spreadsheet) {
  return garantirAbaComCabecalho(spreadsheet, CONFIG.SHEETS.TELEFONES_UTEIS, ["ID","NOME","TIPO","VALOR","ATIVO"]);
}

/**
 * v3.34 — Cria aba ACESSOS_UNIDADES (N:N USUARIOS x UNIDADES).
 */
function criarAbaAcessosUnidades(spreadsheet) {
  return garantirAbaComCabecalho(spreadsheet, CONFIG.SHEETS.ACESSOS_UNIDADES, ["ID","USUARIO_ID","UNIDADE_ID","ATIVO"]);
}

/**
 * Garante o primeiro gestor do sistema.
 */
function garantirGestorInicial(
  spreadsheet
) {
  const sheet =
    spreadsheet.getSheetByName(
      CONFIG.SHEETS.USUARIOS
    );

  if (!sheet) {
    return;
  }

  const dados =
    sheet
      .getDataRange()
      .getValues();

  let gestorExistente =
    false;

  let primeiroGestorEmail =
    "";

  for (
    let i = 1;
    i < dados.length;
    i++
  ) {
    const perfil =
      String(
        dados[i][2] || ""
      )
        .trim()
        .toUpperCase();

    const ativo =
      paraBoolean(
        dados[i][3]
      );

    const email =
      normalizarEmail(
        dados[i][0]
      );

    if (
      perfil ===
        CONFIG.PERFIS.GESTOR_SISTEMA &&
      ativo
    ) {
      gestorExistente =
        true;

      if (
        !primeiroGestorEmail
      ) {
        primeiroGestorEmail =
          email;
      }
    }
  }

  const emailAtual =
    normalizarEmail(
      AuthService.obterEmailAtivo()
    );

  if (
    !gestorExistente &&
    emailInstitucional(
      emailAtual
    )
  ) {
    sheet.appendRow([
      emailAtual,
      emailAtual.split("@")[0],
      CONFIG.PERFIS.GESTOR_SISTEMA,
      "SIM"
    ]);

    primeiroGestorEmail =
      emailAtual;
  }

  const config =
    spreadsheet.getSheetByName(
      CONFIG.SHEETS.CONFIGURACAO
    );

  if (
    config &&
    primeiroGestorEmail
  ) {
    garantirConfiguracao(
      config,
      "EMAIL_GESTOR",
      primeiroGestorEmail
    );
  }
}

/**
 * Cria a aba HISTORICO.
 */
function criarAbaHistorico(
  spreadsheet
) {
  return garantirAbaComCabecalho(
    spreadsheet,
    CONFIG.SHEETS.HISTORICO,
    [
      "ID",
      "TelefoneID",
      "Usuario",
      "Acao",
      "Antes",
      "Depois",
      "Data"
    ]
  );
}

/**
 * Cria a aba LOG.
 */
function criarAbaLog(
  spreadsheet
) {
  return garantirAbaComCabecalho(
    spreadsheet,
    CONFIG.SHEETS.LOG,
    [
      "ID",
      "DATA",
      "USUARIO",
      "TIPO",
      "ACAO",
      "MENSAGEM"
    ]
  );
}

/**
 * Cria a aba EMAILS_PENDENTES.
 */
function criarAbaEmailsPendentes(
  spreadsheet
) {
  return garantirAbaComCabecalho(
    spreadsheet,
    CONFIG.SHEETS.EMAILS_PENDENTES,
    [
      "DESTINATARIO",
      "ASSUNTO",
      "CORPO"
    ]
  );
}

/**
 * Cria a aba NOTIFICACOES.
 */
function criarAbaNotificacoes(spreadsheet) {
  return garantirAbaComCabecalho(
    spreadsheet,
    CONFIG.SHEETS.NOTIFICACOES,
    [
      "ID",
      "DestinatarioEmail",
      "Tipo",
      "Mensagem",
      "Lida",
      "Data",
      "ReferenciaID"
    ]
  );
}

/**
 * Executa manualmente para solicitar autorizações.
 */
function autorizar() {
  const spreadsheet =
    DB.getSpreadsheet();

  /*
   * Solicita acesso à planilha vinculada.
   */
  spreadsheet.getSheets();

  /*
   * Solicita acesso ao envio de e-mails.
   */
  MailApp.getRemainingDailyQuota();

  /*
   * Solicita acesso ao cache do usuário.
   */
  CacheService
    .getUserCache()
    .get("teste");

  /*
   * Solicita acesso à sessão do usuário.
   */
  Session
    .getActiveUser()
    .getEmail();

  /*
   * Solicita acesso ao HTML Service.
   */
  HtmlService
    .createHtmlOutput("teste");

  /*
   * Solicita acesso à URL do Web App.
   */
  ScriptApp
    .getService()
    .getUrl();

  Logger.log(
    "Autorização concluída."
  );

  return (
    "Autorização concluída."
  );
}

/**
 * Limpa o cache do sistema.
 */
function limparCacheAgora() {
  CACHE.limparTudo();

  return "Cache limpo.";
}

/**
 * Limpa a sessão atual.
 */
function limparSessaoAtual() {
  AuthService.limparSessao();

  return (
    "Sessão do aplicativo limpa."
  );
}