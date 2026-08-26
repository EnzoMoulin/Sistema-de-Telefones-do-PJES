/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 03_Database.gs
 * ==========================================================
 *
 * A planilha é obtida desta forma:
 * 1. Editor do Apps Script: planilha ativa.
 * 2. Web App: ID salvo nas propriedades do projeto.
 */

const CHAVE_PLANILHA_VINCULADA = "PLANILHA_VINCULADA_ID";

class Database {
  constructor() {
    this.spreadsheet = null;
  }

  registrarPlanilhaAtiva() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      throw new Error(
        "Não foi possível obter a planilha ativa. Abra o Apps Script pelo menu 'Extensões > Apps Script' da planilha."
      );
    }

    PropertiesService.getScriptProperties().setProperty(
      CHAVE_PLANILHA_VINCULADA,
      spreadsheet.getId()
    );
    this.spreadsheet = spreadsheet;
    return spreadsheet;
  }

  getSpreadsheet() {
    if (this.spreadsheet) return this.spreadsheet;

    const id = PropertiesService.getScriptProperties().getProperty(
      CHAVE_PLANILHA_VINCULADA
    );

    if (!id) {
      throw new Error(
        "A planilha ainda não foi vinculada. Execute registrarPlanilhaVinculada() manualmente no editor do Apps Script."
      );
    }

    try {
      this.spreadsheet = SpreadsheetApp.openById(id);
    } catch (erro) {
      throw new Error(
        "Não foi possível abrir a planilha vinculada. Verifique se a conta que executa o Web App possui acesso à planilha."
      );
    }

    return this.spreadsheet;
  }

  getSheet(nomeAba) {
    const nome = textoSeguro(nomeAba);
    if (!nome) throw new Error("Nome da aba não informado.");

    const sheet = this.getSpreadsheet().getSheetByName(nome);
    if (!sheet) {
      throw new Error("A aba '" + nome + "' não existe na planilha.");
    }
    return sheet;
  }

  historico() { return this.getSheet(CONFIG.SHEETS.HISTORICO); }
  configuracao() { return this.getSheet(CONFIG.SHEETS.CONFIGURACAO); }
  usuarios() { return this.getSheet(CONFIG.SHEETS.USUARIOS); }
  log() { return this.getSheet(CONFIG.SHEETS.LOG); }
  notificacoes() { return this.getSheet(CONFIG.SHEETS.NOTIFICACOES); }

  solicitacoesAcesso() {
    const spreadsheet = this.getSpreadsheet();
    const nomes = [
      CONFIG.SHEETS.SOLICITACOES_ACESSO,
      CONFIG.SHEETS.SOLICITACOES_ACESSO_LEGADO
    ].filter(Boolean);
    const chaveAlvo = normalizarChave(CONFIG.SHEETS.SOLICITACOES_ACESSO);

    for (const nome of nomes) {
      const sheet = spreadsheet.getSheetByName(nome);
      if (sheet) return sheet;
    }

    const aproximada = spreadsheet.getSheets().find(sheet =>
      normalizarChave(sheet.getName()) === chaveAlvo
    );
    if (aproximada) return aproximada;

    throw new Error(
      "A aba '" + CONFIG.SHEETS.SOLICITACOES_ACESSO + "' não existe na planilha."
    );
  }

  municipios() { return this.getSheet(CONFIG.SHEETS.MUNICIPIOS); }
  municipiosOuNulo() { try { return this.getSpreadsheet().getSheetByName(CONFIG.SHEETS.MUNICIPIOS); } catch(e) { return null; } }

  forum() { return this.getSheet(CONFIG.SHEETS.FORUM); }
  forumOuNulo() { try { return this.getSpreadsheet().getSheetByName(CONFIG.SHEETS.FORUM); } catch(e) { return null; } }

  unidades() { return this.getSheet(CONFIG.SHEETS.UNIDADES); }
  unidadesOuNulo() { try { return this.getSpreadsheet().getSheetByName(CONFIG.SHEETS.UNIDADES); } catch(e) { return null; } }

  setores() { return this.getSheet(CONFIG.SHEETS.SETORES); }
  setoresOuNulo() { try { return this.getSpreadsheet().getSheetByName(CONFIG.SHEETS.SETORES); } catch(e) { return null; } }

  contatos() { return this.getSheet(CONFIG.SHEETS.CONTATOS); }
  contatosOuNulo() { try { return this.getSpreadsheet().getSheetByName(CONFIG.SHEETS.CONTATOS); } catch(e) { return null; } }

  acessosUnidades() { return this.getSheet(CONFIG.SHEETS.ACESSOS_UNIDADES); }
  acessosUnidadesOuNulo() { try { return this.getSpreadsheet().getSheetByName(CONFIG.SHEETS.ACESSOS_UNIDADES); } catch(e) { return null; } }

  telefonesUteis() { return this.getSheet(CONFIG.SHEETS.TELEFONES_UTEIS); }
  telefonesUteisOuNulo() { try { return this.getSpreadsheet().getSheetByName(CONFIG.SHEETS.TELEFONES_UTEIS); } catch(e) { return null; } }

  telefones() { return this.getSheet(CONFIG.SHEETS.TELEFONES); }
  telefonesOuNulo() { try { return this.getSpreadsheet().getSheetByName(CONFIG.SHEETS.TELEFONES); } catch(e) { return null; } }

  notificacoesOuNulo() { try { return this.getSpreadsheet().getSheetByName(CONFIG.SHEETS.NOTIFICACOES); } catch(e) { return null; } }

  /** Modelo definitivo: MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS. */
  temModeloNormalizado() {
    try {
      const ss = this.getSpreadsheet();
      return !!(
        ss.getSheetByName(CONFIG.SHEETS.MUNICIPIOS) &&
        ss.getSheetByName(CONFIG.SHEETS.FORUM) &&
        ss.getSheetByName(CONFIG.SHEETS.UNIDADES) &&
        ss.getSheetByName(CONFIG.SHEETS.SETORES) &&
        ss.getSheetByName(CONFIG.SHEETS.CONTATOS)
      );
    } catch(e) {
      return false;
    }
  }

  headers(sheet) {
    if (!sheet) throw new Error("Planilha não informada.");
    const ultimaColuna = sheet.getLastColumn();
    if (ultimaColuna <= 0) return [];
    return sheet
      .getRange(1, 1, 1, ultimaColuna)
      .getDisplayValues()[0]
      .map(header => textoSeguro(header));
  }

  map(sheet) {
    const headers = this.headers(sheet);
    const mapa = {};
    headers.forEach((header, index) => {
      const chave = normalizarChave(header);
      if (chave) mapa[chave] = index + 1;
    });
    return mapa;
  }

  read(sheet) {
    if (!sheet) throw new Error("Planilha não informada.");
    const ultimaLinha = sheet.getLastRow();
    const ultimaColuna = sheet.getLastColumn();
    if (ultimaLinha <= 1 || ultimaColuna <= 0) return [];
    return sheet.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues();
  }

  count(sheet) { return Math.max(sheet.getLastRow() - 1, 0); }
  lastRow(sheet) { return sheet.getLastRow(); }
}

const DB = new Database();