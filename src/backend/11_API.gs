/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 11_API.gs
 * ==========================================================
 */

/**
 * ==========================================================
 * RESPOSTAS
 * ==========================================================
 */

function respostaSucesso(dados) {
  return {
    sucesso: true,
    dados: serializarDadosAPI(dados)
  };
}

function respostaErro(erro) {
  let mensagem = "Erro desconhecido.";

  if (erro && erro.message) {
    mensagem = String(erro.message);
  } else if (erro !== null && erro !== undefined) {
    mensagem = String(erro);
  }

  return {
    sucesso: false,
    erro: mensagem
  };
}

function serializarDadosAPI(dados) {
  if (dados === undefined || dados === null) {
    return null;
  }

  return JSON.parse(
    JSON.stringify(dados)
  );
}

/**
 * ==========================================================
 * API PRINCIPAL
 * ==========================================================
 */

function carregarSistema() {
  try {
    const usuario =
      new AuthService().usuarioAtual();

    return respostaSucesso({
      usuario: usuario.email || "",
      versao: CONFIG.SISTEMA.VERSAO
    });
  } catch (erro) {
    registrarErroAPI(
      "CARREGAR_SISTEMA",
      erro
    );

    return respostaErro(erro);
  }
}

function listarTelefones() {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.VISUALIZAR
    );

    const dados =
      new TelefoneRepository().listar();

    /*
     * Gestor de conteúdo limitado a comarcas específicas
     * enxerga (e só consegue atuar) nas suas comarcas.
     */
    const usuario =
      new AuthService().usuarioAtual();

    if (
      usuario.logado &&
      usuario.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuario.comarcas || []).length > 0
    ) {
      const permitidas =
        usuario.comarcas.map(item =>
          normalizarChave(item)
        );

      return respostaSucesso(
        dados.filter(item =>
          permitidas.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        )
      );
    }

    return respostaSucesso(dados);
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_TELEFONES",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * Lista as comarcas cadastradas (para o seletor do
 * Formulário de Acesso e demais menus suspensos).
 */
function listarComarcas() {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.VISUALIZAR
    );

    const dados =
      new TelefoneRepository().listar();

    const usuarioComarcas =
      new AuthService().usuarioAtual();

    let dadosFiltrados = dados;

    if (
      usuarioComarcas.logado &&
      usuarioComarcas.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuarioComarcas.comarcas || []).length > 0
    ) {
      const permitidasComarcas =
        usuarioComarcas.comarcas.map(item =>
          normalizarChave(item)
        );

      dadosFiltrados =
        dados.filter(item =>
          permitidasComarcas.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        );
    }

    const comarcas = {};

    dadosFiltrados.forEach(item => {
      const comarca =
        textoSeguro(item.comarca);

      if (comarca && !comarcas[comarca]) {
        comarcas[comarca] = true;
      }
    });

    const lista =
      Object.keys(comarcas)
        .sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        );

    return respostaSucesso(lista);
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_COMARCAS",
      erro
    );

    return respostaErro(erro);
  }
}

function pesquisarTelefones(texto) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.PESQUISAR
    );

    const termo =
      texto === null || texto === undefined
        ? ""
        : String(texto).trim();

    if (
      termo &&
      limparTexto(termo).length <
        CONFIG.LIMITES.TAMANHO_PESQUISA
    ) {
      return respostaSucesso([]);
    }

    let resultadoPesquisa =
      new TelefoneRepository().pesquisar(termo);

    const usuarioPesquisa =
      new AuthService().usuarioAtual();

    if (
      usuarioPesquisa.logado &&
      usuarioPesquisa.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuarioPesquisa.comarcas || []).length > 0
    ) {
      const permitidasPesquisa =
        usuarioPesquisa.comarcas.map(item =>
          normalizarChave(item)
        );

      resultadoPesquisa =
        resultadoPesquisa.filter(item =>
          permitidasPesquisa.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        );
    }

    return respostaSucesso(resultadoPesquisa);
  } catch (erro) {
    registrarErroAPI(
      "PESQUISAR_TELEFONES",
      erro
    );

    return respostaErro(erro);
  }
}

function obterTelefone(id) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.VISUALIZAR
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID do telefone é obrigatório."
      );
    }

    const registroTelefone =
      new TelefoneRepository().obter(idBusca);

    if (registroTelefone) {
      new AuthService().exigirPermissaoComarca(
        textoSeguro(registroTelefone.comarca)
      );
    }

    return respostaSucesso(registroTelefone);
  } catch (erro) {
    registrarErroAPI(
      "OBTER_TELEFONE",
      erro
    );

    return respostaErro(erro);
  }
}

function carregarDashboard() {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.VISUALIZAR
    );

    const telefones =
      new TelefoneRepository().listar();

    const usuarioDashboard =
      new AuthService().usuarioAtual();

    let telefonesDashboard = telefones;

    if (
      usuarioDashboard.logado &&
      usuarioDashboard.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuarioDashboard.comarcas || []).length > 0
    ) {
      const permitidasDash =
        usuarioDashboard.comarcas.map(item =>
          normalizarChave(item)
        );

      telefonesDashboard =
        telefones.filter(item =>
          permitidasDash.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        );
    }

    const tipos = {};
    const setores = {};
    const comarcas = {};

    telefonesDashboard.forEach(item => {
      const tipo =
        textoSeguro(item.tipo) ||
        "Não informado";

      const setor =
        textoSeguro(item.setor) ||
        "Não informado";

      const comarca =
        textoSeguro(item.comarca) ||
        "Não informado";

      tipos[tipo] =
        (tipos[tipo] || 0) + 1;

      setores[setor] =
        (setores[setor] || 0) + 1;

      comarcas[comarca] =
        (comarcas[comarca] || 0) + 1;
    });

    return respostaSucesso({
      total: telefonesDashboard.length,
      tipos: tipos,
      setores: setores,
      comarcas: comarcas
    });
  } catch (erro) {
    registrarErroAPI(
      "DASHBOARD",
      erro
    );

    return respostaErro(erro);
  }
}

function criarTelefone(dados) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.EDITAR
    );

    if (!ehObjeto(dados)) {
      throw new Error(
        "Os dados do telefone não foram fornecidos."
      );
    }

    new AuthService().exigirPermissaoComarca(
      valorObjeto(dados, "comarca", "COMARCA")
    );

    return respostaSucesso(
      new TelefoneRepository().inserir(dados)
    );
  } catch (erro) {
    registrarErroAPI(
      "CRIAR_TELEFONE",
      erro
    );

    return respostaErro(erro);
  }
}

function atualizarTelefone(id, dados) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.EDITAR
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID do telefone é obrigatório para atualização."
      );
    }

    if (!ehObjeto(dados)) {
      throw new Error(
        "Dados para atualização não foram fornecidos."
      );
    }

    /*
     * O gestor de conteúdo limitado só pode alterar telefones
     * das suas comarcas — nem a comarca atual nem a nova podem
     * estar fora do escopo dele.
     */
    const atual =
      new TelefoneRepository().obter(idBusca);

    if (atual) {
      new AuthService().exigirPermissaoComarca(
        textoSeguro(atual.comarca)
      );
    }

    const novaComarca =
      textoSeguro(
        valorObjeto(dados, "comarca", "COMARCA")
      );

    if (novaComarca) {
      new AuthService().exigirPermissaoComarca(novaComarca);
    }

    return respostaSucesso(
      new TelefoneRepository().atualizar(
        idBusca,
        dados
      )
    );
  } catch (erro) {
    registrarErroAPI(
      "ATUALIZAR_TELEFONE",
      erro
    );

    return respostaErro(erro);
  }
}

function excluirTelefone(id) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.EXCLUIR
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID do telefone é obrigatório."
      );
    }

    const registro =
      new TelefoneRepository().obter(idBusca);

    if (registro) {
      new AuthService().exigirPermissaoComarca(
        textoSeguro(registro.comarca)
      );
    }

    const resultado =
      new TelefoneRepository().excluir(idBusca);

    registrarInfoAPI(
      "EXCLUIR_TELEFONE",
      "Telefone excluído: " + idBusca
    );

    return respostaSucesso(resultado);
  } catch (erro) {
    registrarErroAPI(
      "EXCLUIR_TELEFONE",
      erro
    );

    return respostaErro(erro);
  }
}

function listarHistorico(id) {
  try {
    new AuthService().exigirPermissao(
      CONFIG.PERMISSOES.HISTORICO
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID do telefone é obrigatório."
      );
    }

    const registroHistorico =
      new TelefoneRepository().obter(idBusca);

    if (registroHistorico) {
      new AuthService().exigirPermissaoComarca(
        textoSeguro(registroHistorico.comarca)
      );
    }

    return respostaSucesso(
      new HistoryService().listar(idBusca)
    );
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_HISTORICO",
      erro
    );

    return respostaErro(erro);
  }
}

function obterUsuarioAtual() {
  try {
    return respostaSucesso(new AuthService().usuarioAtual());
  } catch (erro) {
    registrarErroAPI("OBTER_USUARIO", erro);
    return respostaErro(erro);
  }
}

function encerrarSessao() {
  return respostaSucesso(true);
}

/**
 * ==========================================================
 * SOLICITAÇÕES DE ACESSO POR IDENTIDADE GOOGLE
 * ==========================================================
 */

function tipoEscopoAcesso(valor) {
  const tipo = normalizarChave(valor);
  return (CONFIG.ACESSOS.TIPOS_ESCOPO || []).includes(tipo) ? tipo : "";
}

