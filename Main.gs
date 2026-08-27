/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: Main.gs
 * ==========================================================
 */

function doGet(e) {
  /*
   * Duas implantações do MESMO projeto (mesma versão):
   * - URL_PUBLICA (anônima): qualquer pessoa consulta sem login;
   * - URL_ADMIN (conta Google): quem tem cargo ativo em USUARIOS
   *   entra automaticamente; os demais permanecem visitantes.
   */
  const servindo = obterUrlServindo();

  const urlAdminConfig =
    String(
      CONFIG.WEB_APP && CONFIG.WEB_APP.URL_ADMIN
        ? CONFIG.WEB_APP.URL_ADMIN
        : ""
    ).trim();

  const ehContextoAdmin =
    Boolean(
      servindo &&
      urlAdminConfig &&
      normalizarChave(servindo) === normalizarChave(urlAdminConfig)
    );

  const email = AuthService.obterEmailAtivo();

  const usuario =
    ehContextoAdmin && email && emailInstitucional(email)
      ? obterUsuarioAdmin(email)
      : null;

  /*
   * Auditoria de acesso (somente na implantação administrativa):
   * registra na aba LOG o que o servidor enxergou — e-mail
   * identificado e cargo concedido (ou não).
   */
  if (ehContextoAdmin && email && emailInstitucional(email)) {
    try {
      LOG.info(
        usuario ? "ACESSO_ADMIN_OK" : "ACESSO_ADMIN_SEM_CARGO",
        email + (usuario ? " -> " + usuario.perfil : " (sem cargo ativo na aba USUARIOS)")
      );
    } catch (erroLog) {
      console.warn("Falha ao registrar acesso:", erroLog);
    }
  }

  if (ehContextoAdmin && usuario) {
    return carregarAplicacaoAdministrativa(usuario);
  }

  return carregarAplicacaoPublica(
    ehContextoAdmin ? email || "" : ""
  );
}

/**
 * URL da implantação que está servindo esta requisição.
 */
function obterUrlServindo() {
  try {
    const url = ScriptApp.getService().getUrl();

    if (url && /^https:\/\/script\.google\.com\/macros\/s\//.test(url)) {
      return url;
    }
  } catch (erro) {
    console.warn("Falha ao obter URL do serviço:", erro);
  }

  return "";
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

function carregarAplicacaoPublica(email) {
  const template = prepararTemplateAplicacao(
    HtmlService.createTemplateFromFile("index")
  );

  template.perfilAdmin = "";
  template.sessaoEmail = textoSeguro(email);
  template.mostrarModalAcesso = false;
  template.ehContextoAdmin = Boolean(email);

  return finalizarTemplate(template, CONFIG.SISTEMA.NOME);
}

function carregarAplicacaoAdministrativa(usuario) {
  AuthService.salvarSessao(usuario.email, usuario.perfil);

  const template = prepararTemplateAplicacao(
    HtmlService.createTemplateFromFile("index")
  );

  template.perfilAdmin = usuario.perfil;
  template.sessaoEmail = usuario.email;
  template.mostrarModalAcesso = false;
  template.ehContextoAdmin = true;

  return finalizarTemplate(template, CONFIG.SISTEMA.NOME);
}

/**
 * Localiza o usuário na aba USUARIOS para acesso administrativo.
 *
 * Retorna o usuário somente se ele existir, estiver ATIVO e possuir
 * um perfil administrativo (GESTOR_SISTEMA ou GESTOR_CONTEUDO).
 * Caso contrário, retorna null (acesso negado).
 */
function obterUsuarioAdmin(email) {
  const emailNormalizado = normalizarEmail(email);

  if (!emailNormalizado) {
    return null;
  }

  try {
    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const idxEmail = mapa.EMAIL;
    const idxNome = mapa.NOME;
    const idxAtivo = mapa.ATIVO;

    if (!idxEmail || (!mapa.PERFIL && !mapa.NIVEL) || !idxAtivo) {
      return null;
    }

    const dados = DB.read(sheet);

    for (const linha of dados) {
      if (normalizarEmail(linha[idxEmail - 1]) !== emailNormalizado) {
        continue;
      }

      const nome = textoSeguro(idxNome ? linha[idxNome - 1] : "");
      const perfil = perfilUsuarioPorLinha(mapa, linha);
      const ativo = paraBoolean(linha[idxAtivo - 1]);

      const ehAdministrativo =
        perfil === CONFIG.PERFIS.GESTOR_SISTEMA ||
        perfil === CONFIG.PERFIS.GESTOR_CONTEUDO;

      if (!ativo || !ehAdministrativo) {
        return null;
      }

      return {
        email: emailNormalizado,
        nome: nome || emailNormalizado.split("@")[0],
        perfil: perfil,
        ativo: true
      };
    }

    return null;
  } catch (erro) {
    console.error("Falha ao consultar USUARIOS:", erro);
    return null;
  }
}

function escaparHtmlServidor(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function obterUrlSistema() {
  /*
   * URL pública (anônima) — fonte da verdade em CONFIG;
   * reserva: URL da implantação que está servindo.
   */
  const configurada =
    String(
      CONFIG.WEB_APP && CONFIG.WEB_APP.URL_PUBLICA
        ? CONFIG.WEB_APP.URL_PUBLICA
        : ""
    ).trim();

  if (
    configurada &&
    /^https:\/\/script\.google\.com\/macros\/s\//.test(configurada) &&
    !configurada.includes("PUBLICA_EM_BRANCO")
  ) {
    return configurada;
  }

  const servindo = obterUrlServindo();

  if (servindo) {
    return servindo;
  }

  if (!configurada) {
    throw new Error("URL_PUBLICA não foi configurada no CONFIG.");
  }

  return configurada;
}

/**
 * URL administrativa (conta Google) — onde o gestor faz login.
 */
function obterUrlAdmin() {
  const configurada =
    String(
      CONFIG.WEB_APP && CONFIG.WEB_APP.URL_ADMIN
        ? CONFIG.WEB_APP.URL_ADMIN
        : ""
    ).trim();

  if (
    configurada &&
    /^https:\/\/script\.google\.com\/macros\/s\//.test(configurada)
  ) {
    return configurada;
  }

  return obterUrlSistema();
}

function obterUrlAlternarConta() {
  return "https://accounts.google.com/logout?continue=" + encodeURIComponent(obterUrlSistema());
}

function renderizarPaginaErro(nomeArquivo, titulo) {
  const template = HtmlService.createTemplateFromFile(nomeArquivo);
  template.urlAlternarConta = obterUrlAlternarConta();
  template.sistemaNome = CONFIG.SISTEMA.NOME;
  template.sistemaVersao = CONFIG.SISTEMA.VERSAO;
  return finalizarTemplate(template, titulo);
}

function include(nomeArquivo) {
  const nome = textoSeguro(nomeArquivo);
  if (!nome) throw new Error("Nome do arquivo não informado.");

  const template = HtmlService.createTemplateFromFile(nome);
  template.sistemaNome = CONFIG.SISTEMA.NOME;
  template.sistemaVersao = CONFIG.SISTEMA.VERSAO;
  template.urlSistema = obterUrlSistema();
  template.urlAdmin = obterUrlAdmin();
  template.dominioInstitucional = CONFIG.AUTH.DOMINIO_INSTITUCIONAL;
  template.mostrarModalAcesso = false;
  return template.evaluate().getContent();
}
