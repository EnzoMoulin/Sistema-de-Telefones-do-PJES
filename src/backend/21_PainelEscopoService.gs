/**
 * Ajustes de escopo do painel V6.
 * Mantém a consulta pública/global e restringe apenas GESTOR_CONTEUDO
 * aos Fóruns/Unidades cobertos pelos acessos ativos.
 */

function _pjesEhGestorConteudoEscopoV6(usuario) {
  return Boolean(
    usuario &&
    usuario.logado === true &&
    usuario.ativo === true &&
    String(usuario.perfil || "").toUpperCase() === String(CONFIG.PERFIS.GESTOR_CONTEUDO || "GESTOR_CONTEUDO").toUpperCase()
  );
}

function _pjesIdsUnidadesEscopoV6(usuario) {
  return new Set(
    (Array.isArray(usuario && usuario.unidadeIds) ? usuario.unidadeIds : [])
      .map(function(id) { return textoSeguro(id); })
      .filter(Boolean)
  );
}

function _pjesTemAcessoForumExplicitoV6(usuario, forumId) {
  const alvo = textoSeguro(forumId);
  if (!alvo) return false;
  return (Array.isArray(usuario && usuario.acessos) ? usuario.acessos : []).some(function(acesso) {
    return normalizarChave(acesso && acesso.tipo) === "FORUM" &&
      textoSeguro(acesso && acesso.id) === alvo;
  });
}

function _pjesFiltrarContatosEscopoV6(dados, usuario) {
  const lista = Array.isArray(dados) ? dados : [];
  if (!_pjesEhGestorConteudoEscopoV6(usuario)) return lista;

  const ids = _pjesIdsUnidadesEscopoV6(usuario);
  return lista.filter(function(item) {
    const noId = textoSeguro(
      valorObjeto(item || {}, "noId", "unidadeOrganizacionalId", "UNIDADE_ORGANIZACIONAL_ID")
    );
    if (noId) return ids.has(noId);

    const forumId = textoSeguro(valorObjeto(item || {}, "forumId", "FORUM_ID"));
    return _pjesTemAcessoForumExplicitoV6(usuario, forumId);
  });
}

function _pjesFiltrarNoHierarquiaV6(no, idsPermitidos) {
  if (!no) return null;

  const filhos = (Array.isArray(no.filhos) ? no.filhos : [])
    .map(function(filho) { return _pjesFiltrarNoHierarquiaV6(filho, idsPermitidos); })
    .filter(Boolean);

  const proprioPermitido = idsPermitidos.has(textoSeguro(no.id));
  if (!proprioPermitido && !filhos.length) return null;

  const contatos = proprioPermitido && Array.isArray(no.contatos) ? no.contatos.slice() : [];
  const copia = Object.assign({}, no, {
    contatos: contatos,
    filhos: filhos
  });

  copia.qtdFilhos = filhos.length;
  copia.qtdNos = 1 + filhos.reduce(function(total, filho) {
    return total + Number(filho.qtdNos || 1);
  }, 0);
  copia.qtdContatos = contatos.length + filhos.reduce(function(total, filho) {
    return total + Number(filho.qtdContatos || 0);
  }, 0);

  return copia;
}

function _pjesFiltrarHierarquiaEscopoV6(hierarquia, usuario) {
  const base = hierarquia || { sucesso: true, municipios: [] };
  if (!_pjesEhGestorConteudoEscopoV6(usuario)) return base;

  const ids = _pjesIdsUnidadesEscopoV6(usuario);
  const municipios = (Array.isArray(base.municipios) ? base.municipios : []).map(function(municipio) {
    const nosDiretos = (Array.isArray(municipio.nos) ? municipio.nos : [])
      .map(function(no) { return _pjesFiltrarNoHierarquiaV6(no, ids); })
      .filter(Boolean);
    const foruns = (Array.isArray(municipio.foruns) ? municipio.foruns : []).map(function(forum) {
      if (_pjesTemAcessoForumExplicitoV6(usuario, forum.id)) {
        return forum;
      }

      const nos = (Array.isArray(forum.nos) ? forum.nos : [])
        .map(function(no) { return _pjesFiltrarNoHierarquiaV6(no, ids); })
        .filter(Boolean);

      if (!nos.length) return null;

      return Object.assign({}, forum, {
        contatos: [],
        nos: nos
      });
    }).filter(Boolean);

    if (!foruns.length && !nosDiretos.length) return null;
    const contatosDiretos = [];
    const qtdNosDiretos = nosDiretos.reduce(function(total, no) { return total + Number(no.qtdNos || 1); }, 0);
    const contarUnidades = function(lista) {
      return (lista || []).reduce(function(total, no) {
        return total + (no.selecionavelAcesso ? 1 : 0) + contarUnidades(no.filhos || []);
      }, 0);
    };
    const qtdContatosDiretos = nosDiretos.reduce(function(total, no) { return total + Number(no.qtdContatos || 0); }, 0);
    return Object.assign({}, municipio, {
      contatos: contatosDiretos,
      nos: nosDiretos,
      foruns: foruns,
      qtdForuns: foruns.length,
      qtdNos: qtdNosDiretos + foruns.reduce(function(total, forum) { return total + Number(forum.qtdNos || 0); }, 0),
      qtdUnidades: contarUnidades(nosDiretos) + foruns.reduce(function(total, forum) { return total + Number(forum.qtdUnidades || 0); }, 0),
      qtdContatos: qtdContatosDiretos + foruns.reduce(function(total, forum) { return total + Number(forum.qtdContatos || 0); }, 0)
    });
  }).filter(Boolean);

  return Object.assign({}, base, { municipios: municipios });
}