function normalizarEscoposAcesso(valor) {
  let itens = valor;
  if (typeof itens === "string") {
    try { itens = JSON.parse(itens); } catch (e) {
      itens = itens.split(/[,;|]+/).map(function(id) { return { tipo: CONFIG.ACESSOS.UNIDADE, id: id }; });
    }
  }
  if (!Array.isArray(itens)) itens = itens ? [itens] : [];
  const vistos = new Set();
  return itens.map(function(item) {
    const objeto = ehObjeto(item) ? item : { id: item };
    const tipoInformado = textoSeguro(valorObjeto(objeto, "tipo", "TIPO", "tipoEscopo", "TIPO_ESCOPO"));
    const tipo = tipoEscopoAcesso(tipoInformado) || (!tipoInformado ? CONFIG.ACESSOS.UNIDADE : "");
    const id = textoSeguro(valorObjeto(objeto, "id", "ID", "escopoId", "ESCOPO_ID", "unidadeId", "UNIDADE_ID"));
    return { tipo: tipo, id: id };
  }).filter(function(item) {
    const chave = item.tipo + ":" + item.id;
    if (!item.tipo || !item.id || vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

function serializarEscoposAcesso(escopos) {
  return JSON.stringify(normalizarEscoposAcesso(escopos));
}

function indicesAcessosUnidades(sheet) {
  const mapa = DB.map(sheet);
  const indices = {
    id: mapa.ID,
    usuarioId: mapa.USUARIOID,
    tipo: mapa.TIPOESCOPO,
    escopoId: mapa.ESCOPOID || mapa.UNIDADEID,
    ativo: mapa.ATIVO
  };
  const ausentes = Object.keys(indices).filter(function(chave) {
    return chave !== "tipo" && indices[chave] === undefined;
  });
  if (ausentes.length) {
    throw new Error("Aba ACESSOS_UNIDADES inválida. Cabeçalhos ausentes: " + ausentes.join(", ") + ".");
  }
  return indices;
}

function lerAcessosAtivosUsuario(usuarioId) {
  return lerTodosAcessosAtivos().filter(function(acesso) {
    return acesso.usuarioId === textoSeguro(usuarioId);
  }).map(function(acesso) { return { tipo: acesso.tipo, id: acesso.id }; });
}

function lerTodosAcessosAtivos() {
  const sheet = DB.acessosUnidadesOuNulo();
  if (!sheet) return [];
  const indices = indicesAcessosUnidades(sheet);
  return DB.read(sheet).filter(function(linha) {
    return paraBoolean(linha[indices.ativo - 1]);
  }).map(function(linha) {
    const tipo = indices.tipo === undefined
      ? CONFIG.ACESSOS.UNIDADE
      : tipoEscopoAcesso(linha[indices.tipo - 1]);
    return {
      usuarioId: textoSeguro(linha[indices.usuarioId - 1]),
      tipo: tipo,
      id: textoSeguro(linha[indices.escopoId - 1])
    };
  }).filter(function(item) { return item.tipo && item.id; });
}

function resolverEscopoAcessos(acessos, catalogo) {
  const ids = new Set();
  (acessos || []).forEach(function(acesso) {
    (catalogo.unidadesPorEscopo[acesso.tipo + ":" + acesso.id] || []).forEach(function(id) { ids.add(id); });
  });
  const unidades = (acessos || []).map(function(acesso) {
    return catalogo.porChave[acesso.tipo + ":" + acesso.id] ||
      { id: acesso.id, tipo: acesso.tipo, nome: acesso.id, caminhoTexto: acesso.id, municipio: "", forum: "" };
  });
  return { ids: Array.from(ids), unidades: unidades, acessos: acessos || [] };
}

function montarCatalogoEscoposAcesso() {
  const shMunicipios = DB.municipios();
  const shForuns = DB.forum();
  const mapaM = DB.map(shMunicipios);
  const mapaF = DB.map(shForuns);
  const municipios = {};
  DB.read(shMunicipios).forEach(function(linha) {
    const id = textoSeguro(linha[mapaM.ID - 1]);
    if (!id || (mapaM.ATIVO && !paraBoolean(linha[mapaM.ATIVO - 1]))) return;
    municipios[id] = { id: id, nome: textoSeguro(linha[mapaM.NOME - 1]) || id };
  });
  const foruns = {};
  DB.read(shForuns).forEach(function(linha) {
    const id = textoSeguro(linha[mapaF.ID - 1]);
    const municipioId = textoSeguro(linha[mapaF.MUNICIPIOID - 1]);
    if (!id || !municipios[municipioId] || (mapaF.ATIVO && !paraBoolean(linha[mapaF.ATIVO - 1]))) return;
    foruns[id] = { id: id, nome: textoSeguro(linha[mapaF.NOME - 1]) || id, municipioId: municipioId };
  });

  const nos = _fcIndiceOrganizacional();
  const porChave = {};
  const itens = [];
  const unidadesPorEscopo = {};
  Object.keys(foruns).forEach(function(id) {
    const forum = foruns[id];
    const item = { tipo: CONFIG.ACESSOS.FORUM, id: id, nome: forum.nome, municipio: municipios[forum.municipioId].nome, forumId: id, forum: forum.nome, caminhoTexto: forum.nome + " (" + municipios[forum.municipioId].nome + ")" };
    porChave[item.tipo + ":" + id] = item;
    itens.push(item);
    unidadesPorEscopo[item.tipo + ":" + id] = [];
  });

  Object.keys(nos).forEach(function(id) {
    const no = nos[id];
    const forum = foruns[no.forumId];
    if (!forum || !no.ativo) return;
    const caminho = _fcResolverAncestros(nos, id);
    if (caminho.some(function(item) { return !item.ativo; })) return;
    const municipio = municipios[forum.municipioId];
    const chaveForum = CONFIG.ACESSOS.FORUM + ":" + forum.id;
    unidadesPorEscopo[chaveForum].push(id);
    caminho.forEach(function(ancestral) {
      const chaveUnidade = CONFIG.ACESSOS.UNIDADE + ":" + ancestral.id;
      if (!unidadesPorEscopo[chaveUnidade]) unidadesPorEscopo[chaveUnidade] = [];
      unidadesPorEscopo[chaveUnidade].push(id);
    });
    if (!no.selecionavelAcesso) return;
    const item = {
      tipo: CONFIG.ACESSOS.UNIDADE,
      id: id,
      nome: no.nome || id,
      municipio: municipio.nome,
      forumId: forum.id,
      forum: forum.nome,
      caminhoTexto: caminho.map(function(ancestral) { return ancestral.nome; }).join(" › ")
    };
    porChave[item.tipo + ":" + id] = item;
    itens.push(item);
  });
  return { porChave: porChave, itens: itens, unidadesPorEscopo: unidadesPorEscopo };
}

function validarEscoposAcesso(escopos) {
  const normalizados = normalizarEscoposAcesso(escopos);
  const catalogo = montarCatalogoEscoposAcesso();
  normalizados.forEach(function(escopo) {
    if (!catalogo.porChave[escopo.tipo + ":" + escopo.id]) {
      throw new Error("Um dos Municípios, Fóruns ou Unidades selecionados é inválido ou está inativo.");
    }
  });
  return normalizados;
}

function prepararTabelaAcessosUnidades() {
  const sheet = DB.acessosUnidades();
  const mapa = DB.map(sheet);
  if (mapa.TIPOESCOPO === undefined || mapa.ESCOPOID === undefined) {
    garantirEstruturaAcessosUnidades(sheet);
  }
  indicesAcessosUnidades(sheet);
  return sheet;
}

function listarEscoposParaAcesso() {
  try {
    AuthService.exigirContextoPrivado();
    const usuario = new AuthService().usuarioAtual();
    if (!usuario.identificado || !AuthService.emailPermitidoNoPrivado(usuario.email)) {
      throw new Error("Não foi possível identificar uma conta autorizada nesta URL privada.");
    }
    return respostaSucesso(montarCatalogoEscoposAcesso().itens);
  } catch (erro) {
    registrarErroAPI("LISTAR_ESCOPOS_ACESSO", erro);
    return respostaErro(erro);
  }
}

function indicesSolicitacao(linhaCabecalho) {
  const alvos = {
    ID: ["ID"],
    EMAIL: ["EMAIL"],
    NOME: ["NOME"],
    COMARCA: ["COMARCA"],
    NIVEL: ["NIVEL_SOLICITADO", "NIVEL", "PERFIL_SOLICITADO", "PERFIL"],
    UNIDADE_ID: ["UNIDADE_ID", "UNIDADES", "UNIDADES_IDS"],
    ESCOPOS: ["ESCOPO_ACESSOS", "ACESSOS_SOLICITADOS"],
    JUSTIFICATIVA: ["JUSTIFICATIVA"],
    STATUS: ["STATUS"],
    DATA: ["DATA_SOLICITACAO", "DATA"],
    APROVADOR: ["APROVADOR"],
    DATA_APROVACAO: ["DATA_APROVACAO"]
  };
  const indices = {};
  (Array.isArray(linhaCabecalho) ? linhaCabecalho : []).forEach(function(cabecalho, i) {
    const chave = normalizarChave(cabecalho);
    Object.keys(alvos).forEach(function(grupo) {
      if (indices[grupo] === undefined && alvos[grupo].some(function(nome) {
        return normalizarChave(nome) === chave;
      })) indices[grupo] = i;
    });
  });
  return indices;
}

function montarLinhaSolicitacao(indices, campos, larguraInformada) {
  const largura = Number(larguraInformada) || Object.keys(indices).reduce(function(maximo, grupo) {
    return Math.max(maximo, indices[grupo] + 1);
  }, 0);
  const linha = new Array(largura).fill("");
  Object.keys(campos).forEach(function(grupo) {
    if (indices[grupo] !== undefined) linha[indices[grupo]] = campos[grupo];
  });
  return linha;
}

function escoposDaSolicitacao(linha, indices) {
  const estruturados = indices.ESCOPOS !== undefined
    ? normalizarEscoposAcesso(linha[indices.ESCOPOS])
    : [];
  if (estruturados.length || indices.UNIDADE_ID === undefined) return estruturados;
  return normalizarEscoposAcesso(linha[indices.UNIDADE_ID]);
}

function nivelSolicitadoNumero(valor) {
  const numero = Number(valor);
  if (numero === CONFIG.NIVEIS.GESTOR_CONTEUDO || numero === CONFIG.NIVEIS.GESTOR_SISTEMA) {
    return numero;
  }
  const perfil = String(valor || "").trim().toUpperCase();
  return CONFIG.NIVEIS.POR_PERFIL[perfil] || 0;
}

function idsUnidadesSolicitadas(valor) {
  const lista = Array.isArray(valor) ? valor : String(valor || "").split(/[,;|]+/);
  return Array.from(new Set(lista.map(textoSeguro).filter(Boolean)));
}

function listarUnidadesParaAcesso() {
  try {
    AuthService.exigirContextoPrivado();
    const usuario = new AuthService().usuarioAtual();
    if (!usuario.identificado || !AuthService.emailPermitidoNoPrivado(usuario.email)) {
      throw new Error("Não foi possível identificar uma conta autorizada nesta URL privada.");
    }

    const shUnidades = DB.unidadesOrganizacionais();
    const mapaU = DB.map(shUnidades);
    const nos = _fcIndiceOrganizacional();
    const shForum = DB.forum();
    const mapaF = DB.map(shForum);
    const shMunicipios = DB.municipios();
    const mapaM = DB.map(shMunicipios);
    const foruns = {};
    DB.read(shForum).forEach(function(linha) {
      foruns[textoSeguro(linha[mapaF.ID - 1])] = {
        nome: textoSeguro(linha[mapaF.NOME - 1]),
        municipioId: mapaF.MUNICIPIOID ? textoSeguro(linha[mapaF.MUNICIPIOID - 1]) : ""
      };
    });
    const municipios = {};
    DB.read(shMunicipios).forEach(function(linha) {
      municipios[textoSeguro(linha[mapaM.ID - 1])] = textoSeguro(linha[mapaM.NOME - 1]);
    });

    const unidades = DB.read(shUnidades)
      .filter(function(linha) {
        return (!mapaU.ATIVO || paraBoolean(linha[mapaU.ATIVO - 1])) &&
          (!mapaU.SELECIONAVELACESSO || paraBoolean(linha[mapaU.SELECIONAVELACESSO - 1]));
      })
      .map(function(linha) {
        const id = textoSeguro(linha[mapaU.ID - 1]);
        const forumId = mapaU.FORUMID ? textoSeguro(linha[mapaU.FORUMID - 1]) : "";
        const forum = foruns[forumId] || {};
        const caminho = id && nos[id] ? _fcResolverAncestros(nos, id) : [];
        if (caminho.some(function(no) { return !no.ativo; })) return null;
        return {
          id: id,
          nome: textoSeguro(linha[mapaU.NOME - 1]),
          tipo: mapaU.TIPO ? textoSeguro(linha[mapaU.TIPO - 1]) : "UNIDADE",
          caminho: caminho.map(function(no) { return no.nome; }),
          caminhoTexto: caminho.map(function(no) { return no.nome; }).join(" › "),
          forumId: forumId,
          forum: forum.nome || "",
          municipio: municipios[forum.municipioId] || ""
        };
      })
      .filter(function(item) { return item && item.id && item.nome; })
      .sort(function(a, b) {
        return [a.municipio, a.forum, a.nome].join("|").localeCompare(
          [b.municipio, b.forum, b.nome].join("|"), "pt-BR"
        );
      });
    return respostaSucesso(unidades);
  } catch (erro) {
    registrarErroAPI("LISTAR_UNIDADES_ACESSO", erro);
    return respostaErro(erro);
  }
}

function listarSolicitacoes() {
  try {
    new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    const sheet = DB.solicitacoesAcesso();
    const dados = sheet.getDataRange().getValues();
    if (dados.length <= 1) return respostaSucesso([]);
    const indices = indicesSolicitacao(dados[0]);
    const catalogo = montarCatalogoEscoposAcesso();
    const resultado = dados.slice(1)
      .filter(function(row) {
        return String(row[indices.STATUS] || "").trim().toUpperCase() === "PENDENTE";
      })
      .map(function(row) {
        const nivel = nivelSolicitadoNumero(row[indices.NIVEL]);
        const escopos = escoposDaSolicitacao(row, indices);
        return {
          id: row[indices.ID],
          email: row[indices.EMAIL],
          nome: row[indices.NOME],
          nivelSolicitado: nivel,
          perfilSolicitado: CONFIG.NIVEIS.POR_NIVEL[String(nivel)] || "",
          nivelTexto: nivel
            ? CONFIG.NIVEIS.POR_NIVEL[String(nivel)] || "Nível inválido"
            : "Sem alteração de nível",
          escopos: escopos,
          acessosSolicitados: escopos.map(function(escopo) {
            const item = catalogo.porChave[escopo.tipo + ":" + escopo.id];
            return item ? item.caminhoTexto : escopo.id;
          }),
          justificativa: indices.JUSTIFICATIVA !== undefined ? row[indices.JUSTIFICATIVA] : "",
          status: row[indices.STATUS],
          data: indices.DATA !== undefined ? row[indices.DATA] : ""
        };
      });
    return respostaSucesso(resultado);
  } catch (erro) {
    registrarErroAPI("LISTAR_SOLICITACOES", erro);
    return respostaErro(erro);
  }
}

function contarSolicitacoesPendentes() {
  const resposta = listarSolicitacoes();
  if (!resposta || resposta.sucesso !== true) return resposta;
  return respostaSucesso({ total: resposta.dados.length });
}

function enviarFormularioAcesso(dados) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;
  try {
    lock.waitLock(30000);
    bloqueado = true;
    AuthService.exigirContextoPrivado();
    const usuario = new AuthService().usuarioAtual();
    if (!usuario.identificado || !AuthService.emailPermitidoNoPrivado(usuario.email)) {
      throw new Error("Não foi possível identificar uma conta institucional ou de teste autorizada.");
    }
    const ehAmpliacaoGestorConteudo = usuario.logado === true &&
      usuario.ativo === true && usuario.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO;
    if (usuario.cadastrado && !ehAmpliacaoGestorConteudo) {
      throw new Error(usuario.ativo
        ? "Este perfil já possui acesso global ou não pode solicitar ampliação."
        : "Esta conta está desativada. Procure o Gestor do Sistema.");
    }

    const entrada = ehObjeto(dados) ? dados : {};
    const nome = textoSeguro(valorObjeto(entrada, "nome", "NOME"));
    const nivel = nivelSolicitadoNumero(valorObjeto(
      entrada, "nivel", "NIVEL", "perfil", "PERFIL", "perfilSolicitado"
    ));
    const escoposInformados = valorObjeto(entrada, "escopos", "ESCOPOS", "acessos", "ACESSOS", "escopoAcessos", "ESCOPO_ACESSOS");
    const escopos = normalizarEscoposAcesso(escoposInformados || valorObjeto(
      entrada, "unidadeIds", "UNIDADE_IDS", "unidades", "UNIDADES", "UNIDADE_ID"
    ));
    const justificativa = textoSeguro(valorObjeto(entrada, "justificativa", "JUSTIFICATIVA"));

    if (nome.length < 3 || nome.length > CONFIG.LIMITES.TAMANHO_MAXIMO_NOME) {
      throw new Error("Informe um nome válido.");
    }
    if (nivel && nivel !== CONFIG.NIVEIS.GESTOR_CONTEUDO && nivel !== CONFIG.NIVEIS.GESTOR_SISTEMA) {
      throw new Error("Perfil desejado inválido. Use nível 1 ou 2.");
    }
    if (!usuario.cadastrado && !nivel) {
      throw new Error("Informe o nível de acesso desejado.");
    }
    if (!nivel && escopos.length === 0) {
      throw new Error("Selecione uma alteração de nível, localidades adicionais ou ambos.");
    }
    if (!usuario.cadastrado && nivel === CONFIG.NIVEIS.GESTOR_CONTEUDO && escopos.length === 0) {
      throw new Error("Selecione ao menos um Município, Fórum ou Unidade para o Gestor de Conteúdo.");
    }
    if (nivel === CONFIG.NIVEIS.GESTOR_SISTEMA && escopos.length) {
      throw new Error("O Gestor do Sistema possui escopo global e não recebe vínculos adicionais.");
    }
    if (justificativa.length > CONFIG.LIMITES.TAMANHO_MAXIMO_OBSERVACAO) {
      throw new Error("A justificativa é muito longa.");
    }

    const escoposValidados = escopos.length ? validarEscoposAcesso(escopos) : [];
    if (ehAmpliacaoGestorConteudo) {
      const permitidas = new Set(usuario.unidadeIds || []);
      const catalogo = montarCatalogoEscoposAcesso();
      const todosCobertos = escoposValidados.every(function(escopo) {
        const unidades = catalogo.unidadesPorEscopo[escopo.tipo + ":" + escopo.id] || [];
        return unidades.length > 0 && unidades.every(function(id) { return permitidas.has(id); });
      });
      if (todosCobertos) throw new Error("Todos os acessos selecionados já estão vinculados ao seu perfil.");
    }

    const sheet = DB.solicitacoesAcesso();
    garantirColunaEscopoAcessos(sheet);
    const dadosSheet = sheet.getDataRange().getValues();
    const indices = indicesSolicitacao(dadosSheet[0] || []);
    ["ID", "EMAIL", "NOME", "NIVEL", "STATUS", "DATA"].forEach(function(campo) {
      if (indices[campo] === undefined) {
        throw new Error("Aba SOLICITACOES_ACESSO sem a coluna " + campo + ".");
      }
    });
    if (indices.ESCOPOS === undefined && indices.UNIDADE_ID === undefined) {
      throw new Error("Aba SOLICITACOES_ACESSO sem a coluna ESCOPO_ACESSOS.");
    }
    const pendente = dadosSheet.slice(1).some(function(row) {
      return normalizarEmail(row[indices.EMAIL]) === usuario.email &&
        String(row[indices.STATUS] || "").trim().toUpperCase() === "PENDENTE";
    });
    if (pendente) throw new Error("Já existe uma solicitação pendente para esta conta.");

    const id = Utilities.getUuid();
    const linha = montarLinhaSolicitacao(indices, {
      ID: id,
      EMAIL: usuario.email,
      NOME: nome,
      NIVEL: nivel || "",
      UNIDADE_ID: escoposValidados.filter(function(escopo) { return escopo.tipo === CONFIG.ACESSOS.UNIDADE; }).map(function(escopo) { return escopo.id; }).join(","),
      ESCOPOS: serializarEscoposAcesso(escoposValidados),
      JUSTIFICATIVA: justificativa,
      STATUS: "PENDENTE",
      DATA: new Date()
    }, sheet.getLastColumn());
    sheet.appendRow(linha);
    SpreadsheetApp.flush();
    registrarInfoAPI("SOLICITAR_ACESSO", usuario.email + " -> nível " + nivel + " / " + escoposValidados.length + " escopo(s)");
    return respostaSucesso({ id: id, status: "PENDENTE" });
  } catch (erro) {
    registrarErroAPI("FORMULARIO_ACESSO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) lock.releaseLock();
  }
}

function solicitarAcesso(nome, nivel, justificativa, unidadeIds) {
  return enviarFormularioAcesso({
    nome: nome,
    nivel: nivel,
    justificativa: justificativa,
    unidadeIds: unidadeIds
  });
}

function localizarSolicitacaoAPI(sheet, id) {
  const dados = sheet.getDataRange().getValues();
  const indices = indicesSolicitacao(dados[0] || []);
  for (let i = 1; i < dados.length; i++) {
    if (textoSeguro(dados[i][indices.ID]) === textoSeguro(id)) {
      const nivel = nivelSolicitadoNumero(dados[i][indices.NIVEL]);
      return {
        linha: i + 1,
        id: dados[i][indices.ID],
        email: normalizarEmail(dados[i][indices.EMAIL]),
        nome: textoSeguro(dados[i][indices.NOME]),
        nivel: nivel,
        escopos: escoposDaSolicitacao(dados[i], indices),
        status: String(dados[i][indices.STATUS] || "").trim().toUpperCase()
      };
    }
  }
  return null;
}

function substituirAcessosUnidades(usuarioId, escopos) {
  const sheet = prepararTabelaAcessosUnidades();
  const mapa = indicesAcessosUnidades(sheet);
  const dados = DB.read(sheet);
  const normalizados = normalizarEscoposAcesso(escopos);
  const linhasAtualizadas = dados.map(function(linha) {
    const nova = linha.slice();
    if (textoSeguro(linha[mapa.usuarioId - 1]) === usuarioId) nova[mapa.ativo - 1] = "NÃO";
    return nova;
  });
  normalizados.forEach(function(escopo) {
    const existente = dados.findIndex(function(linha) {
      return textoSeguro(linha[mapa.usuarioId - 1]) === usuarioId &&
        (mapa.tipo === undefined || tipoEscopoAcesso(linha[mapa.tipo - 1]) === escopo.tipo) &&
        textoSeguro(linha[mapa.escopoId - 1]) === escopo.id;
    });
    if (existente >= 0) {
      linhasAtualizadas[existente][mapa.ativo - 1] = "SIM";
    } else {
      const nova = new Array(sheet.getLastColumn()).fill("");
      nova[mapa.id - 1] = Utilities.getUuid();
      nova[mapa.usuarioId - 1] = usuarioId;
      nova[mapa.tipo - 1] = escopo.tipo;
      nova[mapa.escopoId - 1] = escopo.id;
      nova[mapa.ativo - 1] = "SIM";
      linhasAtualizadas.push(nova);
    }
  });
  if (linhasAtualizadas.length) sheet.getRange(2, 1, linhasAtualizadas.length, sheet.getLastColumn()).setValues(linhasAtualizadas);
}

function adicionarAcessosUnidades(usuarioId, escopos) {
  const sheet = prepararTabelaAcessosUnidades();
  const mapa = indicesAcessosUnidades(sheet);
  const dados = DB.read(sheet);
  const linhasAtualizadas = dados.map(function(linha) { return linha.slice(); });
  normalizarEscoposAcesso(escopos).forEach(function(escopo) {
    const existente = dados.findIndex(function(linha) {
      return textoSeguro(linha[mapa.usuarioId - 1]) === usuarioId &&
        tipoEscopoAcesso(linha[mapa.tipo - 1]) === escopo.tipo &&
        textoSeguro(linha[mapa.escopoId - 1]) === escopo.id;
    });
    if (existente >= 0) {
      linhasAtualizadas[existente][mapa.ativo - 1] = "SIM";
    } else {
      const nova = new Array(sheet.getLastColumn()).fill("");
      nova[mapa.id - 1] = Utilities.getUuid();
      nova[mapa.usuarioId - 1] = usuarioId;
      nova[mapa.tipo - 1] = escopo.tipo;
      nova[mapa.escopoId - 1] = escopo.id;
      nova[mapa.ativo - 1] = "SIM";
      linhasAtualizadas.push(nova);
    }
  });
  if (linhasAtualizadas.length) sheet.getRange(2, 1, linhasAtualizadas.length, sheet.getLastColumn()).setValues(linhasAtualizadas);
}

function processarSolicitacaoAPI(id, novoStatus) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;
  try {
    lock.waitLock(30000);
    bloqueado = true;
    const auth = new AuthService();
    auth.exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    const status = String(novoStatus || "").trim().toUpperCase();
    if (!["APROVADO", "REJEITADO"].includes(status)) throw new Error("Status inválido.");

    const sheetSolic = DB.solicitacoesAcesso();
    const solicitacao = localizarSolicitacaoAPI(sheetSolic, id);
    if (!solicitacao) throw new Error("Solicitação não encontrada.");
    if (solicitacao.status !== "PENDENTE") throw new Error("Esta solicitação já foi processada.");
    if (solicitacao.nivel && solicitacao.nivel !== 1 && solicitacao.nivel !== 2) throw new Error("Nível solicitado inválido.");
    if (solicitacao.nivel === 2 && solicitacao.escopos.length > 0) {
      throw new Error("Solicitação de Gestor do Sistema não deve possuir escopos adicionais.");
    }
    if (!emailValidoAPI(solicitacao.email) ||
        !AuthService.emailPermitidoNoPrivado(solicitacao.email)) {
      throw new Error("A solicitação não possui um e-mail institucional ou de teste permitido.");
    }

    if (status === "APROVADO") {
      if (solicitacao.escopos.length) {
        solicitacao.escopos = validarEscoposAcesso(solicitacao.escopos);
      }
      const sheetUsuarios = DB.usuarios();
      const mapaU = DB.map(sheetUsuarios);
      const headersU = DB.headers(sheetUsuarios);
      const dadosU = DB.read(sheetUsuarios);
      const indice = dadosU.findIndex(function(linha) {
        return normalizarEmail(linha[mapaU.EMAIL - 1]) === solicitacao.email;
      });
      const nivelAnterior = indice >= 0 ? Number(dadosU[indice][mapaU.NIVEL - 1]) : 0;
      const nivelFinal = solicitacao.nivel || nivelAnterior;
      if (nivelFinal !== CONFIG.NIVEIS.GESTOR_CONTEUDO && nivelFinal !== CONFIG.NIVEIS.GESTOR_SISTEMA) {
        throw new Error("A solicitação não define um nível de acesso válido.");
      }
      if (indice < 0 && nivelFinal === CONFIG.NIVEIS.GESTOR_CONTEUDO && solicitacao.escopos.length === 0) {
        throw new Error("Novo Gestor de Conteúdo deve possuir ao menos uma localidade.");
      }
      let usuarioId = indice >= 0
        ? textoSeguro(dadosU[indice][mapaU.ID - 1])
        : Utilities.getUuid();
      if (!usuarioId) usuarioId = Utilities.getUuid();

      const nova = new Array(headersU.length).fill("");
      nova[mapaU.ID - 1] = usuarioId;
      nova[mapaU.NOME - 1] = solicitacao.nome;
      nova[mapaU.EMAIL - 1] = solicitacao.email;
      nova[mapaU.NIVEL - 1] = nivelFinal;
      nova[mapaU.ATIVO - 1] = "SIM";
      if (indice >= 0) sheetUsuarios.getRange(indice + 2, 1, 1, nova.length).setValues([nova]);
      else sheetUsuarios.appendRow(nova);

      if (indice >= 0 && nivelAnterior === CONFIG.NIVEIS.GESTOR_CONTEUDO &&
          nivelFinal === CONFIG.NIVEIS.GESTOR_CONTEUDO) {
        adicionarAcessosUnidades(usuarioId, solicitacao.escopos);
      } else {
        substituirAcessosUnidades(
          usuarioId,
          nivelFinal === CONFIG.NIVEIS.GESTOR_CONTEUDO ? solicitacao.escopos : []
        );
      }
    }

    const indices = indicesSolicitacao(
      sheetSolic.getRange(1, 1, 1, sheetSolic.getLastColumn()).getDisplayValues()[0]
    );
    sheetSolic.getRange(solicitacao.linha, indices.STATUS + 1).setValue(status);
    if (indices.APROVADOR !== undefined) {
      sheetSolic.getRange(solicitacao.linha, indices.APROVADOR + 1)
        .setValue(auth.usuarioAtual().email);
    }
    if (indices.DATA_APROVACAO !== undefined) {
      sheetSolic.getRange(solicitacao.linha, indices.DATA_APROVACAO + 1)
        .setValue(new Date());
    }
    SpreadsheetApp.flush();
    registrarInfoAPI("PROCESSAR_SOLICITACAO", solicitacao.email + " -> " + status);
    return respostaSucesso({ id: solicitacao.id, status: status });
  } catch (erro) {
    registrarErroAPI("PROCESSAR_SOLICITACAO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) lock.releaseLock();
  }
}

function aprovarSolicitacao(id) {
  return processarSolicitacaoAPI(id, "APROVADO");
}

function rejeitarSolicitacao(id) {
  return processarSolicitacaoAPI(id, "REJEITADO");
}

/**
 * ==========================================================
 * HISTÓRICO GERAL
 * ==========================================================
 */

function listarHistoricoGeral(authDados) {
  try {
    const authHistorico = new AuthService();
    authHistorico.exigirPermissao(CONFIG.PERMISSOES.HISTORICO);
    const usuarioHistPerm = authHistorico.usuarioAtual();

    const service =
      new HistoryService();

    const registros =
      service.listarTodos() || [];

    function objetoPreenchido(obj) {
      return !!(
        obj &&
        typeof obj === "object" &&
        !Array.isArray(obj) &&
        Object.keys(obj).length
      );
    }

    function parseHistorico(valor) {
      if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
      ) {
        return {};
      }

      if (
        typeof valor === "object"
      ) {
        return valor;
      }

      try {
        const obj =
          JSON.parse(String(valor));

        return obj &&
          typeof obj === "object"
          ? obj
          : {};
      } catch (erro) {
        return {};
      }
    }

    function ehEmail(valor) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
          String(valor || "").trim()
        );
    }

    function extrairUsuario(
      item,
      usuarioJson
    ) {
      const usuario =
        String(item.usuario || "").trim();

      if (
        usuario &&
        ehEmail(usuario)
      ) {
        return usuario;
      }

      const acao =
        String(item.acao || "").trim();

      if (ehEmail(acao)) {
        return acao;
      }

      if (
        usuarioJson &&
        typeof usuarioJson === "object"
      ) {
        const interno =
          usuarioJson.usuario ||
          usuarioJson.USUARIO ||
          usuarioJson.email ||
          usuarioJson.EMAIL ||
          "";

        if (ehEmail(interno)) {
          return String(interno).trim();
        }
      }

      return usuario || "-";
    }

    function normalizarAcao(
      acao,
      antes,
      depois,
      usuarioJson
    ) {
      const valor =
        String(acao || "")
          .trim()
          .toUpperCase();

      if (
        valor === "CRIACAO" ||
        valor === "CRIAÇÃO"
      ) {
        return "Criação";
      }

      if (
        valor === "EDICAO" ||
        valor === "EDIÇÃO"
      ) {
        return "Edição";
      }

      if (
        valor === "EXCLUSAO" ||
        valor === "EXCLUSÃO"
      ) {
        return "Exclusão";
      }

      /*
       * Compatibilidade com registros antigos
       * em que ACAO pode conter um e-mail.
       */
      if (
        ehEmail(valor) ||
        objetoPreenchido(usuarioJson)
      ) {
        if (
          !objetoPreenchido(antes) &&
          objetoPreenchido(depois)
        ) {
          return "Criação";
        }

        if (
          objetoPreenchido(antes) &&
          !objetoPreenchido(depois)
        ) {
          return "Exclusão";
        }

        if (
          objetoPreenchido(antes) &&
          objetoPreenchido(depois)
        ) {
          return "Edição";
        }

        if (
          !objetoPreenchido(antes) &&
          !objetoPreenchido(depois) &&
          objetoPreenchido(usuarioJson)
        ) {
          return "Criação";
        }
      }

      return String(acao || "-");
    }

    function extrairSnapshot(
      antes,
      depois,
      usuarioJson,
      acao
    ) {
      const acaoNormalizada =
        String(acao || "")
          .trim()
          .toUpperCase();

      /*
       * Para exclusão, o estado relevante é ANTES.
       */
      if (
        acaoNormalizada === "EXCLUSAO" ||
        acaoNormalizada === "EXCLUSÃO"
      ) {
        if (objetoPreenchido(antes)) {
          return antes;
        }

        return
          objetoPreenchido(usuarioJson)
            ? usuarioJson
            : {};
      }

      /*
       * Para criação/edição, preferimos DEPOIS.
       */
      if (objetoPreenchido(depois)) {
        return depois;
      }

      if (objetoPreenchido(antes)) {
        return antes;
      }

      if (objetoPreenchido(usuarioJson)) {
        return usuarioJson;
      }

      return {};
    }

    function campo(obj, ...nomes) {
      if (
        !obj ||
        typeof obj !== "object"
      ) {
        return "";
      }

      for (const nome of nomes) {
        if (
          Object.prototype.hasOwnProperty.call(
            obj,
            nome
          )
        ) {
          return obj[nome];
        }
      }

      return "";
    }

    function formatarContato(obj) {
      if (!objetoPreenchido(obj)) {
        return "-";
      }

      const campos = [];

      const microrregiao =
        campo(
          obj,
          "microrregiao",
          "MICRORREGIAO"
        );

      const comarca =
        campo(
          obj,
          "comarca",
          "COMARCA"
        );

      const setor =
        campo(
          obj,
          "setor",
          "SETOR"
        );

      const tipo =
        campo(
          obj,
          "tipo",
          "TIPO"
        );

      const numero =
        campo(
          obj,
          "numero",
          "NUMERO",
          "telefone",
          "TELEFONE"
        );

      const ramal =
        campo(
          obj,
          "ramal",
          "RAMAL"
        );

      const whatsapp =
        campo(
          obj,
          "whatsapp",
          "WHATSAPP"
        );

      const email =
        campo(
          obj,
          "email",
          "EMAIL",
          "E_MAIL"
        );

      const endereco =
        campo(
          obj,
          "endereco",
          "ENDERECO"
        );

      const status =
        campo(
          obj,
          "status",
          "STATUS"
        );

      const observacao =
        campo(
          obj,
          "observacao",
          "OBSERVACAO"
        );

      if (microrregiao) {
        campos.push(
          "Microrregião: " +
          microrregiao
        );
      }

      if (comarca) {
        campos.push(
          "Comarca: " +
          comarca
        );
      }

      if (setor) {
        campos.push(
          "Setor: " +
          setor
        );
      }

      if (tipo) {
        campos.push(
          "Tipo: " +
          tipo
        );
      }

      if (numero) {
        campos.push(
          "Telefone: " +
          numero
        );
      }

      if (ramal) {
        campos.push(
          "Ramal: " +
          ramal
        );
      }

      if (whatsapp) {
        campos.push(
          "WhatsApp: " +
          whatsapp
        );
      }

      if (email) {
        campos.push(
          "E-mail: " +
          email
        );
      }

      if (endereco) {
        campos.push(
          "Endereço: " +
          endereco
        );
      }

      if (status) {
        campos.push(
          "Status: " +
          status
        );
      }

      if (observacao) {
        campos.push(
          "Obs: " +
          observacao
        );
      }

      return campos.join(" | ") || "-";
    }

    const resultado =
      registros.map(item => {
        const antes =
          parseHistorico(item.antes);

        const depois =
          parseHistorico(item.depois);

        const usuarioJson =
          parseHistorico(item.usuario);

        const acao =
          normalizarAcao(
            item.acao,
            antes,
            depois,
            usuarioJson
          );

        const snapshot =
          extrairSnapshot(
            antes,
            depois,
            usuarioJson,
            item.acao
          );

        const comarca =
          campo(
            snapshot,
            "comarca",
            "COMARCA"
          );

        const setor =
          campo(
            snapshot,
            "setor",
            "SETOR"
          );

        const unidadeId =
          campo(
            snapshot,
            "unidadeId",
            "UNIDADE_ID"
          );

        const usuario =
          extrairUsuario(
            item,
            usuarioJson
          );

        let dataFormatada = "-";

        if (item.data) {
          const data =
            item.data instanceof Date
              ? item.data
              : new Date(item.data);

          if (
            !isNaN(data.getTime())
          ) {
            dataFormatada =
              Utilities.formatDate(
                data,
                Session.getScriptTimeZone(),
                "dd/MM/yyyy HH:mm:ss"
              );
          }
        }

        return {
          id: item.id || "",
          telefoneId:
            item.telefoneId ||
            item.telefone_id ||
            "",

          comarca:
            String(comarca || "").trim(),

          setor:
            String(setor || "").trim(),

          unidadeId:
            textoSeguro(unidadeId),

          data:
            dataFormatada,

          acao:
            acao,

          usuario:
            usuario || "-",

          antes:
            formatarContato(antes),

          depois:
            formatarContato(
              objetoPreenchido(depois)
                ? depois
                : snapshot
            )
        };
      });

    if (usuarioHistPerm.perfil === CONFIG.PERFIS.GESTOR_SISTEMA) {
      return respostaSucesso(resultado);
    }

    const permitidas = new Set(usuarioHistPerm.unidadeIds || []);
    return respostaSucesso(resultado.filter(function(item) {
      return permitidas.has(textoSeguro(item.unidadeId || item.UNIDADE_ID));
    }));

  } catch (erro) {
    registrarErroAPI(
      "LISTAR_HISTORICO_GERAL",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * ==========================================================
 * E-MAILS
 * ==========================================================
 */

function emailValidoAPI(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      normalizarEmail(email)
    );
}

function registrarLog(acao) {
  try {
    registrarInfoAPI(
      textoSeguro(acao),
      ""
    );

    return true;
  } catch (erro) {
    return false;
  }
}

function registrarInfoAPI(
  acao,
  mensagem
) {
  try {
    LOG.info(
      textoSeguro(acao),
      String(mensagem || "")
    );
  } catch (erro) {
    console.warn(
      "Falha ao registrar log informativo:",
      erro
    );
  }
}

function registrarErroAPI(
  acao,
  erro
) {
  try {
    const mensagem =
      erro && erro.message
        ? erro.message
        : String(
            erro ||
            "Erro desconhecido."
          );

    LOG.error(
      textoSeguro(acao),
      mensagem
    );
  } catch (erroLog) {
    console.warn(
      "Falha ao registrar log de erro:",
      erroLog
    );
  }
}

/**
 * ==========================================================
 * AUXILIARES
 * ==========================================================
 */

/**
 * ==========================================================
 * NOTIFICACOES
 * ==========================================================
 */

const NOTIFICACAO_TIPOS = [
  "LOGIN",
  "SOLICITACAO_PERFIL",
  "SOLICITACAO_COMARCA",
  "SOLICITACAO_APROVADA",
  "SOLICITACAO_REJEITADA",
  "CANCELAMENTO"
];

function indicesNotificacao(linhaCabecalho) {
  const alvos = {
    ID: ["ID"],
    DESTINATARIO: ["DESTINATARIOEMAIL", "DESTINATARIO", "EMAIL"],
    TIPO: ["TIPO"],
    MENSAGEM: ["MENSAGEM"],
    LIDA: ["LIDA"],
    DATA: ["DATA"],
    REFERENCIA: ["REFERENCIAID", "REFERENCIA"]
  };
  const indices = {};
  (Array.isArray(linhaCabecalho) ? linhaCabecalho : []).forEach((cabecalho, i) => {
    const chave = normalizarChave(cabecalho);
    Object.keys(alvos).forEach(grupo => {
      if (
        indices[grupo] === undefined &&
        alvos[grupo].some(nome => normalizarChave(nome) === chave)
      ) {
        indices[grupo] = i;
      }
    });
  });
  return indices;
}

function montarLinhaNotificacao(indices, campos) {
  const largura =
    Object.keys(indices).reduce(
      (maximo, grupo) => Math.max(maximo, indices[grupo] + 1),
      0
    );
  const linha = new Array(largura).fill("");
  Object.keys(campos).forEach(grupo => {
    if (indices[grupo] !== undefined) {
      linha[indices[grupo]] = campos[grupo];
    }
  });
  return linha;
}

function obterAbaNotificacoesAPI() {
  const ss = obterPlanilhaAPI();
  let sheet = ss.getSheetByName(CONFIG.SHEETS.NOTIFICACOES);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.NOTIFICACOES);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID",
      "DestinatarioEmail",
      "Tipo",
      "Mensagem",
      "Lida",
      "Data",
      "ReferenciaID"
    ]);
  }
  return sheet;
}

