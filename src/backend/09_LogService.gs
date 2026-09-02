/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 09_LogService.gs
 * ==========================================================
 */

class LogService {
  constructor() {
    this.sheet = null;
  }

  obterAbaLog() {
    if (this.sheet) {
      return this.sheet;
    }

    const ss = DB.getSpreadsheet();

    let sheet = ss.getSheetByName(CONFIG.SHEETS.LOG);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEETS.LOG);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "DATA", "USUARIO", "TIPO", "ACAO", "MENSAGEM"]);
    }

    this.sheet = sheet;

    return this.sheet;
  }

  error(acao, mensagem) {
    this.registrar("ERRO", acao, mensagem);
  }

  info(acao, mensagem) {
    this.registrar("INFO", acao, mensagem);
  }

  registrar(tipo, acao, mensagem) {
    let usuario ="SISTEMA";

    try {
      usuario =
        Session
          .getActiveUser()
          .getEmail() ||
        "SISTEMA";
    } catch (erro) {
      usuario = "SISTEMA";
    }

    const lock = LockService.getScriptLock();
    let precisaLiberar = false;
    if (!lock.hasLock()) {
      lock.waitLock(30000);
      precisaLiberar = true;
    }

    try {
      const sheet = this.obterAbaLog();
      sheet.appendRow([
        new IdService().novoLog(sheet),
        new Date(),
        usuario,
        textoSeguro(tipo),
        textoSeguro(acao),
        String(mensagem === null || mensagem === undefined ? "" : mensagem)
      ]);
    } finally {
      if (precisaLiberar) lock.releaseLock();
    }
  }
}

const LOG =
  new LogService();