function _pjesDadosContatosEscopadosV6() {
  const usuario = new AuthService().usuarioAtual();
  return _pjesFiltrarContatosEscopoV6(_v4Flat({}), usuario);
}

function pjesListarContatosEscopadosV6() {
  try {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
    return respostaSucesso(_pjesDadosContatosEscopadosV6());
  } catch (erro) {
    try { registrarErroAPI("LISTAR_CONTATOS_ESCOPO_V6", erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function pjesPesquisarContatosEscopadosV6(texto) {
  try {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.PESQUISAR);
    const termoBruto = textoSeguro(texto);
    if (termoBruto && limparTexto(termoBruto).length < CONFIG.LIMITES.TAMANHO_PESQUISA) {
      return respostaSucesso([]);
    }

    const termo = limparTexto(termoBruto);
    const dados = _pjesDadosContatosEscopadosV6();
    if (!termo) return respostaSucesso(dados);

    return respostaSucesso(dados.filter(function(item) {
      return limparTexto([
        item.municipio, item.forum, item.caminhoTexto, item.unidade, item.setor,
        item.tipo, item.descricao, item.valor, item.email, item.endereco, item.observacao
      ].join(" ")).includes(termo);
    }));
  } catch (erro) {
    try { registrarErroAPI("PESQUISAR_CONTATOS_ESCOPO_V6", erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function pjesObterHierarquiaContatosEscopadaV6(termo) {
  try {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
    const usuario = new AuthService().usuarioAtual();
    const dados = construirHierarquiaForumContatos({ termo: termo || "" });
    return respostaSucesso(_pjesFiltrarHierarquiaEscopoV6(dados, usuario));
  } catch (erro) {
    try { registrarErroAPI("HIERARQUIA_CONTATOS_ESCOPO_V6", erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function pjesListarMunicipiosEscopadosV6() {
  try {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
    const usuario = new AuthService().usuarioAtual();
    const hierarquia = _pjesFiltrarHierarquiaEscopoV6(
      construirHierarquiaForumContatos({}),
      usuario
    );
    return respostaSucesso(
      (hierarquia.municipios || []).map(function(municipio) { return municipio.nome; })
    );
  } catch (erro) {
    try { registrarErroAPI("LISTAR_MUNICIPIOS_ESCOPO_V6", erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function _pjesTipoContatoDashboardV6(tipo) {
  const chave = normalizarChave(tipo);
  if (chave === "TELEFONE" || chave === "CELULAR") return "Telefone";
  if (chave === "RAMAL") return "Ramal";
  if (chave === "WHATSAPP") return "WhatsApp";
  if (chave === "EMAIL") return "E-mail";
  return "";
}

function pjesCarregarDashboardEscopadoV6() {
  try {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
    const dados = _pjesDadosContatosEscopadosV6();
    const tipos = { "Telefone": 0, "Ramal": 0, "WhatsApp": 0, "E-mail": 0 };
    const setores = {};
    const municipios = {};
    const foruns = {};
    const unidades = {};

    dados.forEach(function(item) {
      const tipo = _pjesTipoContatoDashboardV6(item.tipo);
      if (tipo) tipos[tipo] += 1;

      const municipio = textoSeguro(item.municipio) || "Não informado";
      municipios[municipio] = (municipios[municipio] || 0) + 1;

      if (item.forumId) foruns[item.forumId] = true;
      if (item.unidadeId) unidades[item.unidadeId] = true;
      if (item.setorId) setores[item.setorId] = true;
    });

    return respostaSucesso({
      total: dados.length,
      tipos: tipos,
      municipios: municipios,
      comarcas: municipios,
      totalTipos: 4,
      totalMunicipios: Object.keys(municipios).length,
      totalForuns: Object.keys(foruns).length,
      totalUnidades: Object.keys(unidades).length,
      totalSetores: Object.keys(setores).length
    });
  } catch (erro) {
    try { registrarErroAPI("DASHBOARD_ESCOPO_V6", erro); } catch (e) {}
    return respostaErro(erro);
  }
}
