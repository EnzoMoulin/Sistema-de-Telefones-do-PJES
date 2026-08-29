/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 12_Install.gs
 * ==========================================================
 */

/**
 * Instala as abas e os cabeçalhos do sistema.
 */
function instalarSistema(segredo) {
  return instalarSistemaForum(segredo);
}

/**
 * Registra a planilha vinculada ao projeto.
 *
 * Execute esta função manualmente pelo editor do Apps Script,
 * aberto em:
 *
 * Planilha > Extensões > Apps Script
 */
function registrarPlanilhaVinculada(segredo) {
  exigirSegredoConfiguracao_(segredo);
  const spreadsheet =
    DB.registrarPlanilhaAtiva();

  const mensagem =
    "Planilha vinculada com sucesso: " +
    spreadsheet.getName();

  Logger.log(mensagem);

  return mensagem;
}

/**
 * Atalho privado para execução manual pelo editor do Apps Script.
 * O sufixo "_" impede chamadas pelo google.script.run.
 */
function registrarPlanilhaVinculadaEditor_() {
  const segredo = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.AUTH.PROPRIEDADE_SEGREDO_CONFIGURACAO) || "";
  return registrarPlanilhaVinculada(segredo);
}

/**
 * Wrapper visível no seletor do editor e restrito ao operador institucional.
 * Registra como base do projeto a planilha à qual o script está vinculado.
 */
function registrarPlanilhaVinculadaEditor() {
  exigirOperadorInstalacaoReal_();
  return registrarPlanilhaVinculadaEditor_();
}

/**
 * Testa a planilha vinculada e lista suas abas.
 */
function testarPlanilhaVinculada() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
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
function criarAbaUsuarios(
  spreadsheet
) {
  return garantirAbaComCabecalho(
    spreadsheet,
    CONFIG.SHEETS.USUARIOS,
    ["ID", "NOME", "EMAIL", "NIVEL", "ATIVO"]
  );
}

/**
 * Cria a aba de solicitações de acesso.
 *
 * Usa o nome canônico "SOLICITACOES_ACESSO"; se a aba
 * descritiva antiga existir, ela é
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
        "NIVEL_SOLICITADO",
        "UNIDADE_ID",
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
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
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

/** V5 — Cria a árvore auto-relacionada de unidades organizacionais. */
function criarAbaUnidadesOrganizacionais(spreadsheet) {
  return garantirAbaComCabecalho(spreadsheet, CONFIG.SHEETS.UNIDADES_ORGANIZACIONAIS, ["ID","FORUM_ID","PAI_ID","TIPO","NOME","ENDERECO","CEP","OBSERVACAO","SELECIONAVEL_ACESSO","ATIVO","ORDEM"]);
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
  return garantirAbaComCabecalho(spreadsheet, CONFIG.SHEETS.CONTATOS, ["ID","FORUM_ID","UNIDADE_ORGANIZACIONAL_ID","UNIDADE_ID","SETOR_ID","TIPO","DESCRICAO","VALOR","ORDEM","DATA_CRIACAO","DATA_ATUALIZACAO","ATIVO","OBSERVACAO"]);
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
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEETS.USUARIOS);
  if (!sheet) return;
  const mapa = DB.map(sheet);
  const existe = DB.read(sheet).some(function(linha) {
    return Number(linha[mapa.NIVEL - 1]) === CONFIG.NIVEIS.GESTOR_SISTEMA &&
      paraBoolean(linha[mapa.ATIVO - 1]);
  });
  if (existe) return;

  const emailAtual = AuthService.obterEmailAtivo();
  if (!AuthService.emailPermitidoNoPrivado(emailAtual)) {
    throw new Error(
      "Nenhum Gestor do Sistema ativo. Configure APP_MODE=PRIVATE e execute a instalação com uma conta institucional ou de teste permitida."
    );
  }

  const headers = DB.headers(sheet);
  const linha = new Array(headers.length).fill("");
  linha[mapa.ID - 1] = Utilities.getUuid();
  linha[mapa.NOME - 1] = emailAtual.split("@")[0];
  linha[mapa.EMAIL - 1] = emailAtual;
  linha[mapa.NIVEL - 1] = CONFIG.NIVEIS.GESTOR_SISTEMA;
  linha[mapa.ATIVO - 1] = "SIM";
  sheet.appendRow(linha);
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
  DB.getSpreadsheet().getSheets();
  AuthService.obterEmailAtivo();
  ScriptApp.getService().getUrl();

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
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
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