function obterEmailsGestoresSistema() {
  AuthService.exigirContextoPrivado();
  const lista = [];
  try {
    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const idxEmail = mapa.EMAIL;
    const idxNivel = mapa.NIVEL;
    const idxAtivo = mapa.ATIVO;
    if (idxEmail === undefined || idxNivel === undefined || idxAtivo === undefined) {
      const fallback = obterConfiguracaoAPI("EMAIL_GESTOR");
      if (fallback && emailValidoAPI(fallback)) {
        lista.push(normalizarEmail(fallback));
      }
      return lista;
    }
    DB.read(sheet).forEach(linha => {
      const nivel = Number(linha[idxNivel - 1]);
      const ativo = paraBoolean(linha[idxAtivo - 1]);
      const email = normalizarEmail(linha[idxEmail - 1]);
      if (
        nivel === CONFIG.NIVEIS.GESTOR_SISTEMA &&
        ativo &&
        emailValidoAPI(email)
      ) {
        lista.push(email);
      }
    });
  } catch (erro) {
    registrarInfoAPI(
      "OBTER_GESTORES_SISTEMA",
      "Falha ao listar gestores: " + (erro.message || erro)
    );
  }
  if (lista.length === 0) {
    try {
      const fallback = obterConfiguracaoAPI("EMAIL_GESTOR");
      if (fallback && emailValidoAPI(fallback)) {
        lista.push(normalizarEmail(fallback));
      }
    } catch (erro) {}
  }
  const unicos = {};
  const dedup = [];
  lista.forEach(email => {
    const norm = normalizarEmail(email);
    if (!unicos[norm]) {
      unicos[norm] = true;
      dedup.push(norm);
    }
  });
  return dedup;
}

