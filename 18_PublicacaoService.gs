/**
 * Publica somente o catálogo operacional em uma planilha externa sanitizada.
 * A fonte canônica permanece institucional e nunca replica abas de acesso.
 */

function obterPlanilhaPublicaId_() {
  return textoSeguro(
    PropertiesService.getScriptProperties()
      .getProperty(CONFIG.PUBLICACAO.PROPRIEDADE_PLANILHA_PUBLICA)
  );
}

function obterPlanilhaFonteMigracaoId_() {
  return textoSeguro(
    PropertiesService.getScriptProperties()
      .getProperty(CONFIG.PUBLICACAO.PROPRIEDADE_FONTE_MIGRACAO)
  );
}

function validarDestinoPublico_(destino, origem) {
  if (!destino) throw new Error("Planilha pública não encontrada.");
  if (origem && destino.getId() === origem.getId()) {
    throw new Error("A planilha pública deve ser diferente da base institucional.");
  }

  const restritas = (CONFIG.PUBLICACAO.ABAS_RESTRITAS || []).filter(function(nome) {
    return Boolean(destino.getSheetByName(nome));
  });
  if (restritas.length) {
    throw new Error(
      "O destino público contém abas restritas: " + restritas.join(", ") +
      ". Use uma planilha externa limpa; nenhuma aba será apagada automaticamente."
    );
  }
  return true;
}

function configurarPlanilhaPublica(segredo, planilhaPublicaId) {
  exigirSegredoConfiguracao_(segredo);
  AuthService.exigirContextoPrivado();

  const id = textoSeguro(planilhaPublicaId);
  if (!id) throw new Error("Informe o ID da planilha pública.");

  const origem = DB.getSpreadsheet();
  const destino = SpreadsheetApp.openById(id);
  validarDestinoPublico_(destino, origem);

  PropertiesService.getScriptProperties().setProperty(
    CONFIG.PUBLICACAO.PROPRIEDADE_PLANILHA_PUBLICA,
    id
  );
  return {
    configurada: true,
    nome: destino.getName(),
    id: destino.getId()
  };
}

function configurarFonteMigracaoPessoal(segredo, planilhaFonteId) {
  exigirSegredoConfiguracao_(segredo);
  AuthService.exigirContextoPrivado();

  const id = textoSeguro(planilhaFonteId);
  if (!id) throw new Error("Informe o ID da planilha pessoal de origem.");

  const destino = DB.getSpreadsheet();
  const origem = SpreadsheetApp.openById(id);
  if (origem.getId() === destino.getId()) {
    throw new Error("A fonte de migração deve ser diferente da base institucional.");
  }
  validarAbasPublicasNaFonte_(origem);

  PropertiesService.getScriptProperties().setProperty(
    CONFIG.PUBLICACAO.PROPRIEDADE_FONTE_MIGRACAO,
    id
  );
  return { configurada: true, nome: origem.getName(), id: origem.getId() };
}

function publicarCatalogoExterno() {
  const auth = new AuthService();
  auth.exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  return publicarCatalogoExternoInterno_();
}

function publicarCatalogoExternoAgendado_() {
  AuthService.exigirContextoPrivado();
  return publicarCatalogoExternoInterno_();
}

function publicarCatalogoExternoInterno_() {
  const origem = DB.getSpreadsheet();
  const destinoId = obterPlanilhaPublicaId_();
  if (!destinoId) {
    throw new Error("Configure PLANILHA_PUBLICA_ID no projeto Interno.");
  }

  const destino = SpreadsheetApp.openById(destinoId);
  validarDestinoPublico_(destino, origem);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const resultado = copiarAbasPublicas_(origem, destino);

    SpreadsheetApp.flush();
    return {
      sucesso: true,
      destino: destino.getName(),
      publicadoEm: new Date(),
      abas: resultado
    };
  } finally {
    lock.releaseLock();
  }
}

function validarAbasPublicasNaFonte_(origem) {
  (CONFIG.PUBLICACAO.ABAS_PUBLICAS || []).forEach(function(nome) {
    const aba = origem.getSheetByName(nome);
    if (!aba || aba.getLastRow() < 1 || aba.getLastColumn() < 1) {
      throw new Error("Aba pública ausente ou vazia na fonte: " + nome);
    }
  });
}

function copiarAbasPublicas_(origem, destino) {
  validarAbasPublicasNaFonte_(origem);
  const resultado = [];
  (CONFIG.PUBLICACAO.ABAS_PUBLICAS || []).forEach(function(nome) {
    const fonte = origem.getSheetByName(nome);
    let alvo = destino.getSheetByName(nome);
    if (!alvo) alvo = destino.insertSheet(nome);

    const linhas = fonte.getLastRow();
    const colunas = fonte.getLastColumn();
    const valores = fonte.getRange(1, 1, linhas, colunas).getValues();
    alvo.clearContents();
    if (alvo.getMaxRows() < linhas) {
      alvo.insertRowsAfter(alvo.getMaxRows(), linhas - alvo.getMaxRows());
    }
    if (alvo.getMaxColumns() < colunas) {
      alvo.insertColumnsAfter(alvo.getMaxColumns(), colunas - alvo.getMaxColumns());
    }
    alvo.getRange(1, 1, linhas, colunas).setValues(valores);
    resultado.push({ aba: nome, linhas: Math.max(linhas - 1, 0) });
  });
  return resultado;
}

function importarCatalogoParaBaseInstitucional() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  return importarCatalogoParaBaseInstitucionalInterno_();
}

function importarCatalogoParaBaseInstitucionalEditor_() {
  AuthService.exigirContextoPrivado();
  if (!AuthService.emailPermitidoNoPrivado(AuthService.obterEmailAtivo())) {
    throw new Error("Execute a migração com uma conta autorizada no ambiente Interno.");
  }
  return importarCatalogoParaBaseInstitucionalInterno_();
}

/** Wrapper visível no seletor do editor e restrito ao operador real. */
function importarCatalogoParaBaseInstitucionalEditor() {
  exigirOperadorInstalacaoReal_();
  return importarCatalogoParaBaseInstitucionalInterno_();
}

function importarCatalogoParaBaseInstitucionalInterno_() {
  AuthService.exigirContextoPrivado();
  const fonteId = obterPlanilhaFonteMigracaoId_();
  if (!fonteId) {
    throw new Error("Configure PLANILHA_FONTE_MIGRACAO_ID no projeto Interno.");
  }

  const destino = DB.getSpreadsheet();
  const origem = SpreadsheetApp.openById(fonteId);
  if (origem.getId() === destino.getId()) {
    throw new Error("A fonte de migração deve ser diferente da base institucional.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const fuso = Session.getScriptTimeZone() || "America/Sao_Paulo";
    const sufixo = Utilities.formatDate(new Date(), fuso, "yyyy-MM-dd_HH-mm-ss");
    const backup = DriveApp.getFileById(destino.getId()).makeCopy(
      destino.getName() + " - backup pre-migracao " + sufixo
    );
    const resultado = copiarAbasPublicas_(origem, destino);
    SpreadsheetApp.flush();
    return {
      sucesso: true,
      origem: origem.getName(),
      destino: destino.getName(),
      backup: { id: backup.getId(), nome: backup.getName() },
      importadoEm: new Date(),
      abas: resultado
    };
  } finally {
    lock.releaseLock();
  }
}

function instalarTriggerPublicacaoDiaria() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (["publicarCatalogoExterno", "publicarCatalogoExternoAgendado_"]
        .includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger("publicarCatalogoExternoAgendado_")
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  return "Publicação diária configurada para a faixa das 02h.";
}
