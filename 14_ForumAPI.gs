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

/**
 * Catálogo compacto usado pelo Formulário de Acesso.
 *
 * Retorna somente unidades ativas com o contexto necessário para uma
 * escolha inequívoca: Município -> Fórum -> Unidade. Não carrega setores
 * nem contatos e, por isso, permanece leve mesmo com todas as unidades.
 */
function listarUnidadesParaAcesso() {
  try {
    const sheetMunicipios = DB.municipios();
    const sheetForuns = DB.forum();
    const sheetUnidades = DB.unidades();
    const mapaMunicipios = DB.map(sheetMunicipios);
    const mapaForuns = DB.map(sheetForuns);
    const mapaUnidades = DB.map(sheetUnidades);

    const municipios = {};
    DB.read(sheetMunicipios).forEach(function(linha) {
      const id = textoSeguro(_fcCampo(mapaMunicipios, linha, ["ID"]));
      if (!id || !paraBoolean(_fcCampo(mapaMunicipios, linha, ["ATIVO"], true))) return;
      municipios[id] = textoSeguro(_fcCampo(mapaMunicipios, linha, ["NOME"]));
    });

    const foruns = {};
    DB.read(sheetForuns).forEach(function(linha) {
      const id = textoSeguro(_fcCampo(mapaForuns, linha, ["ID"]));
      const municipioId = textoSeguro(_fcCampo(mapaForuns, linha, ["MUNICIPIO_ID"]));
      if (!id || !municipios[municipioId] || !paraBoolean(_fcCampo(mapaForuns, linha, ["ATIVO"], true))) return;
      foruns[id] = {
        id: id,
        nome: textoSeguro(_fcCampo(mapaForuns, linha, ["NOME"])),
        municipioId: municipioId,
        municipio: municipios[municipioId],
        ordem: Number(_fcCampo(mapaForuns, linha, ["ORDEM"], 0)) || 0
      };
    });

    const unidades = DB.read(sheetUnidades)
      .map(function(linha, indice) {
        const id = textoSeguro(_fcCampo(mapaUnidades, linha, ["ID"]));
        const forumId = textoSeguro(_fcCampo(mapaUnidades, linha, ["FORUM_ID"]));
        const forum = foruns[forumId];
        if (!id || !forum || !paraBoolean(_fcCampo(mapaUnidades, linha, ["ATIVO"], true))) return null;
        const nome = textoSeguro(_fcCampo(mapaUnidades, linha, ["NOME"]));
        return {
          id: id,
          nome: nome,
          forumId: forumId,
          forum: forum.nome,
          municipioId: forum.municipioId,
          municipio: forum.municipio,
          observacao: textoSeguro(_fcCampo(mapaUnidades, linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
          ordemForum: forum.ordem,
          ordem: Number(_fcCampo(mapaUnidades, linha, ["ORDEM"], indice + 1)) || indice + 1
        };
      })
      .filter(Boolean)
      .sort(function(a, b) {
        const municipio = a.municipio.localeCompare(b.municipio, "pt-BR");
        if (municipio !== 0) return municipio;
        if (a.ordemForum !== b.ordemForum) return a.ordemForum - b.ordemForum;
        const forum = a.forum.localeCompare(b.forum, "pt-BR");
        if (forum !== 0) return forum;
        if (a.ordem !== b.ordem) return a.ordem - b.ordem;
        return a.nome.localeCompare(b.nome, "pt-BR");
      });

    return respostaSucesso(unidades);
  } catch (erro) {
    try { registrarErroAPI("LISTAR_UNIDADES_PARA_ACESSO", erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function validarArquiteturaForum(authDados) {
  try {
    new AuthService(authDados).exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    return respostaSucesso(validarModeloForumContatos());
  } catch (erro) {
    try { registrarErroAPI("VALIDAR_ARQUITETURA_FORUM", erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function validarDadosReaisForumV4API(authDados) {
  try {
    new AuthService(authDados).exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    return respostaSucesso(validarDadosReaisForumV4());
  } catch (erro) {
    try { registrarErroAPI("VALIDAR_DADOS_REAIS_FORUM_V4", erro); } catch (e) {}
    return respostaErro(erro);
  }
}