function criarNotificacao(destinatarioEmail, tipo, mensagem, referencia) {
  const lock = LockService.getScriptLock();
  let precisaLiberar = false;
  try {
    new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    if (!lock.hasLock()) {
      lock.waitLock(30000);
      precisaLiberar = true;
    }
    const destinatario = normalizarEmail(destinatarioEmail);
    if (!emailValidoAPI(destinatario)) {
      throw new Error("E-mail destinat\u00e1rio inv\u00e1lido para notifica\u00e7\u00e3o.");
    }
    const tipoNorm = String(tipo || "").trim().toUpperCase();
    if (NOTIFICACAO_TIPOS.indexOf(tipoNorm) === -1) {
      throw new Error("Tipo de notifica\u00e7\u00e3o inv\u00e1lido: " + tipoNorm);
    }
    const mensagemNorm = String(mensagem || "").trim();
    if (!mensagemNorm) {
      throw new Error("Mensagem da notifica\u00e7\u00e3o \u00e9 obrigat\u00f3ria.");
    }
    const mensagemLimitada = mensagemNorm.length > 2000 ? mensagemNorm.slice(0, 2000) : mensagemNorm;
    const referenciaNorm = textoSeguro(referencia);
    const sheet = obterAbaNotificacoesAPI();
    const dadosCab = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0] || [];
    const indices = indicesNotificacao(dadosCab);
    if (
      indices.ID === undefined ||
      indices.DESTINATARIO === undefined ||
      indices.TIPO === undefined ||
      indices.MENSAGEM === undefined ||
      indices.LIDA === undefined ||
      indices.DATA === undefined ||
      indices.REFERENCIA === undefined
    ) {
      const id = Utilities.getUuid();
      sheet.appendRow([
        id,
        destinatario,
        tipoNorm,
        mensagemLimitada,
        "N",
        new Date(),
        referenciaNorm
      ]);
      return id;
    }
    const id = Utilities.getUuid();
    const linha = montarLinhaNotificacao(indices, {
      ID: id,
      DESTINATARIO: destinatario,
      TIPO: tipoNorm,
      MENSAGEM: mensagemLimitada,
      LIDA: "N",
      DATA: new Date(),
      REFERENCIA: referenciaNorm
    });
    sheet.appendRow(linha);
    return id;
  } finally {
    if (precisaLiberar) {
      try { lock.releaseLock(); } catch (e) {}
    }
  }
}

