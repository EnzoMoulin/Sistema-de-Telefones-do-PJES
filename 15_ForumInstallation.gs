/**
 * ==========================================================
 * INSTALAÇÃO V4 — MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS
 * ==========================================================
 */

function instalarSistemaForum() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = DB.getSpreadsheet();

    garantirAbaForumV4(ss, CONFIG.SHEETS.MUNICIPIOS, ["ID","NOME","CODIGO_IBGE","MICRORREGIAO","ATIVO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.FORUM, ["ID","MUNICIPIO_ID","NOME","ENDERECO","CEP","EMAIL","ORDEM","ATIVO","OBSERVACAO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.UNIDADES, ["ID","FORUM_ID","MUNICIPIO_ID","NOME","ENDERECO","CEP","EMAIL","ORDEM","ATIVO","OBSERVACAO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.SETORES, ["ID","UNIDADE_ID","NOME","ENDERECO","CEP","OBSERVACAO","ORDEM","ATIVO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.CONTATOS, ["ID","FORUM_ID","UNIDADE_ID","SETOR_ID","TIPO","DESCRICAO","VALOR","ORDEM","DATA_CRIACAO","DATA_ATUALIZACAO","ATIVO","OBSERVACAO"]);

    // Demais abas operacionais permanecem, mas TELEFONES não é criada.
    garantirAbaForumV4(ss, CONFIG.SHEETS.TELEFONES_UTEIS, ["ID","NOME","TIPO","VALOR","ATIVO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.ACESSOS_UNIDADES, ["ID","USUARIO_ID","UNIDADE_ID","ATIVO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.USUARIOS, ["ID","NOME","EMAIL","NIVEL","SENHA","ATIVO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.CONFIGURACAO, ["CHAVE","VALOR"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.HISTORICO, ["ID","CONTATO_ID","ACAO","ANTES","DEPOIS","USUARIO","DATA"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.LOG, ["ID","DATA","USUARIO","TIPO","ACAO","MENSAGEM"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.NOTIFICACOES, ["ID","EMAIL","TIPO","TITULO","MENSAGEM","DATA","LIDA"]);

    SpreadsheetApp.flush();
    try { CACHE.limparTudo(); } catch (e) {}
    return validarModeloForumContatos();
  } finally {
    lock.releaseLock();
  }
}

function garantirAbaForumV4(ss, nome, headers) {
  let sheet = ss.getSheetByName(nome);
  if (!sheet) sheet = ss.insertSheet(nome);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  const atuais = DB.headers(sheet).map(normalizarChave);
  headers.forEach(function(header) {
    if (atuais.indexOf(normalizarChave(header)) === -1) {
      const col = sheet.getLastColumn() + 1;
      sheet.getRange(1, col).setValue(header);
      atuais.push(normalizarChave(header));
    }
  });
  return sheet;
}

function removerAbaTelefonesLegada() {
  const ss = DB.getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.TELEFONES);
  if (!sheet) return { removida: false, motivo: "A aba TELEFONES não existe." };
  ss.deleteSheet(sheet);
  return { removida: true };
}

function validarIntegridadeForumV4() {
  const diag = validarModeloForumContatos();
  const ss = DB.getSpreadsheet();
  const problemas = [];

  if (diag.abasAusentes.length) problemas.push("Aba obrigatória ausente: " + diag.abasAusentes.join(", "));

  const contato = DB.contatosOuNulo();
  const setor = DB.setoresOuNulo();
  const unidade = DB.unidadesOuNulo();
  const forum = DB.forumOuNulo();
  const municipio = DB.municipiosOuNulo();

  const ids = function(sheet) {
    if (!sheet) return [];
    const map = DB.map(sheet); const idx = map.ID;
    return DB.read(sheet).map(r => idx ? textoSeguro(r[idx-1]) : "").filter(Boolean);
  };

  const checarUnicos = function(nome, lista) {
    const vistos = {}; const dup = [];
    lista.forEach(function(id){ if(vistos[id]) dup.push(id); vistos[id]=true; });
    if (dup.length) problemas.push(nome + " duplicados: " + dup.join(", "));
  };

  checarUnicos("MUNICIPIO", ids(municipio));
  checarUnicos("FORUM", ids(forum));
  checarUnicos("UNIDADE", ids(unidade));
  checarUnicos("SETOR", ids(setor));
  checarUnicos("CONTATO", ids(contato));

  return { ok: problemas.length === 0, problemas: problemas, diagnostico: diag };
}
