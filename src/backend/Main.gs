/**
 * Entrada do Web App.
 *
 * A fronteira de segurança é a propriedade de script APP_MODE. Somente o
 * projeto configurado explicitamente como PRIVATE pode autenticar e executar
 * operações administrativas. Ausência ou valor inválido resulta em PUBLIC.
 */
function doGet() {
  const privado = AuthService.ehContextoPrivado();
  const template = prepararTemplateAplicacao(criarTemplateFrontend("index"));

  template.perfilAdmin = "";
  template.sessaoEmail = privado ? AuthService.obterEmailAtivo() : "";
  template.ehContextoAdmin = privado;
  template.modoAplicacao = privado ? CONFIG.AUTH.MODO_PRIVADO : CONFIG.AUTH.MODO_PUBLICO;

  return finalizarTemplate(template, CONFIG.SISTEMA.NOME);
}

function obterUrlServindo() {
  try {
    return ScriptApp.getService().getUrl() || "";
  } catch (erro) {
    return "";
  }
}

function propriedadeUrl(nome, fallback) {
  const valor = PropertiesService.getScriptProperties().getProperty(nome);
  return String(valor || fallback || "").trim();
}

function prepararTemplateAplicacao(template) {
  template.urlSistema = obterUrlSistema();
  template.urlAdmin = obterUrlAdmin();
  template.sistemaNome = CONFIG.SISTEMA.NOME;
  template.sistemaVersao = CONFIG.SISTEMA.VERSAO;
  template.dominioInstitucional = CONFIG.AUTH.DOMINIO_INSTITUCIONAL;
  return template;
}

function finalizarTemplate(template, titulo) {
  const output = template.evaluate().setTitle(titulo || CONFIG.SISTEMA.NOME);
  if (CONFIG.WEB_APP && CONFIG.WEB_APP.PERMITIR_IFRAME === true) {
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return output;
}

function finalizarHtml(html, titulo) {
  const output = HtmlService.createHtmlOutput(String(html || ""))
    .setTitle(titulo || CONFIG.SISTEMA.NOME);
  if (CONFIG.WEB_APP && CONFIG.WEB_APP.PERMITIR_IFRAME === true) {
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return output;
}

function obterUrlSistema() {
  const fallback = CONFIG.WEB_APP && CONFIG.WEB_APP.URL_PUBLICA;
  return propriedadeUrl("URL_PUBLICA", fallback) || obterUrlServindo();
}

function obterUrlAdmin() {
  if (!AuthService.ehContextoPrivado()) return "";
  const fallback = CONFIG.WEB_APP && CONFIG.WEB_APP.URL_ADMIN;
  return propriedadeUrl("URL_PRIVADA", fallback);
}

function escaparHtmlServidor(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function include(nomeArquivo) {
  const template = criarTemplateFrontend(nomeArquivo);
  template.sistemaNome = CONFIG.SISTEMA.NOME;
  template.sistemaVersao = CONFIG.SISTEMA.VERSAO;
  template.urlSistema = obterUrlSistema();
  template.urlAdmin = obterUrlAdmin();
  template.dominioInstitucional = CONFIG.AUTH.DOMINIO_INSTITUCIONAL;
  template.ehContextoAdmin = AuthService.ehContextoPrivado();
  return template.evaluate().getContent();
}

/**
 * O Clasp preserva as subpastas ao publicar os arquivos do projeto. Assim,
 * os templates em src/frontend são identificados no Apps Script como
 * "frontend/NomeDoArquivo", embora os includes usem somente o nome lógico.
 */
function criarTemplateFrontend(nomeArquivo) {
  const nome = textoSeguro(nomeArquivo);
  if (!nome) throw new Error("Nome do arquivo não informado.");
  if (!/^[A-Za-z0-9_-]+$/.test(nome)) {
    throw new Error("Nome de template inválido.");
  }
  return HtmlService.createTemplateFromFile("frontend/" + nome);
}