function listarNotificacoes(email) {
  try {
    AuthService.exigirContextoPrivado();
    let emailAlvo = normalizarEmail(email);
    const usuario = new AuthService().usuarioAtual();
    if (!usuario.logado || !usuario.ativo) {
      throw new Error("É necessário acesso administrativo ativo.");
    }
    if (!emailAlvo) {
      emailAlvo = normalizarEmail(usuario.email || obterEmailSessaoAPI() || "");
    }
    if (!emailAlvo) {
      throw new Error("E-mail n\u00e3o informado para listar notifica\u00e7\u00f5es.");
    }
    const ehProprio = usuario && normalizarEmail(usuario.email) === emailAlvo;
    const ehGestorSistema = usuario && usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA;
    if (!ehProprio && !ehGestorSistema) {
      emailAlvo = normalizarEmail(usuario.email || "");
      if (!emailAlvo) throw new Error("Sem permiss\u00e3o para listar notifica\u00e7\u00f5es de outro usu\u00e1rio.");
    }
    const sheet = obterAbaNotificacoesAPI();
    if (sheet.getLastRow() <= 1) {
      return respostaSucesso([]);
    }
    const dados = sheet.getDataRange().getValues();
    const indices = indicesNotificacao(dados[0] || []);
    if (
      indices.ID === undefined ||
      indices.DESTINATARIO === undefined
    ) {
      return respostaSucesso([]);
    }
    const lista = [];
    for (let i = 1; i < dados.length; i++) {
      const row = dados[i];
      const dest = indices.DESTINATARIO !== undefined ? normalizarEmail(row[indices.DESTINATARIO]) : "";
      if (dest !== emailAlvo) continue;
      lista.push({
        id: indices.ID !== undefined ? textoSeguro(row[indices.ID]) : "",
        destinatarioEmail: dest,
        tipo: indices.TIPO !== undefined ? textoSeguro(row[indices.TIPO]) : "",
        mensagem: indices.MENSAGEM !== undefined ? String(row[indices.MENSAGEM] || "") : "",
        lida: indices.LIDA !== undefined ? String(row[indices.LIDA] || "").trim().toUpperCase() === "S" : false,
        lidaRaw: indices.LIDA !== undefined ? String(row[indices.LIDA] || "").trim().toUpperCase() : "N",
        data: indices.DATA !== undefined ? row[indices.DATA] : null,
        referenciaID: indices.REFERENCIA !== undefined ? textoSeguro(row[indices.REFERENCIA]) : ""
      });
    }
    lista.sort((a, b) => {
      const da = a.data instanceof Date ? a.data.getTime() : new Date(a.data).getTime() || 0;
      const db = b.data instanceof Date ? b.data.getTime() : new Date(b.data).getTime() || 0;
      return db - da;
    });
    const serializado = lista.map(item => ({
      id: item.id,
      destinatarioEmail: item.destinatarioEmail,
      tipo: item.tipo,
      mensagem: item.mensagem,
      lida: item.lida,
      data: item.data instanceof Date ? item.data.toISOString() : (item.data ? String(item.data) : ""),
      referenciaID: item.referenciaID
    }));
    return respostaSucesso(serializado);
  } catch (erro) {
    registrarErroAPI("LISTAR_NOTIFICACOES", erro);
    return respostaErro(erro);
  }
}

