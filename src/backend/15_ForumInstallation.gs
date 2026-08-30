/**
 * ==========================================================
 * INSTALAÇÃO V5 — MUNICIPIOS -> FORUM -> UNIDADES_ORGANIZACIONAIS -> CONTATOS
 * ==========================================================
 */

function instalarSistemaForum(segredo) {
  exigirSegredoConfiguracao_(segredo);
  AuthService.exigirContextoPrivado();
  if (!AuthService.emailPermitidoNoPrivado(AuthService.obterEmailAtivo())) {
    throw new Error("Execute a instalação com uma conta autorizada no ambiente privado.");
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = DB.getSpreadsheet();

    garantirAbaForumV4(ss, CONFIG.SHEETS.MUNICIPIOS, ["ID","NOME","CODIGO_IBGE","MICRORREGIAO","ATIVO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.FORUM, ["ID","MUNICIPIO_ID","NOME","ENDERECO","CEP","EMAIL","ORDEM","ATIVO","OBSERVACAO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.UNIDADES_ORGANIZACIONAIS, ["ID","FORUM_ID","PAI_ID","TIPO","NOME","ENDERECO","CEP","OBSERVACAO","SELECIONAVEL_ACESSO","ATIVO","ORDEM"]);
    // Fontes de migração/rollback; a consulta operacional V5 não depende destas abas.
    garantirAbaForumV4(ss, CONFIG.SHEETS.UNIDADES, ["ID","FORUM_ID","MUNICIPIO_ID","NOME","ENDERECO","CEP","EMAIL","ORDEM","ATIVO","OBSERVACAO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.SETORES, ["ID","UNIDADE_ID","NOME","ENDERECO","CEP","OBSERVACAO","ORDEM","ATIVO"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.CONTATOS, ["ID","FORUM_ID","UNIDADE_ORGANIZACIONAL_ID","UNIDADE_ID","SETOR_ID","TIPO","DESCRICAO","VALOR","ORDEM","DATA_CRIACAO","DATA_ATUALIZACAO","ATIVO","OBSERVACAO"]);

    // Demais abas operacionais permanecem, mas TELEFONES não é criada.
    garantirAbaForumV4(ss, CONFIG.SHEETS.TELEFONES_UTEIS, ["ID","NOME","TIPO","VALOR","ATIVO"]);
    garantirEstruturaAcessosUnidades(garantirAbaForumV4(ss, CONFIG.SHEETS.ACESSOS_UNIDADES, ["ID","USUARIO_ID","TIPO_ESCOPO","ESCOPO_ID","ATIVO"]));
    garantirAbaForumV4(ss, CONFIG.SHEETS.USUARIOS, ["ID","NOME","EMAIL","NIVEL","ATIVO"]);
    garantirColunaEscopoAcessos(garantirAbaForumV4(ss, CONFIG.SHEETS.SOLICITACOES_ACESSO, ["ID","EMAIL","NOME","COMARCA","NIVEL_SOLICITADO","UNIDADE_ID","ESCOPO_ACESSOS","JUSTIFICATIVA","STATUS","DATA_SOLICITACAO","APROVADOR","DATA_APROVACAO"]));
    garantirAbaForumV4(ss, CONFIG.SHEETS.CONFIGURACAO, ["CHAVE","VALOR"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.HISTORICO, ["ID","CONTATO_ID","ACAO","ANTES","DEPOIS","USUARIO","DATA"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.LOG, ["ID","DATA","USUARIO","TIPO","ACAO","MENSAGEM"]);
    garantirAbaForumV4(ss, CONFIG.SHEETS.NOTIFICACOES, ["ID","EMAIL","TIPO","TITULO","MENSAGEM","DATA","LIDA"]);

    migrarAutenticacaoGoogleV5(ss);
    garantirGestorInicial(ss);
    migrarHierarquiaOrganizacionalV5();

    SpreadsheetApp.flush();
    try { CACHE.limparTudo(); } catch (e) {}
    return validarModeloForumContatosInterno_();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Atalho privado para execução manual pelo editor do Apps Script.
 * O sufixo "_" impede chamadas pelo google.script.run.
 */
function instalarSistemaForumEditor_() {
  const segredo = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.AUTH.PROPRIEDADE_SEGREDO_CONFIGURACAO) || "";
  return instalarSistemaForum(segredo);
}

function exigirOperadorInstalacaoReal_() {
  AuthService.exigirContextoPrivado();
  const email = AuthService.obterEmailAtivo();
  const permitidos = String(
    PropertiesService.getScriptProperties()
      .getProperty(CONFIG.AUTH.PROPRIEDADE_OPERADORES_INSTALACAO) || ""
  ).split(/[;,\n]+/).map(normalizarEmail).filter(Boolean);
  if (!email || permitidos.indexOf(email) === -1) {
    throw new Error("Rotina de instalação restrita ao operador institucional autorizado.");
  }
  return email;
}

/**
 * Wrapper visível no seletor do editor. A restrição por e-mail impede que
 * usuários comuns da URL privada executem a instalação via google.script.run.
 */
function instalarSistemaForumEditor() {
  exigirOperadorInstalacaoReal_();
  return instalarSistemaForumEditor_();
}

function migrarAutenticacaoGoogleV5(ss) {
  AuthService.exigirContextoPrivado();
  const filaLegada = ss.getSheetByName("EMAILS_PENDENTES");
  if (filaLegada && filaLegada.getLastRow() > 1) {
    throw new Error(
      "EMAILS_PENDENTES contém registros. Revise-os antes de concluir a migração de autenticação."
    );
  }
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USUARIOS);
  const mapa = DB.map(sheet);
  const dados = DB.read(sheet);
  const linhas = [["ID", "NOME", "EMAIL", "NIVEL", "ATIVO"]];

  dados.forEach(function(linha) {
    const email = normalizarEmail(mapa.EMAIL ? linha[mapa.EMAIL - 1] : "");
    if (!email) return;
    let nivel = mapa.NIVEL ? Number(linha[mapa.NIVEL - 1]) : 0;
    if (nivel !== 1 && nivel !== 2 && mapa.PERFIL) {
      nivel = CONFIG.NIVEIS.POR_PERFIL[
        String(linha[mapa.PERFIL - 1] || "").trim().toUpperCase()
      ] || 0;
    }
    linhas.push([
      mapa.ID ? textoSeguro(linha[mapa.ID - 1]) || Utilities.getUuid() : Utilities.getUuid(),
      mapa.NOME ? textoSeguro(linha[mapa.NOME - 1]) : email.split("@")[0],
      email,
      nivel,
      mapa.ATIVO && paraBoolean(linha[mapa.ATIVO - 1]) ? "SIM" : "NÃO"
    ]);
  });

  sheet.clearContents();
  sheet.getRange(1, 1, linhas.length, 5).setValues(linhas);
  const ultimaColuna = sheet.getLastColumn();
  if (ultimaColuna > 5) sheet.deleteColumns(6, ultimaColuna - 5);

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "processarFilaDeEmails") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  if (filaLegada) {
    ss.deleteSheet(filaLegada);
  }
}

function exigirSegredoConfiguracao_(segredo) {
  const esperado = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.AUTH.PROPRIEDADE_SEGREDO_CONFIGURACAO) || "";
  if (esperado.length < 20 || String(segredo || "") !== esperado) {
    throw new Error("SETUP_SECRET ausente ou inválido.");
  }
}

function configurarAmbientePublico(segredo, urlPublica, urlPrivada) {
  exigirSegredoConfiguracao_(segredo);
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.AUTH.PROPRIEDADE_MODO, CONFIG.AUTH.MODO_PUBLICO);
  if (textoSeguro(urlPublica)) props.setProperty("URL_PUBLICA", textoSeguro(urlPublica));
  if (textoSeguro(urlPrivada)) props.setProperty("URL_PRIVADA", textoSeguro(urlPrivada));
  props.deleteProperty(CONFIG.AUTH.PROPRIEDADE_EMAILS_TESTE);
  return validarSegurancaAutenticacao();
}

function configurarAmbientePrivado(segredo, urlPublica, urlPrivada, emailsTeste) {
  exigirSegredoConfiguracao_(segredo);
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.AUTH.PROPRIEDADE_MODO, CONFIG.AUTH.MODO_PRIVADO);
  if (textoSeguro(urlPublica)) props.setProperty("URL_PUBLICA", textoSeguro(urlPublica));
  if (textoSeguro(urlPrivada)) props.setProperty("URL_PRIVADA", textoSeguro(urlPrivada));
  const valores = Array.isArray(emailsTeste)
    ? emailsTeste
    : String(emailsTeste || "").split(/[;,\n]+/);
  const lista = Array.from(new Set(valores.map(normalizarEmail).filter(Boolean)));
  if (lista.length) props.setProperty(CONFIG.AUTH.PROPRIEDADE_EMAILS_TESTE, lista.join(","));
  else props.deleteProperty(CONFIG.AUTH.PROPRIEDADE_EMAILS_TESTE);
  return validarSegurancaAutenticacao();
}

/** Valida propriedades já cadastradas e garante um segredo local do projeto. */
function configurarInstalacaoReal() {
  const props = PropertiesService.getScriptProperties();
  const modo = String(props.getProperty(CONFIG.AUTH.PROPRIEDADE_MODO) || "")
    .trim().toUpperCase();
  const obrigatorias = ["PLANILHA_VINCULADA_ID", "URL_PUBLICA", "URL_PRIVADA"];
  if (modo !== CONFIG.AUTH.MODO_PUBLICO && modo !== CONFIG.AUTH.MODO_PRIVADO) {
    throw new Error("Configure APP_MODE como PUBLIC ou PRIVATE nas propriedades do script.");
  }
  if (modo === CONFIG.AUTH.MODO_PRIVADO) {
    obrigatorias.push(CONFIG.PUBLICACAO.PROPRIEDADE_PLANILHA_PUBLICA);
    obrigatorias.push(CONFIG.AUTH.PROPRIEDADE_OPERADORES_INSTALACAO);
  }
  const ausentes = obrigatorias.filter(function(chave) {
    return !textoSeguro(props.getProperty(chave));
  });
  if (ausentes.length) {
    throw new Error("Propriedades obrigatórias ausentes: " + ausentes.join(", "));
  }

  if (!props.getProperty(CONFIG.AUTH.PROPRIEDADE_SEGREDO_CONFIGURACAO)) {
    props.setProperty(
      CONFIG.AUTH.PROPRIEDADE_SEGREDO_CONFIGURACAO,
      Utilities.getUuid() + Utilities.getUuid()
    );
  }
  if (modo === CONFIG.AUTH.MODO_PUBLICO) {
    props.deleteProperty(CONFIG.AUTH.PROPRIEDADE_EMAILS_TESTE);
    props.deleteProperty(CONFIG.PUBLICACAO.PROPRIEDADE_FONTE_MIGRACAO);
    props.deleteProperty(CONFIG.PUBLICACAO.PROPRIEDADE_PLANILHA_PUBLICA);
  }
  return {
    configurado: true,
    ambiente: modo === CONFIG.AUTH.MODO_PRIVADO ? "INTERNO" : "EXTERNO",
    scriptId: ScriptApp.getScriptId()
  };
}

function validarSegurancaAutenticacao() {
  const ss = DB.getSpreadsheet();
  const problemas = [];
  const privado = AuthService.ehContextoPrivado();
  const sheetU = ss.getSheetByName(CONFIG.SHEETS.USUARIOS);
  const sheetA = ss.getSheetByName(CONFIG.SHEETS.ACESSOS_UNIDADES);
  const sheetS = ss.getSheetByName(CONFIG.SHEETS.SOLICITACOES_ACESSO);
  const esperadosU = ["ID", "NOME", "EMAIL", "NIVEL", "ATIVO"];
  const esperadosA = ["ID", "USUARIO_ID", "TIPO_ESCOPO", "ESCOPO_ID", "ATIVO"];
  const esperadosS = ["ID", "EMAIL", "NOME", "NIVEL_SOLICITADO", "ESCOPO_ACESSOS", "STATUS"];

  function checar(sheet, nome, headers) {
    if (!sheet) { problemas.push("Aba ausente: " + nome); return null; }
    const mapa = DB.map(sheet);
    headers.forEach(function(header) {
      if (mapa[normalizarChave(header)] === undefined) problemas.push(nome + " sem " + header);
    });
    return mapa;
  }

  const mapaU = privado
    ? checar(sheetU, CONFIG.SHEETS.USUARIOS, esperadosU)
    : null;
  if (privado) {
    checar(sheetA, CONFIG.SHEETS.ACESSOS_UNIDADES, esperadosA);
    checar(sheetS, CONFIG.SHEETS.SOLICITACOES_ACESSO, esperadosS);
  } else {
    (CONFIG.PUBLICACAO.ABAS_PUBLICAS || []).forEach(function(nome) {
      if (!ss.getSheetByName(nome)) problemas.push("Aba pública ausente: " + nome);
    });
    (CONFIG.PUBLICACAO.ABAS_RESTRITAS || []).forEach(function(nome) {
      if (ss.getSheetByName(nome)) problemas.push("Aba restrita presente no espelho público: " + nome);
    });
  }

  if (sheetU && mapaU) DB.read(sheetU).forEach(function(linha, indice) {
    const nivel = Number(linha[mapaU.NIVEL - 1]);
    const ativoRaw = String(linha[mapaU.ATIVO - 1] || "").trim().toUpperCase();
    if (nivel !== 1 && nivel !== 2) problemas.push("USUARIOS linha " + (indice + 2) + ": NIVEL inválido");
    if (ativoRaw !== "SIM" && ativoRaw !== "NÃO" && ativoRaw !== "NAO") {
      problemas.push("USUARIOS linha " + (indice + 2) + ": ATIVO deve ser SIM ou NÃO");
    }
  });

  const fila = ss.getSheetByName("EMAILS_PENDENTES");
  if (fila) problemas.push("Aba legada EMAILS_PENDENTES ainda existe");
  const triggerFila = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === "processarFilaDeEmails";
  });
  if (triggerFila) problemas.push("Trigger legado processarFilaDeEmails ainda existe");

  return {
    ok: problemas.length === 0,
    modo: AuthService.modoAplicacao(),
    privado: privado,
    emailExpostoPeloGoogle: AuthService.obterEmailAtivo() || "",
    emailsTesteConfigurados: AuthService.emailsTestePrivado().length,
    problemas: problemas
  };
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
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  const ss = DB.getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.TELEFONES);
  if (!sheet) return { removida: false, motivo: "A aba TELEFONES não existe." };
  ss.deleteSheet(sheet);
  return { removida: true };
}

function validarIntegridadeForumV4() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  return validarIntegridadeHierarquiaOrganizacionalV5();
}

function validarIntegridadeForumV5() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  return validarIntegridadeHierarquiaOrganizacionalV5();
}
