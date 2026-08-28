/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 14_ForumAPI.gs
 * ==========================================================
 */

function obterHierarquiaPublicaForum(termo) {
  try {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
    return respostaSucesso(listarHierarquiaContatos(termo || ""));
  } catch (erro) {
    try { registrarErroAPI("OBTER_HIERARQUIA_FORUM", erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function pesquisarHierarquiaPublicaForum(termo) {
  try {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.PESQUISAR);
    const valor = termo === null || termo === undefined ? "" : String(termo);
    if (valor.trim() && limparTexto(valor).length < CONFIG.LIMITES.TAMANHO_PESQUISA) {
      return respostaSucesso({ sucesso: true, municipios: [] });
    }
    return respostaSucesso(pesquisarHierarquiaContatos(valor));
  } catch (erro) {
    try { registrarErroAPI("PESQUISAR_HIERARQUIA_FORUM", erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function validarArquiteturaForum() {
  try {
    new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    return respostaSucesso(validarModeloForumContatos());
  } catch (erro) {
    try { registrarErroAPI("VALIDAR_ARQUITETURA_FORUM", erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function validarDadosReaisForumV4API() {
  try {
    new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    return respostaSucesso(validarDadosReaisForumV4());
  } catch (erro) {
    try { registrarErroAPI("VALIDAR_DADOS_REAIS_FORUM_V4", erro); } catch (e) {}
    return respostaErro(erro);
  }
}