function marcarNotificacaoLida(id) {
  const lock = LockService.getScriptLock();
  let precisaLiberar = false;
  try {
    AuthService.exigirContextoPrivado();
    if (!lock.hasLock()) {
      lock.waitLock(30000);
      precisaLiberar = true;
    }
    const idBusca = textoSeguro(id);
    if (!idBusca) throw new Error("ID da notifica\u00e7\u00e3o \u00e9 obrigat\u00f3rio.");
    const usuario = new AuthService().usuarioAtual();
    if (!usuario.logado || !usuario.ativo) {
      throw new Error("É necessário acesso administrativo ativo.");
    }
    const emailSessao = normalizarEmail(usuario.email || obterEmailSessaoAPI() || "");
    if (!emailSessao) throw new Error("\u00c9 necess\u00e1rio estar autenticado.");
    const sheet = obterAbaNotificacoesAPI();
    if (sheet.getLastRow() <= 1) throw new Error("Nenhuma notifica\u00e7\u00e3o encontrada.");
    const dados = sheet.getDataRange().getValues();
    const indices = indicesNotificacao(dados[0] || []);
    if (indices.ID === undefined || indices.DESTINATARIO === undefined || indices.LIDA === undefined) {
      throw new Error("Aba NOTIFICACOES sem cabe\u00e7alhos esperados.");
    }
    for (let i = 1; i < dados.length; i++) {
      if (textoSeguro(dados[i][indices.ID]) === idBusca) {
        const dest = normalizarEmail(dados[i][indices.DESTINATARIO]);
        const ehDono = dest === emailSessao;
        const ehGestor = usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA;
        if (!ehDono && !ehGestor) {
          throw new Error("Sem permiss\u00e3o para marcar esta notifica\u00e7\u00e3o.");
        }
        sheet.getRange(i + 1, indices.LIDA + 1).setValue("S");
        SpreadsheetApp.flush();
        return respostaSucesso(true);
      }
    }
    throw new Error("Notifica\u00e7\u00e3o n\u00e3o encontrada.");
  } catch (erro) {
    registrarErroAPI("MARCAR_NOTIFICACAO_LIDA", erro);
    return respostaErro(erro);
  } finally {
    if (precisaLiberar) { try { lock.releaseLock(); } catch(e){} }
  }
}

function marcarTodasLidas(email, authDados) {
  const lock = LockService.getScriptLock();
  let precisaLiberar = false;
  try {
    AuthService.exigirContextoPrivado();
    if (!lock.hasLock()) {
      lock.waitLock(30000);
      precisaLiberar = true;
    }
    let emailAlvo = normalizarEmail(email);
    let usuario = new AuthService().usuarioAtual();
    if (!usuario.logado || !usuario.ativo) {
      throw new Error("É necessário acesso administrativo ativo.");
    }
    let emailSessao = normalizarEmail(usuario.email || "");
    if (!emailAlvo) emailAlvo = normalizarEmail(usuario.email || obterEmailSessaoAPI() || emailSessao || "");
    if (!emailAlvo) throw new Error("E-mail n\u00e3o informado.");
    const ehProprio = normalizarEmail(usuario.email) === emailAlvo;
    const ehGestor = usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA;
    if (!ehProprio && !ehGestor) {
      throw new Error("Sem permissão para alterar notificações de outro usuário.");
    }
    const sheet = obterAbaNotificacoesAPI();
    if (sheet.getLastRow() <= 1) return respostaSucesso({ alteradas: 0 });
    const dados = sheet.getDataRange().getValues();
    const indices = indicesNotificacao(dados[0] || []);
    if (indices.DESTINATARIO === undefined || indices.LIDA === undefined) {
      throw new Error("Aba NOTIFICACOES sem cabe\u00e7alhos esperados.");
    }
    let alteradas = 0;
    for (let i = 1; i < dados.length; i++) {
      const dest = normalizarEmail(dados[i][indices.DESTINATARIO]);
      const lida = String(dados[i][indices.LIDA] || "").trim().toUpperCase();
      if (dest === emailAlvo && lida !== "S") {
        sheet.getRange(i + 1, indices.LIDA + 1).setValue("S");
        alteradas++;
      }
    }
    if (alteradas > 0) SpreadsheetApp.flush();
    return respostaSucesso({ alteradas: alteradas });
  } catch (erro) {
    registrarErroAPI("MARCAR_TODAS_LIDAS", erro);
    return respostaErro(erro);
  } finally {
    if (precisaLiberar) { try { lock.releaseLock(); } catch(e){} }
  }
}

function contarNaoLidas(email, authDados) {
  try {
    AuthService.exigirContextoPrivado();
    let emailAlvo = normalizarEmail(email);
    let usuario = new AuthService().usuarioAtual();
    if (!usuario.logado || !usuario.ativo) {
      throw new Error("É necessário acesso administrativo ativo.");
    }
    let emailSessao = normalizarEmail(usuario.email || "");
    if (!emailAlvo) emailAlvo = normalizarEmail(usuario.email || obterEmailSessaoAPI() || emailSessao || "");
    if (!emailAlvo) return respostaSucesso({ total: 0, count: 0 });
    const ehProprio = normalizarEmail(usuario.email) === emailAlvo;
    const ehGestor = usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA;
    if (!ehProprio && !ehGestor) {
      throw new Error("Sem permissão para consultar notificações de outro usuário.");
    }
    const sheet = obterAbaNotificacoesAPI();
    if (sheet.getLastRow() <= 1) return respostaSucesso({ total: 0, count: 0 });
    const dados = sheet.getDataRange().getValues();
    const indices = indicesNotificacao(dados[0] || []);
    if (indices.DESTINATARIO === undefined || indices.LIDA === undefined) {
      return respostaSucesso({ total: 0, count: 0 });
    }
    let total = 0;
    for (let i = 1; i < dados.length; i++) {
      const dest = normalizarEmail(dados[i][indices.DESTINATARIO]);
      const lida = String(dados[i][indices.LIDA] || "").trim().toUpperCase();
      if (dest === emailAlvo && lida !== "S") total++;
    }
    return respostaSucesso({ total: total, count: total });
  } catch (erro) {
    registrarErroAPI("CONTAR_NAO_LIDAS", erro);
    return respostaErro(erro);
  }
}

function notificarGestoresSistemaSobreSolicitacao(tipo, mensagem, referenciaID) {
  try {
    const gestores = obterEmailsGestoresSistema();
    let count = 0;
    gestores.forEach(emailG => {
      try {
        criarNotificacao(emailG, tipo, mensagem, referenciaID);
        count++;
      } catch (e) {}
    });
    return count;
  } catch (e) {
    registrarErroAPI("NOTIFICAR_GESTORES", e);
    return 0;
  }
}

function notificarUsuarioSobreDecisao(emailUsuario, aprovado, perfil, referenciaID) {
  try {
    const tipo = aprovado ? "SOLICITACAO_APROVADA" : "SOLICITACAO_REJEITADA";
    const msg = aprovado
      ? "Sua solicita\u00e7\u00e3o de acesso como " + perfil + " foi aprovada. Voc\u00ea j\u00e1 pode acessar o sistema."
      : "Sua solicita\u00e7\u00e3o de acesso como " + perfil + " foi rejeitada. Entre em contato com o Gestor do Sistema para mais detalhes.";
    return criarNotificacao(emailUsuario, tipo, msg, referenciaID);
  } catch (e) {
    registrarErroAPI("NOTIFICAR_DECISAO_USUARIO", e);
    return null;
  }
}


function obterPlanilhaAPI() {
  return DB.getSpreadsheet();
}

function obterEmailSessaoAPI() {
  if (!AuthService.ehContextoPrivado()) return "";
  try {
    const usuario =
      new AuthService()
        .usuarioAtual();

    if (
      usuario &&
      usuario.email
    ) {
      return usuario.email;
    }
  } catch (erro) {}

  return AuthService.obterEmailAtivo();
}

function obterConfiguracaoAPI(chave) {
  try {
    AuthService.exigirContextoPrivado();
    const sheet =
      obterPlanilhaAPI()
        .getSheetByName(
          CONFIG.SHEETS.CONFIGURACAO
        );

    if (!sheet) {
      return null;
    }

    const chaveBusca =
      normalizarChave(chave);

    const dados =
      sheet.getDataRange()
        .getValues();

    for (
      let i = 0;
      i < dados.length;
      i++
    ) {
      const chaveLinha =
        normalizarChave(
          dados[i][0]
        );

      if (
        chaveLinha ===
        chaveBusca
      ) {
        const valor =
          dados[i][1];

        if (
          valor === null ||
          valor === undefined ||
          String(valor).trim() === ""
        ) {
          return null;
        }

        return String(valor).trim();
      }
    }

    return null;
  } catch (erro) {
    registrarErroAPI(
      "OBTER_CONFIGURACAO",
      erro
    );

    return null;
  }
}

/**
 * ==========================================================
 * GESTÃO DE USUÁRIOS (somente GESTOR_SISTEMA)
 * ==========================================================
 */

function listarUsuarios() {
  try {
    new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const catalogo = montarCatalogoEscoposAcesso();
    const acessosPorUsuario = {};
    lerTodosAcessosAtivos().forEach(function(acesso) {
      if (!acessosPorUsuario[acesso.usuarioId]) acessosPorUsuario[acesso.usuarioId] = [];
      acessosPorUsuario[acesso.usuarioId].push({ tipo: acesso.tipo, id: acesso.id });
    });
    const resultado = DB.read(sheet).map(function(linha) {
      const nivel = Number(linha[mapa.NIVEL - 1]);
      const id = textoSeguro(linha[mapa.ID - 1]);
      const escopo = nivel === CONFIG.NIVEIS.GESTOR_CONTEUDO
        ? resolverEscopoAcessos(acessosPorUsuario[id] || [], catalogo)
        : { ids: [], unidades: [], acessos: [] };
      return {
        id: id,
        email: normalizarEmail(linha[mapa.EMAIL - 1]),
        nome: textoSeguro(linha[mapa.NOME - 1]),
        nivel: nivel,
        perfil: CONFIG.NIVEIS.POR_NIVEL[String(nivel)] || "",
        ativo: paraBoolean(linha[mapa.ATIVO - 1]),
        unidadeIds: escopo.ids,
        unidades: escopo.unidades,
        escopos: escopo.acessos
      };
    });
    return respostaSucesso(resultado);
  } catch (erro) {
    registrarErroAPI("LISTAR_USUARIOS", erro);
    return respostaErro(erro);
  }
}

function removerMeuAcesso(tipo, id) {
  const tipoNormalizado = tipoEscopoAcesso(tipo);
  const idNormalizado = textoSeguro(id);
  if (!tipoNormalizado || !idNormalizado) {
    return respostaErro(new Error("Localidade de acesso inválida."));
  }

  const lock = LockService.getScriptLock();
  let bloqueado = false;
  try {
    lock.waitLock(30000);
    bloqueado = true;
    const auth = new AuthService();
    auth.exigirPerfil(CONFIG.PERFIS.GESTOR_CONTEUDO);
    const usuario = auth.usuarioAtual();
    const sheet = DB.acessosUnidades();
    const mapa = indicesAcessosUnidades(sheet);
    const dados = DB.read(sheet);
    const indice = dados.findIndex(function(linha) {
      return textoSeguro(linha[mapa.usuarioId - 1]) === textoSeguro(usuario.id) &&
        (mapa.tipo === undefined ? CONFIG.ACESSOS.UNIDADE : tipoEscopoAcesso(linha[mapa.tipo - 1])) === tipoNormalizado &&
        textoSeguro(linha[mapa.escopoId - 1]) === idNormalizado &&
        paraBoolean(linha[mapa.ativo - 1]);
    });

    if (indice >= 0) {
      sheet.getRange(indice + 2, mapa.ativo).setValue("NÃO");
      SpreadsheetApp.flush();
      registrarInfoAPI("REMOVER_PROPRIO_ACESSO", usuario.email + " -> " + tipoNormalizado + ":" + idNormalizado);
    }

    return respostaSucesso(auth.usuarioAtual());
  } catch (erro) {
    registrarErroAPI("REMOVER_PROPRIO_ACESSO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) lock.releaseLock();
  }
}

function validarIdsUnidadesAdministrativas(unidadeIds) {
  const ids = idsUnidadesSolicitadas(unidadeIds);
  const sheet = DB.unidadesOrganizacionais();
  const mapa = DB.map(sheet);
  const validas = new Set(DB.read(sheet)
    .filter(function(linha) {
      return (!mapa.ATIVO || paraBoolean(linha[mapa.ATIVO - 1])) &&
        (!mapa.SELECIONAVELACESSO || paraBoolean(linha[mapa.SELECIONAVELACESSO - 1]));
    })
    .map(function(linha) { return textoSeguro(linha[mapa.ID - 1]); }));
  if (ids.some(function(id) { return !validas.has(id); })) {
    throw new Error("Uma ou mais Unidades são inválidas ou inativas.");
  }
  return ids;
}

function contarGestoresSistemaAtivos(excetoEmail) {
  const sheet = DB.usuarios();
  const mapa = DB.map(sheet);
  return DB.read(sheet).filter(function(linha) {
    return normalizarEmail(linha[mapa.EMAIL - 1]) !== normalizarEmail(excetoEmail) &&
      Number(linha[mapa.NIVEL - 1]) === CONFIG.NIVEIS.GESTOR_SISTEMA &&
      paraBoolean(linha[mapa.ATIVO - 1]);
  }).length;
}

function atualizarUsuario(email, dados) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;
  try {
    lock.waitLock(30000);
    bloqueado = true;
    const auth = new AuthService();
    auth.exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);

    const emailAlvo = normalizarEmail(email);
    if (!emailAlvo) throw new Error("E-mail obrigatório.");
    if (auth.usuarioAtual().email === emailAlvo) {
      throw new Error("Você não pode editar a própria conta por este painel.");
    }

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const dadosSheet = DB.read(sheet);
    const indice = dadosSheet.findIndex(function(linha) {
      return normalizarEmail(linha[mapa.EMAIL - 1]) === emailAlvo;
    });
    if (indice < 0) throw new Error("Usuário não encontrado.");

    const entrada = ehObjeto(dados) ? dados : {};
    const nivelAtual = Number(dadosSheet[indice][mapa.NIVEL - 1]);
    const ativoAtual = paraBoolean(dadosSheet[indice][mapa.ATIVO - 1]);
    const nivel = possuiCampo(entrada, "nivel", "NIVEL", "perfil", "PERFIL")
      ? nivelSolicitadoNumero(valorObjeto(entrada, "nivel", "NIVEL", "perfil", "PERFIL"))
      : nivelAtual;
    const ativo = possuiCampo(entrada, "ativo", "ATIVO")
      ? paraBoolean(valorObjeto(entrada, "ativo", "ATIVO"))
      : ativoAtual;
    const nome = possuiCampo(entrada, "nome", "NOME")
      ? textoSeguro(valorObjeto(entrada, "nome", "NOME"))
      : textoSeguro(dadosSheet[indice][mapa.NOME - 1]);
    const escoposInformados = valorObjeto(entrada, "escopos", "ESCOPOS", "acessos", "ACESSOS", "escopoAcessos", "ESCOPO_ACESSOS", "unidadeIds", "UNIDADE_IDS", "unidades");
    const possuiEscopos = possuiCampo(entrada, "escopos", "ESCOPOS", "acessos", "ACESSOS", "escopoAcessos", "ESCOPO_ACESSOS", "unidadeIds", "UNIDADE_IDS", "unidades");
    const escoposAtuais = nivelAtual === CONFIG.NIVEIS.GESTOR_CONTEUDO
      ? auth.obterEscopoUnidades(textoSeguro(dadosSheet[indice][mapa.ID - 1])).acessos
      : [];
    const escopos = nivel === CONFIG.NIVEIS.GESTOR_CONTEUDO
      ? validarEscoposAcesso(possuiEscopos ? escoposInformados : escoposAtuais)
      : [];

    if (nivel !== 1 && nivel !== 2) throw new Error("Nível inválido. Use 1 ou 2.");
    if (!nome) throw new Error("Nome obrigatório.");
    if (nivel === 1 && escopos.length === 0) {
      throw new Error("Gestor de Conteúdo deve possuir ao menos um Município, Fórum ou Unidade.");
    }
    if (nivelAtual === 2 && ativoAtual && (nivel !== 2 || !ativo) &&
        contarGestoresSistemaAtivos(emailAlvo) === 0) {
      throw new Error("Não é possível remover o último Gestor do Sistema ativo.");
    }

    sheet.getRange(indice + 2, mapa.NOME).setValue(nome);
    sheet.getRange(indice + 2, mapa.NIVEL).setValue(nivel);
    sheet.getRange(indice + 2, mapa.ATIVO).setValue(ativo ? "SIM" : "NÃO");
    substituirAcessosUnidades(
      textoSeguro(dadosSheet[indice][mapa.ID - 1]),
      nivel === 1 && ativo ? escopos : []
    );
    SpreadsheetApp.flush();
    return respostaSucesso({
      email: emailAlvo,
      nome: nome,
      nivel: nivel,
      perfil: CONFIG.NIVEIS.POR_NIVEL[String(nivel)],
      ativo: ativo,
      escopos: escopos
    });
  } catch (erro) {
    registrarErroAPI("ATUALIZAR_USUARIO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) lock.releaseLock();
  }
}

function criarUsuario(dados) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;
  try {
    lock.waitLock(30000);
    bloqueado = true;
    const auth = new AuthService();
    auth.exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    const entrada = ehObjeto(dados) ? dados : {};
    const email = normalizarEmail(valorObjeto(entrada, "email", "EMAIL"));
    const nome = textoSeguro(valorObjeto(entrada, "nome", "NOME"));
    const nivel = nivelSolicitadoNumero(valorObjeto(entrada, "nivel", "NIVEL", "perfil", "PERFIL"));
    const ativo = possuiCampo(entrada, "ativo", "ATIVO")
      ? paraBoolean(valorObjeto(entrada, "ativo", "ATIVO"))
      : true;
    const escopos = nivel === 1
      ? validarEscoposAcesso(valorObjeto(entrada, "escopos", "ESCOPOS", "acessos", "ACESSOS", "escopoAcessos", "ESCOPO_ACESSOS", "unidadeIds", "UNIDADE_IDS", "unidades"))
      : [];

    if (!emailValidoAPI(email)) throw new Error("E-mail inválido.");
    if (!AuthService.emailPermitidoNoPrivado(email)) {
      throw new Error("Use e-mail institucional ou um e-mail de teste explicitamente permitido.");
    }
    if (!nome || nome.length > CONFIG.LIMITES.TAMANHO_MAXIMO_NOME) throw new Error("Nome inválido.");
    if (nivel !== 1 && nivel !== 2) throw new Error("Nível inválido. Use 1 ou 2.");
    if (nivel === 1 && escopos.length === 0) {
      throw new Error("Gestor de Conteúdo deve possuir ao menos um Município, Fórum ou Unidade.");
    }

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    if (DB.read(sheet).some(function(linha) {
      return normalizarEmail(linha[mapa.EMAIL - 1]) === email;
    })) throw new Error("Já existe um usuário com este e-mail.");

    const headers = DB.headers(sheet);
    const id = Utilities.getUuid();
    const nova = new Array(headers.length).fill("");
    nova[mapa.ID - 1] = id;
    nova[mapa.NOME - 1] = nome;
    nova[mapa.EMAIL - 1] = email;
    nova[mapa.NIVEL - 1] = nivel;
    nova[mapa.ATIVO - 1] = ativo ? "SIM" : "NÃO";
    sheet.appendRow(nova);
    substituirAcessosUnidades(id, nivel === 1 && ativo ? escopos : []);
    SpreadsheetApp.flush();

    return respostaSucesso({
      id: id,
      email: email,
      nome: nome,
      nivel: nivel,
      perfil: CONFIG.NIVEIS.POR_NIVEL[String(nivel)],
      ativo: ativo,
      escopos: escopos
    });
  } catch (erro) {
    registrarErroAPI("CRIAR_USUARIO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) lock.releaseLock();
  }
}

function excluirUsuario(email) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;
  try {
    lock.waitLock(30000);
    bloqueado = true;
    const auth = new AuthService();
    auth.exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    const emailAlvo = normalizarEmail(email);
    if (auth.usuarioAtual().email === emailAlvo) {
      throw new Error("Você não pode excluir a própria conta.");
    }

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const dados = DB.read(sheet);
    const indice = dados.findIndex(function(linha) {
      return normalizarEmail(linha[mapa.EMAIL - 1]) === emailAlvo;
    });
    if (indice < 0) throw new Error("Usuário não encontrado.");
    if (Number(dados[indice][mapa.NIVEL - 1]) === 2 &&
        paraBoolean(dados[indice][mapa.ATIVO - 1]) &&
        contarGestoresSistemaAtivos(emailAlvo) === 0) {
      throw new Error("Não é possível excluir o último Gestor do Sistema ativo.");
    }

    substituirAcessosUnidades(textoSeguro(dados[indice][mapa.ID - 1]), []);
    sheet.deleteRow(indice + 2);
    SpreadsheetApp.flush();
    return respostaSucesso({ email: emailAlvo });
  } catch (erro) {
    registrarErroAPI("EXCLUIR_USUARIO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) lock.releaseLock();
  }
}

function solicitarPermissaoComarca() {
  return respostaErro(new Error(
    "Solicitações por comarca foram descontinuadas. O escopo é administrado por Unidade."
  ));
}

function cancelarSolicitacaoComarca() {
  return respostaErro(new Error(
    "Solicitações por comarca foram descontinuadas. O escopo é administrado por Unidade."
  ));
}
