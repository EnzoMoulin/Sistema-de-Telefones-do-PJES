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
    return respostaSucesso(
      new AuthService().usuarioAtual()
    );
  } catch (erro) {
    registrarErroAPI(
      "OBTER_USUARIO",
      erro
    );

    return respostaErro(erro);
  }
}

function encerrarSessao(authDados) {
  try {
    AuthService.limparSessao(authDados);
    return respostaSucesso(true);
  } catch (erro) {
    registrarErroAPI(
      "LOGOUT",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * ==========================================================
 * SOLICITAÇÕES DE ACESSO
 * ==========================================================
 */

/**
 * Mapa de colunas da aba SOLICITACOES_ACESSO.
 *
 * Usa os cabeçalhos da planilha em vez de posições fixas,
 * tornando o código resiliente a reordenações e à coluna
 * COMARCA (presente em instalações novas e adicionada por
 * migração em instalações antigas).
 */
function indicesSolicitacao(linhaCabecalho) {
  const alvos = {
    ID: ["ID"],
    EMAIL: ["EMAIL"],
    NOME: ["NOME"],
    COMARCA: ["COMARCA"],
    UNIDADES: ["UNIDADE_ID", "UNIDADES_IDS", "UNIDADE_IDS"],
    PERFIL: ["PERFIL_SOLICITADO", "PERFIL", "NIVEL_SOLICITADO"],
    JUSTIFICATIVA: ["JUSTIFICATIVA"],
    STATUS: ["STATUS"],
    DATA: ["DATA_SOLICITACAO", "DATA"],
    APROVADOR: ["APROVADOR"],
    DATA_APROVACAO: ["DATA_APROVACAO"]
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

/**
 * Monta uma linha (array) para a aba SOLICITACOES_ACESSO
 * respeitando as colunas existentes na planilha.
 */
function montarLinhaSolicitacao(indices, campos) {
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

function listarSolicitacoes(authDados) {
  try {
    new AuthService(authDados).exigirPerfil(
      CONFIG.PERFIS.GESTOR_SISTEMA
    );

    const sheet =
      DB.solicitacoesAcesso();

    if (!sheet) {
      throw new Error(
        "Aba de solicitações de acesso não encontrada."
      );
    }

    const dados =
      sheet.getDataRange().getValues();

    if (dados.length <= 1) {
      return respostaSucesso([]);
    }

    const indices = indicesSolicitacao(dados[0]);
    const catalogoUnidades = catalogoUnidadesAcessoPorId();

    const result =
      dados
        .slice(1)
        .filter(row =>
          String(row[indices.STATUS] || "")
            .trim()
            .toUpperCase() === "PENDENTE"
        )
        .map(row => {
          const idsUnidades = indices.UNIDADES !== undefined
            ? parseIdsUnidadesSolicitacao(row[indices.UNIDADES])
            : [];
          return {
            id: row[indices.ID],
            email: row[indices.EMAIL],
            nome: row[indices.NOME],
            unidades: idsUnidades.map(function(id) { return catalogoUnidades[id]; }).filter(Boolean),
            unidadeIds: idsUnidades,
            perfilSolicitado: perfilSolicitadoPorValor(row[indices.PERFIL]),
            justificativa: row[indices.JUSTIFICATIVA],
            status: row[indices.STATUS],
            data: row[indices.DATA]
          };
        });

    return respostaSucesso(result);
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_SOLICITACOES",
      erro
    );

    return respostaErro(erro);
  }
}

function contarSolicitacoesPendentes(authDados) {
  try {
    new AuthService(authDados).exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    const sheet = DB.solicitacoesAcesso();
    if (!sheet) return respostaSucesso({ total: 0 });
    const dados = sheet.getDataRange().getValues();
    if (dados.length <= 1) return respostaSucesso({ total: 0 });
    const indices = indicesSolicitacao(dados[0]);
    const pendentes = dados.slice(1).filter(function(row){
      return String(row[indices.STATUS] || "").trim().toUpperCase() === "PENDENTE";
    });
    return respostaSucesso({ total: pendentes.length });
  } catch (erro) {
    registrarErroAPI("CONTAR_SOLICITACOES_PENDENTES", erro);
    return respostaErro(erro);
  }
}

/**
 * Solicitação de acesso (área administrativa).
 *
 * O solicitante precisa estar autenticado com conta
 * institucional. Justificativa e comarca são opcionais
 * para manter compatibilidade com chamadas antigas.
 */
function autenticarConsulta(dados) {
  let email = "";
  try {
    const entrada = ehObjeto(dados) ? dados : {};
    email = normalizarEmail(valorObjeto(entrada, "email", "EMAIL"));
    const senha = textoSeguro(valorObjeto(entrada, "senha", "SENHA", "password"));

    if (!emailValidoAPI(email) || !emailInstitucional(email)) {
      throw new Error("Informe um e-mail institucional válido.");
    }
    if (senha.length !== 20) {
      throw new Error("A senha deve ter exatamente 20 caracteres.");
    }
    AuthService.verificarLimiteLogin(email);

    const sheet = DB.usuarios();
    let mapa = DB.map(sheet);
    if (mapa.SENHA === undefined) {
      garantirColunaSenhaUsuarios(DB.getSpreadsheet(), sheet);
      mapa = DB.map(sheet);
    }

    if (mapa.EMAIL === undefined || mapa.SENHA === undefined || mapa.ATIVO === undefined) {
      throw new Error("A aba USUARIOS não possui os cabeçalhos EMAIL, SENHA e ATIVO.");
    }

    const linha = DB.read(sheet).find(function(item) {
      return normalizarEmail(item[mapa.EMAIL - 1]) === email;
    });

    if (!linha) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const senhaArmazenada = textoSeguro(linha[mapa.SENHA - 1]);
    if (!senhaArmazenada || !senhasIguaisConstante(senhaArmazenada, senha)) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const perfil = perfilUsuarioPorLinha(mapa, linha);
    const ehGestor = perfil === CONFIG.PERFIS.GESTOR_CONTEUDO || perfil === CONFIG.PERFIS.GESTOR_SISTEMA;
    if (!ehGestor) {
      throw new Error("Este e-mail não possui acesso administrativo.");
    }

    if (!paraBoolean(linha[mapa.ATIVO - 1])) {
      try {
        const sheetPendente = DB.solicitacoesAcesso();
        const dadosPendentes = sheetPendente.getDataRange().getValues();
        const indicesPendentes = indicesSolicitacao(dadosPendentes[0] || []);
        const temPendente = dadosPendentes.slice(1).some(function(item) {
          return indicesPendentes.EMAIL !== undefined &&
            indicesPendentes.STATUS !== undefined &&
            normalizarEmail(item[indicesPendentes.EMAIL]) === email &&
            String(item[indicesPendentes.STATUS] || "").trim().toUpperCase() === "PENDENTE";
        });
        if (temPendente) {
          throw new Error("Acesso em andamento. Quando sua conta for aprovada você conseguirá entrar.");
        }
      } catch (erroPendente) {
        if (String(erroPendente && erroPendente.message || "").indexOf("Acesso em andamento") !== -1) {
          throw erroPendente;
        }
      }
      throw new Error("Usuário inativo. Procure o Gestor do Sistema.");
    }

    const usuario = new AuthService().buscarUsuario(email);
    const sessao = AuthService.criarSessaoSenha(usuario);
    AuthService.limparFalhasLogin(email);
    const resposta = {
      id: usuario.id || "",
      email: usuario.email,
      nome: usuario.nome || email.split("@")[0],
      perfil: usuario.perfil,
      nivel: usuario.nivel || nivelPorPerfil(usuario.perfil),
      ativo: true,
      comarcas: usuario.comarcas || [],
      unidades: usuario.unidades || [],
      token: sessao.token,
      expiraEm: sessao.expiraEm
    };

    try {
      const gestoresLogin = obterEmailsGestoresSistema();
      const msgLogin = resposta.nome + " (" + email + ") fez login no sistema como " + resposta.perfil + ".";
      gestoresLogin.forEach(function(emailGestor) {
        try {
          if (normalizarEmail(emailGestor) !== email) criarNotificacao(emailGestor, "LOGIN", msgLogin, email);
        } catch (erroNotificacao) {}
      });
    } catch (erroLoginNotif) {
      try { registrarErroAPI("NOTIFICAR_LOGIN", erroLoginNotif); } catch (erroLog) {}
    }

    return respostaSucesso(resposta);
  } catch (erro) {
    if (String(erro && erro.message || "").indexOf("E-mail ou senha incorretos") !== -1) {
      try { AuthService.registrarFalhaLogin(email); } catch (erroLimite) {}
    }
    registrarErroAPI("AUTENTICAR_CONSULTA", erro);
    return respostaErro(erro);
  }
}

function perfilSolicitadoPorValor(valor) {
  const texto = String(valor === null || valor === undefined ? "" : valor).trim().toUpperCase();
  if (texto === "3" || texto === "3.0") return CONFIG.PERFIS.GESTOR_SISTEMA;
  if (texto === "2" || texto === "2.0") return CONFIG.PERFIS.GESTOR_CONTEUDO;
  return texto;
}

function parseIdsUnidadesSolicitacao(valor) {
  if (Array.isArray(valor)) {
    return Array.from(new Set(valor.map(textoSeguro).filter(Boolean)));
  }

  const texto = textoSeguro(valor);
  if (!texto) return [];

  if (texto.charAt(0) === "[") {
    try {
      const lista = JSON.parse(texto);
      if (Array.isArray(lista)) return parseIdsUnidadesSolicitacao(lista);
    } catch (erroJson) {}
  }

  return Array.from(new Set(texto.split(/[,;|\n]+/).map(textoSeguro).filter(Boolean)));
}

function serializarIdsUnidadesSolicitacao(ids) {
  return JSON.stringify(parseIdsUnidadesSolicitacao(ids));
}

function catalogoUnidadesAcessoPorId() {
  const resposta = listarUnidadesParaAcesso();
  if (!resposta || resposta.sucesso !== true || !Array.isArray(resposta.dados)) {
    throw new Error((resposta && resposta.erro) || "Não foi possível carregar as unidades disponíveis.");
  }
  const mapa = {};
  resposta.dados.forEach(function(unidade) { mapa[unidade.id] = unidade; });
  return mapa;
}

function validarUnidadesSolicitadas(ids, obrigatorio) {
  const unidades = parseIdsUnidadesSolicitacao(ids);
  if (obrigatorio && unidades.length === 0) {
    throw new Error("Selecione ao menos uma unidade.");
  }
  if (unidades.length > 203) {
    throw new Error("A quantidade de unidades selecionadas é inválida.");
  }

  const catalogo = catalogoUnidadesAcessoPorId();
  const invalidas = unidades.filter(function(id) { return !catalogo[id]; });
  if (invalidas.length) {
    throw new Error("Uma ou mais unidades selecionadas não existem ou estão inativas.");
  }
  return unidades;
}

function detalhesUnidadesSolicitadas(ids) {
  const catalogo = catalogoUnidadesAcessoPorId();
  return parseIdsUnidadesSolicitacao(ids).map(function(id) { return catalogo[id]; }).filter(Boolean);
}

/** Mantém exatamente os vínculos aprovados para o usuário. */
function sincronizarAcessosUnidadesUsuario(usuarioId, idsUnidades) {
  const idUsuario = textoSeguro(usuarioId);
  if (!idUsuario) throw new Error("O usuário aprovado não possui ID.");

  const ids = validarUnidadesSolicitadas(idsUnidades, false);
  const solicitadas = new Set(ids);
  const sheet = DB.acessosUnidades();
  const mapa = DB.map(sheet);
  const idxId = mapa.ID;
  const idxUsuario = mapa.USUARIOID;
  const idxUnidade = mapa.UNIDADEID;
  const idxAtivo = mapa.ATIVO;

  if ([idxId, idxUsuario, idxUnidade, idxAtivo].some(function(idx) { return idx === undefined; })) {
    throw new Error("A aba ACESSOS_UNIDADES não possui os cabeçalhos ID, USUARIO_ID, UNIDADE_ID e ATIVO.");
  }

  const dados = sheet.getDataRange().getValues();
  const existentes = new Set();
  for (let i = 1; i < dados.length; i++) {
    if (textoSeguro(dados[i][idxUsuario - 1]) !== idUsuario) continue;
    const unidadeId = textoSeguro(dados[i][idxUnidade - 1]);
    const deveAtivar = solicitadas.has(unidadeId) && !existentes.has(unidadeId);
    sheet.getRange(i + 1, idxAtivo).setValue(deveAtivar);
    if (deveAtivar) existentes.add(unidadeId);
  }

  const largura = DB.headers(sheet).length;
  ids.forEach(function(unidadeId) {
    if (existentes.has(unidadeId)) return;
    const linha = new Array(largura).fill("");
    linha[idxId - 1] = Utilities.getUuid();
    linha[idxUsuario - 1] = idUsuario;
    linha[idxUnidade - 1] = unidadeId;
    linha[idxAtivo - 1] = true;
    sheet.appendRow(linha);
  });

  return ids;
}

function solicitarAcesso(nome, perfil, justificativa, comarca, authDados) {
  const lock =
    LockService.getScriptLock();

  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const usuario =
      new AuthService(authDados).usuarioAtual();

    if (
      !usuario.logado ||
      !usuario.email
    ) {
      throw new Error(
        "É necessário estar autenticado."
      );
    }

    if (!emailInstitucional(usuario.email)) {
      throw new Error(
        "Somente contas institucionais podem solicitar acesso."
      );
    }

    if (
      usuario.perfil !==
      CONFIG.PERFIS.USUARIO_CONSULTA
    ) {
      throw new Error(
        "Esta conta já possui um perfil administrativo."
      );
    }

    const nomeNormalizado =
      textoSeguro(nome);

    if (nomeNormalizado.length < 3) {
      throw new Error(
        "Informe um nome válido."
      );
    }

    if (
      nomeNormalizado.length >
      CONFIG.LIMITES.TAMANHO_MAXIMO_NOME
    ) {
      throw new Error(
        "O nome informado é muito grande."
      );
    }

    const perfilSolicitado =
      String(perfil || "")
        .trim()
        .toUpperCase();

    if (
      perfilSolicitado !== CONFIG.PERFIS.GESTOR_CONTEUDO &&
      perfilSolicitado !== CONFIG.PERFIS.GESTOR_SISTEMA
    ) {
      throw new Error(
        "Perfil solicitado inválido."
      );
    }

    const justificativaNormalizada =
      textoSeguro(justificativa);

    if (
      justificativaNormalizada.length > 0 &&
      justificativaNormalizada.length < 10
    ) {
      throw new Error(
        "Descreva a justificativa (mínimo de 10 caracteres)."
      );
    }

    if (
      justificativaNormalizada.length >
      CONFIG.LIMITES.TAMANHO_MAXIMO_OBSERVACAO
    ) {
      throw new Error(
        "A justificativa é muito longa."
      );
    }

    const comarcaNormalizada =
      textoSeguro(comarca);

    const sheet =
      DB.solicitacoesAcesso();

    if (!sheet) {
      throw new Error(
        "Aba de solicitações de acesso não encontrada."
      );
    }

    const dados =
      sheet.getDataRange().getValues();

    const indices = indicesSolicitacao(dados[0] || []);

    const emailSolicitante =
      normalizarEmail(usuario.email);

    const existePendente =
      dados.slice(1).some(row => {
        const emailLinha =
          indices.EMAIL !== undefined
            ? normalizarEmail(row[indices.EMAIL])
            : normalizarEmail(row[1]);

        const statusLinha =
          indices.STATUS !== undefined
            ? String(row[indices.STATUS] || "").trim().toUpperCase()
            : String(row[5] || "").trim().toUpperCase();

        return (
          emailLinha === emailSolicitante &&
          statusLinha === "PENDENTE"
        );
      });

    if (existePendente) {
      throw new Error(
        "Já existe uma solicitação pendente para este e-mail."
      );
    }

    const id = Utilities.getUuid();

    const linha = montarLinhaSolicitacao(indices, {
      ID: id,
      EMAIL: emailSolicitante,
      NOME: nomeNormalizado,
      COMARCA: comarcaNormalizada,
      PERFIL: perfilSolicitado,
      JUSTIFICATIVA: justificativaNormalizada,
      STATUS: "PENDENTE",
      DATA: new Date()
    });

    sheet.appendRow(linha);

    try {
      notificarNovaSolicitacao(
        emailSolicitante,
        nomeNormalizado,
        perfilSolicitado,
        comarcaNormalizada,
        justificativaNormalizada
      );
    } catch (erroEmail) {
      registrarErroAPI(
        "NOTIFICAR_NOVA_SOLICITACAO",
        erroEmail
      );
    }

    try {
      const msgNotif = nomeNormalizado + " (" + emailSolicitante + ") solicitou acesso como " + perfilSolicitado + (comarcaNormalizada ? " \u2014 comarca: " + comarcaNormalizada : "") + ".";
      notificarGestoresSistemaSobreSolicitacao("SOLICITACAO_PERFIL", msgNotif, id);
    } catch (erroNotif) {
      registrarErroAPI("NOTIFICAR_SOLICITACAO_PERFIL", erroNotif);
    }

    return respostaSucesso({ id: id });
  } catch (erro) {
    registrarErroAPI(
      "SOLICITAR_ACESSO",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

/**
 * Formulário público de acesso (aba "Formulário de Acesso").
 *
 * Qualquer visitante pode preencher: nome, unidades, e-mail,
 * perfil solicitado e justificativa. Os dados são gravados na
 * aba SOLICITACOES_ACESSO com status PENDENTE.
 */
function enviarFormularioAcesso(dados) {
  const lock =
    LockService.getScriptLock();

  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const entrada = ehObjeto(dados) ? dados : {};

    const nome =
      textoSeguro(
        valorObjeto(entrada, "nome", "NOME")
      );

    const unidadesInformadas = valorObjeto(
      entrada,
      "unidadeIds",
      "unidades",
      "UNIDADE_IDS",
      "UNIDADES"
    );

    const email =
      normalizarEmail(
        valorObjeto(entrada, "email", "EMAIL")
      );

    const perfilSolicitado =
      String(
        valorObjeto(entrada, "perfil", "perfilSolicitado", "PERFIL_SOLICITADO")
          || ""
      )
        .trim()
        .toUpperCase();

    const justificativa =
      textoSeguro(
        valorObjeto(entrada, "justificativa", "JUSTIFICATIVA")
      );

    if (nome.length < 3) {
      throw new Error(
        "Informe o seu nome completo."
      );
    }

    if (
      nome.length >
      CONFIG.LIMITES.TAMANHO_MAXIMO_NOME
    ) {
      throw new Error(
        "O nome informado é muito grande."
      );
    }

    if (
      perfilSolicitado !== CONFIG.PERFIS.GESTOR_CONTEUDO &&
      perfilSolicitado !== CONFIG.PERFIS.GESTOR_SISTEMA
    ) {
      throw new Error(
        "Perfil solicitado inválido."
      );
    }

    const unidadeIds = validarUnidadesSolicitadas(
      unidadesInformadas,
      perfilSolicitado === CONFIG.PERFIS.GESTOR_CONTEUDO
    );

    // Gestor do Sistema possui escopo global.
    if (perfilSolicitado === CONFIG.PERFIS.GESTOR_SISTEMA) unidadeIds.length = 0;

    if (justificativa.length < 10) {
      throw new Error(
        "Descreva a justificativa (mínimo de 10 caracteres)."
      );
    }

    if (!emailValidoAPI(email)) {
      throw new Error(
        "Informe um e-mail válido."
      );
    }

    if (!emailInstitucional(email)) {
      throw new Error(
        "Somente e-mails institucionais (" +
        CONFIG.AUTH.DOMINIO_INSTITUCIONAL +
        ") podem solicitar acesso."
      );
    }

    if (
      justificativa.length >
      CONFIG.LIMITES.TAMANHO_MAXIMO_OBSERVACAO
    ) {
      throw new Error(
        "A justificativa é muito longa."
      );
    }

    // --- GESTOR: gera senha 20 já, mas fica PENDENTE (ATIVO=NAO) até aprovação ---
    var ehGestorSolicitacao = (perfilSolicitado === CONFIG.PERFIS.GESTOR_CONTEUDO || perfilSolicitado === CONFIG.PERFIS.GESTOR_SISTEMA);
    if (ehGestorSolicitacao) {
      // Verifica pendência ANTES de tocar USUARIOS (evita escrita parcial em duplicata)
      var sheetSolicPre = DB.solicitacoesAcesso();
      if (sheetSolicPre) {
        try{
          var dadosPre = sheetSolicPre.getDataRange().getValues();
          var indicesPre = indicesSolicitacao(dadosPre[0] || []);
          if (indicesPre.STATUS !== undefined && indicesPre.EMAIL !== undefined) {
            var jaPendentePre = dadosPre.slice(1).some(function(row){ var eL = normalizarEmail(row[indicesPre.EMAIL]); var sL = String(row[indicesPre.STATUS]||"").trim().toUpperCase(); return eL===email && sL==="PENDENTE"; });
            if (jaPendentePre) throw new Error("Já existe uma solicitação pendente para este e-mail.");
          }
        }catch(ePreCheck){ if(String((ePreCheck&&ePreCheck.message)||"").indexOf("pendente")!==-1) throw ePreCheck; }
      }
      var senhaGestor = gerarSenha20();
      var sheetUsuariosGestor = DB.usuarios();
      var mapaUG = DB.map(sheetUsuariosGestor);
      var idxIdUG = mapaUG.ID;
      var idxEmailUG = mapaUG.EMAIL;
      var idxNomeUG = mapaUG.NOME;
      var idxPerfilUG = mapaUG.PERFIL;
      var idxNivelUG = mapaUG.NIVEL;
      var idxAtivoUG = mapaUG.ATIVO;
      var idxSenhaUG = mapaUG.SENHA;
      if (idxSenhaUG === undefined) {
        try{ var ssTmpG = DB.getSpreadsheet(); garantirColunaSenhaUsuarios(ssTmpG, sheetUsuariosGestor); mapaUG = DB.map(sheetUsuariosGestor); idxSenhaUG = mapaUG.SENHA; }catch(eMigG){}
      }
      if (
        idxEmailUG === undefined ||
        idxNomeUG === undefined ||
        idxAtivoUG === undefined ||
        idxSenhaUG === undefined ||
        idxIdUG === undefined ||
        (idxNivelUG === undefined && idxPerfilUG === undefined)
      ) {
        throw new Error("A aba USUARIOS não possui os cabeçalhos esperados para autenticação.");
      }
      var dadosUG = sheetUsuariosGestor.getDataRange().getValues();
      var headersUG = DB.headers(sheetUsuariosGestor);
      var widthUG = headersUG.length;
      var linhaExistG = -1;
      var usuarioIdGestor = "";
      for (var ig=1; ig<dadosUG.length; ig++){
        var emailLinG = idxEmailUG!==undefined ? normalizarEmail(dadosUG[ig][idxEmailUG-1]) : normalizarEmail(dadosUG[ig][0]);
        if (emailLinG === email){ linhaExistG = ig+1; break; }
      }
      if (linhaExistG !== -1) {
        var perfilExistG = perfilUsuarioPorLinha(mapaUG, dadosUG[linhaExistG-1]);
        var ativoExistG = idxAtivoUG!==undefined ? paraBoolean(dadosUG[linhaExistG-1][idxAtivoUG-1]) : false;
        // Se já é GESTOR ativo, bloqueia
        if (ativoExistG && (perfilExistG === CONFIG.PERFIS.GESTOR_SISTEMA || perfilExistG === CONFIG.PERFIS.GESTOR_CONTEUDO)) {
          throw new Error("Este e-mail já possui acesso administrativo ("+perfilExistG+").");
        }
        usuarioIdGestor = textoSeguro(dadosUG[linhaExistG-1][idxIdUG-1]);
        if (!usuarioIdGestor) {
          usuarioIdGestor = gerarNovoIdUsuario(sheetUsuariosGestor);
          sheetUsuariosGestor.getRange(linhaExistG, idxIdUG).setValue(usuarioIdGestor);
        }
        // Atualiza para pendente (ATIVO=NAO) com nova senha e perfil solicitado
        if (idxNomeUG!==undefined) sheetUsuariosGestor.getRange(linhaExistG, idxNomeUG).setValue(nome);
        if (idxPerfilUG!==undefined) sheetUsuariosGestor.getRange(linhaExistG, idxPerfilUG).setValue(perfilSolicitado);
        if (idxNivelUG!==undefined) sheetUsuariosGestor.getRange(linhaExistG, idxNivelUG).setValue(nivelPorPerfil(perfilSolicitado));
        if (idxAtivoUG!==undefined) sheetUsuariosGestor.getRange(linhaExistG, idxAtivoUG).setValue(false);
        if (idxSenhaUG!==undefined) sheetUsuariosGestor.getRange(linhaExistG, idxSenhaUG).setValue(senhaGestor);
      } else {
        var novaLinhaG = new Array(widthUG).fill("");
        usuarioIdGestor=gerarNovoIdUsuario(sheetUsuariosGestor);
        novaLinhaG[idxIdUG-1]=usuarioIdGestor;
        if (idxEmailUG!==undefined) novaLinhaG[idxEmailUG-1]=email;
        if (idxNomeUG!==undefined) novaLinhaG[idxNomeUG-1]=nome;
        if (idxPerfilUG!==undefined) novaLinhaG[idxPerfilUG-1]=perfilSolicitado;
        if (idxNivelUG!==undefined) novaLinhaG[idxNivelUG-1]=nivelPorPerfil(perfilSolicitado);
        if (idxAtivoUG!==undefined) novaLinhaG[idxAtivoUG-1]=false;
        if (idxSenhaUG!==undefined) novaLinhaG[idxSenhaUG-1]=senhaGestor;
        if (novaLinhaG.every(function(v){ return !v; })) {
          throw new Error("A aba USUARIOS não possui os cabeçalhos esperados.");
        } else {
          sheetUsuariosGestor.appendRow(novaLinhaG);
        }
      }
      // Cria solicitação PENDENTE na aba de solicitações
      var sheetSolicGestor = DB.solicitacoesAcesso();
      if (!sheetSolicGestor) throw new Error("Aba de solicitações de acesso não encontrada.");
      var dadosPlanilhaG = sheetSolicGestor.getDataRange().getValues();
      var indicesG = indicesSolicitacao(dadosPlanilhaG[0] || []);
      if (indicesG.STATUS === undefined || indicesG.EMAIL === undefined || indicesG.UNIDADES === undefined) throw new Error("A aba SOLICITACOES_ACESSO deve possuir a coluna UNIDADE_ID. Execute atualizarAbaSolicitacoesAcesso().");
      var pendenteExistG = dadosPlanilhaG.slice(1).some(function(row){ var eL = normalizarEmail(row[indicesG.EMAIL]); var sL = String(row[indicesG.STATUS]||"").trim().toUpperCase(); return eL===email && sL==="PENDENTE"; });
      if (pendenteExistG) {
        throw new Error("Já existe uma solicitação pendente para este e-mail.");
      }
      var idG = Utilities.getUuid();
      var linhaSolicG = montarLinhaSolicitacao(indicesG, {
        ID: idG,
        EMAIL: email,
        NOME: nome,
        UNIDADES: serializarIdsUnidadesSolicitacao(unidadeIds),
        PERFIL: nivelPorPerfil(perfilSolicitado),
        JUSTIFICATIVA: justificativa,
        STATUS: "PENDENTE",
        DATA: new Date()
      });
      sheetSolicGestor.appendRow(linhaSolicG);
      SpreadsheetApp.flush();
      var resumoUnidades = perfilSolicitado === CONFIG.PERFIS.GESTOR_SISTEMA
        ? "Todas as unidades"
        : unidadeIds.length + " unidade(s) selecionada(s)";
      try{ notificarNovaSolicitacao(email, nome, perfilSolicitado, resumoUnidades, justificativa); }catch(eN){ registrarErroAPI("NOTIFICAR_NOVA_SOLICITACAO", eN); }
      try{
        const msgPerfil = nome + " (" + email + ") solicitou acesso como " + perfilSolicitado + " — " + resumoUnidades + ".";
        notificarGestoresSistemaSobreSolicitacao("SOLICITACAO_PERFIL", msgPerfil, idG);
        try{ criarNotificacao(email, "SENHA_GERADA", "Sua senha de acesso foi gerada e enviada por e-mail. Aguarde a aprova\u00e7\u00e3o do Gestor do Sistema para ativar seu login.", idG); }catch(eSen){}
      }catch(eNotifG){ registrarErroAPI("NOTIFICAR_FORMULARIO_GESTOR", eNotifG); }
      // E-mail ao solicitante com senha + aviso de pendência
      try{
        var assuntoSenhaG = "Sua senha de acesso — Sistema de Telefones PJES (acesso pendente)";
        var corpoSenhaG = "Olá "+nome+",\n\nSua senha de acesso ao Sistema Inteligente de Gestão de Telefones do PJES foi gerada:\n\nSenha: "+senhaGestor+"\n\nAnote sua senha de acesso. Também foi enviada ao e-mail institucional.\n\nAcesso em andamento. Quando sua conta for aprovada você conseguirá entrar.\nUse seu e-mail ("+email+") e esta senha na tela de Login somente após o Gestor do Sistema aprovar sua solicitação.\n\nAtenciosamente,\nTJES — Sistema de Telefones";
        adicionarEmailPendente(email, assuntoSenhaG, corpoSenhaG);
      }catch(eMailG){ registrarErroAPI("EMAIL_SENHA_GESTOR", eMailG); }
      registrarInfoAPI("FORMULARIO_GESTOR_SENHA_PENDENTE", "Senha pendente gerada para gestor: "+email+" perfil "+perfilSolicitado);
      return respostaSucesso({ senha: senhaGestor, email: email });
    }
  } catch (erro) {
    registrarErroAPI(
      "FORMULARIO_ACESSO",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

function localizarSolicitacaoAPI(sheet, id) {
  const idBusca = textoSeguro(id);

  const dados =
    sheet.getDataRange().getValues();

  const indices = indicesSolicitacao(dados[0] || []);

  for (
    let i = 1;
    i < dados.length;
    i++
  ) {
    if (
      textoSeguro(dados[i][indices.ID]) ===
      idBusca
    ) {
      return {
        linha: i + 1,
        id: dados[i][indices.ID],
        email: normalizarEmail(dados[i][indices.EMAIL]),
        nome: textoSeguro(dados[i][indices.NOME]),
        unidadeIds: indices.UNIDADES !== undefined
          ? parseIdsUnidadesSolicitacao(dados[i][indices.UNIDADES])
          : [],
        perfil: perfilSolicitadoPorValor(dados[i][indices.PERFIL]),
        status: String(dados[i][indices.STATUS] || "")
          .trim()
          .toUpperCase()
      };
    }
  }

  return null;
}

function processarSolicitacaoAPI(id, novoStatus, authDados) {
  const lock =
    LockService.getScriptLock();

  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    new AuthService(authDados).exigirPerfil(
      CONFIG.PERFIS.GESTOR_SISTEMA
    );

    const idBusca = textoSeguro(id);

    if (!idBusca) {
      throw new Error(
        "ID da solicitação é obrigatório."
      );
    }

    const status =
      String(novoStatus || "")
        .trim()
        .toUpperCase();

    if (
      !["APROVADO", "REJEITADO"].includes(status)
    ) {
      throw new Error(
        "Status de solicitação inválido."
      );
    }

    const ss = obterPlanilhaAPI();

    const sheetSolic =
      DB.solicitacoesAcesso();

    if (!sheetSolic) {
      throw new Error(
        "Aba de solicitações de acesso não encontrada."
      );
    }

    const solicitacao =
      localizarSolicitacaoAPI(
        sheetSolic,
        idBusca
      );

    if (!solicitacao) {
      throw new Error(
        "Solicitação não encontrada."
      );
    }

    if (solicitacao.status !== "PENDENTE") {
      throw new Error(
        "Esta solicitação já foi processada."
      );
    }

    if (
      solicitacao.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO &&
      solicitacao.perfil !== CONFIG.PERFIS.GESTOR_SISTEMA
    ) {
      throw new Error(
        "O perfil solicitado é inválido."
      );
    }

    if (status === "APROVADO") {
      const sheetUsuarios =
        ss.getSheetByName(
          CONFIG.SHEETS.USUARIOS
        );

      if (!sheetUsuarios) {
        throw new Error(
          "Aba USUARIOS não encontrada."
        );
      }

      let mapaU = DB.map(sheetUsuarios);
      if (mapaU.SENHA === undefined) {
        garantirColunaSenhaUsuarios(ss, sheetUsuarios);
        mapaU = DB.map(sheetUsuarios);
      }

      const idxEmailU = mapaU.EMAIL;
      const idxNomeU = mapaU.NOME;
      const idxPerfilU = mapaU.PERFIL;
      const idxNivelU = mapaU.NIVEL;
      const idxAtivoU = mapaU.ATIVO;
      const idxSenhaU = mapaU.SENHA;
      const idxIdU = mapaU.ID;

      if (
        idxEmailU === undefined ||
        idxAtivoU === undefined ||
        idxSenhaU === undefined ||
        idxIdU === undefined ||
        (idxNivelU === undefined && idxPerfilU === undefined)
      ) {
        throw new Error("A aba USUARIOS não possui os cabeçalhos esperados para autenticação.");
      }

      const dadosU = sheetUsuarios.getDataRange().getValues();
      const perfilSolicitadoNorm = String(solicitacao.perfil || "").trim().toUpperCase();
      const unidadesSolicitadas = validarUnidadesSolicitadas(
        solicitacao.unidadeIds,
        perfilSolicitadoNorm === CONFIG.PERFIS.GESTOR_CONTEUDO
      );

      let usuarioExiste = false;
      let linhaUsuario = -1;
      let usuarioIdAprovado = "";

      for (let i = 1; i < dadosU.length; i++) {
        const emailUsuario = idxEmailU !== undefined ? normalizarEmail(dadosU[i][idxEmailU - 1]) : normalizarEmail(dadosU[i][0]);
        if (emailUsuario === solicitacao.email) {
          linhaUsuario = i + 1;
          usuarioExiste = true;
          break;
        }
      }

      if (usuarioExiste) {
        // Nome
        if (idxNomeU !== undefined) sheetUsuarios.getRange(linhaUsuario, idxNomeU).setValue(solicitacao.nome);
        if (idxPerfilU !== undefined) sheetUsuarios.getRange(linhaUsuario, idxPerfilU).setValue(perfilSolicitadoNorm);
        if (idxNivelU !== undefined) sheetUsuarios.getRange(linhaUsuario, idxNivelU).setValue(nivelPorPerfil(perfilSolicitadoNorm));
        sheetUsuarios.getRange(linhaUsuario, idxAtivoU).setValue(true);
        usuarioIdAprovado = textoSeguro(dadosU[linhaUsuario - 1][idxIdU - 1]);
        if (!usuarioIdAprovado) {
          usuarioIdAprovado = gerarNovoIdUsuario(sheetUsuarios);
          sheetUsuarios.getRange(linhaUsuario, idxIdU).setValue(usuarioIdAprovado);
        }

        // Solicitações novas já têm senha; este fallback cobre solicitações legadas.
        const senhaExistente = textoSeguro(dadosU[linhaUsuario - 1][idxSenhaU - 1]);
        if (senhaExistente.length !== 20) {
          const senhaLegada = gerarSenha20();
          sheetUsuarios.getRange(linhaUsuario, idxSenhaU).setValue(senhaLegada);
          try {
            adicionarEmailPendente(
              solicitacao.email,
              "Sua senha de acesso — Sistema de Telefones PJES",
              "Olá " + solicitacao.nome + ",\n\nSua solicitação foi aprovada.\n\nSenha (20 caracteres): " + senhaLegada + "\n\nUse seu e-mail institucional e esta senha em Acesso Administrativo."
            );
          } catch (erroSenhaLegada) {
            registrarErroAPI("EMAIL_SENHA_APROVACAO_LEGADA", erroSenhaLegada);
          }
        }
      } else {
        // Compatibilidade com solicitações antigas em que o usuário ainda não existia.
        const senhaNova = gerarSenha20();
        const linhaNova = new Array(DB.headers(sheetUsuarios).length).fill("");
        usuarioIdAprovado = gerarNovoIdUsuario(sheetUsuarios);
        linhaNova[idxIdU - 1] = usuarioIdAprovado;
        linhaNova[idxEmailU - 1] = solicitacao.email;
        if (idxNomeU !== undefined) linhaNova[idxNomeU - 1] = solicitacao.nome;
        if (idxPerfilU !== undefined) linhaNova[idxPerfilU - 1] = perfilSolicitadoNorm;
        if (idxNivelU !== undefined) linhaNova[idxNivelU - 1] = nivelPorPerfil(perfilSolicitadoNorm);
        linhaNova[idxAtivoU - 1] = true;
        linhaNova[idxSenhaU - 1] = senhaNova;
        sheetUsuarios.appendRow(linhaNova);
        try {
          adicionarEmailPendente(
            solicitacao.email,
            "Sua senha de acesso — Sistema de Telefones PJES",
            "Olá " + solicitacao.nome + ",\n\nSua solicitação foi aprovada.\n\nSenha (20 caracteres): " + senhaNova + "\n\nUse seu e-mail institucional e esta senha em Acesso Administrativo."
          );
        } catch (erroSenhaNova) {
          registrarErroAPI("EMAIL_SENHA_APROVACAO_LEGADA", erroSenhaNova);
        }
      }

      sincronizarAcessosUnidadesUsuario(
        usuarioIdAprovado,
        perfilSolicitadoNorm === CONFIG.PERFIS.GESTOR_CONTEUDO ? unidadesSolicitadas : []
      );
    }

    const aprovador =
      new AuthService(authDados).usuarioAtual().email || obterEmailSessaoAPI();

    const indices =
      indicesSolicitacao(
        sheetSolic.getRange(1, 1, 1, sheetSolic.getLastColumn()).getDisplayValues()[0]
      );

    if (indices.STATUS !== undefined) {
      sheetSolic
        .getRange(solicitacao.linha, indices.STATUS + 1)
        .setValue(status);
    }

    if (indices.APROVADOR !== undefined) {
      sheetSolic
        .getRange(solicitacao.linha, indices.APROVADOR + 1)
        .setValue(aprovador);
    }

    if (indices.DATA_APROVACAO !== undefined) {
      sheetSolic
        .getRange(solicitacao.linha, indices.DATA_APROVACAO + 1)
        .setValue(new Date());
    }

    try {
      notificarDecisaoSolicitacao(
        solicitacao.email,
        solicitacao.nome,
        status,
        solicitacao.perfil
      );
    } catch (erroEmail) {
      registrarErroAPI(
        "NOTIFICAR_DECISAO_SOLICITACAO",
        erroEmail
      );
    }

    try {
      const aprovado = status === "APROVADO";
      notificarUsuarioSobreDecisao(solicitacao.email, aprovado, solicitacao.perfil, idBusca);
    } catch (erroNotifDecisao) {
      registrarErroAPI("NOTIFICAR_DECISAO_NOTIF", erroNotifDecisao);
    }

    registrarInfoAPI(
      status === "APROVADO"
        ? "APROVAR_SOLICITACAO"
        : "REJEITAR_SOLICITACAO",
      "Solicitação processada: " +
        idBusca +
        " - " +
        status
    );

    return respostaSucesso(true);
  } catch (erro) {
    registrarErroAPI(
      novoStatus === "APROVADO"
        ? "APROVAR_SOLICITACAO"
        : "REJEITAR_SOLICITACAO",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

function aprovarSolicitacao(id, authDados) {
  return processarSolicitacaoAPI(
    id,
    "APROVADO",
    authDados
  );
}

function rejeitarSolicitacao(id, authDados) {
  return processarSolicitacaoAPI(
    id,
    "REJEITADO",
    authDados
  );
}

/**
 * ==========================================================
 * HISTÓRICO GERAL
 * ==========================================================
 */

function listarHistoricoGeral(authDados) {
  try {
    let usuarioHistPerm = null;
    try {
      new AuthService(authDados).exigirPermissao(
        CONFIG.PERMISSOES.HISTORICO
      );
      usuarioHistPerm = new AuthService(authDados).usuarioAtual();
    } catch (ePermHist) {
      if (authDados && typeof authDados === "object") {
        try {
          const emailAuthH = normalizarEmail(valorObjeto(authDados, "email", "EMAIL") || "");
          const senhaAuthH = textoSeguro(valorObjeto(authDados, "senha", "SENHA", "password") || "");
          if (emailAuthH && senhaAuthH) {
            const resAuthH = autenticarConsulta({ email: emailAuthH, senha: senhaAuthH });
            if (resAuthH && resAuthH.sucesso === true && resAuthH.dados) {
              const pH = String(resAuthH.dados.perfil || "").toUpperCase();
              if (pH === CONFIG.PERFIS.GESTOR_SISTEMA || pH === CONFIG.PERFIS.GESTOR_CONTEUDO) {
                usuarioHistPerm = { email: resAuthH.dados.email, perfil: pH, logado: true, ativo: true, comarcas: resAuthH.dados.comarcas || [] };
              }
            }
          }
        } catch (eAH) {}
      }
      if (!usuarioHistPerm || !usuarioHistPerm.logado) throw ePermHist;
    }

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

    // v3.32: Gestor Conteúdo vê apenas alterações das comarcas que possui acesso
    let historicoFiltrado = resultado;

    const usuarioHistorico = usuarioHistPerm || new AuthService().usuarioAtual();

    if (
      usuarioHistorico.logado &&
      usuarioHistorico.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      (usuarioHistorico.comarcas || []).length > 0
    ) {
      const permitidasHist =
        usuarioHistorico.comarcas.map(item =>
          normalizarChave(item)
        );

      historicoFiltrado =
        resultado.filter(item =>
          permitidasHist.includes(
            normalizarChave(
              textoSeguro(item.comarca)
            )
          )
        );
    }

    return respostaSucesso(historicoFiltrado);

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

function notificarNovaSolicitacao(
  emailSolicitante,
  nomeSolicitante,
  perfilSolicitado,
  unidadesResumo,
  justificativa
) {
  const gestorEmail =
    obterConfiguracaoAPI(
      "EMAIL_GESTOR"
    );

  if (
    !gestorEmail ||
    !emailValidoAPI(gestorEmail)
  ) {
    registrarInfoAPI(
      "NOTIFICAR_NOVA_SOLICITACAO",
      "EMAIL_GESTOR não está configurado."
    );

    return false;
  }

  const assunto =
    "Nova solicitação de acesso - " +
    nomeSolicitante;

  let corpo =
    "Foi recebida uma nova solicitação de acesso:\n\n" +
    "Nome: " +
    nomeSolicitante +
    "\n" +
    "E-mail: " +
    emailSolicitante +
    "\n";

  const unidadesTexto =
    textoSeguro(unidadesResumo);

  if (unidadesTexto) {
    corpo +=
      "Unidades: " +
      unidadesTexto +
      "\n";
  }

  corpo +=
    "Perfil solicitado: " +
    perfilSolicitado +
    "\n";

  const justificativaTexto =
    textoSeguro(justificativa);

  if (justificativaTexto) {
    corpo +=
      "Justificativa: " +
      justificativaTexto +
      "\n";
  }

  corpo +=
    "\nAcesse a área administrativa:\n" +
    obterUrlAdmin();

  adicionarEmailPendente(
    gestorEmail,
    assunto,
    corpo
  );

  return true;
}

function notificarDecisaoSolicitacao(
  emailSolicitante,
  nomeSolicitante,
  status,
  perfil
) {
  const aprovado =
    String(status || "")
      .trim()
      .toUpperCase() === "APROVADO";

  const assunto =
    aprovado
      ? "Acesso administrativo aprovado"
      : "Acesso administrativo rejeitado";

  let corpo =
    "Olá " +
    nomeSolicitante +
    ",\n\n";

  corpo +=
    "A sua solicitação de acesso como " +
    perfil +
    " foi " +
    (
      aprovado
        ? "aprovada"
        : "rejeitada"
    ) +
    ".\n\n";

  if (aprovado) {
    corpo +=
      "Acesse o sistema pelo endereço:\n" +
      obterUrlSistema();
  } else {
    corpo +=
      "Você poderá tentar novamente mais tarde.";
  }

  adicionarEmailPendente(
    emailSolicitante,
    assunto,
    corpo
  );

  return true;
}

function obterAbaEmailsPendenteAPI() {
  const ss =
    obterPlanilhaAPI();

  let sheet =
    ss.getSheetByName(
      CONFIG.SHEETS.EMAILS_PENDENTES
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        CONFIG.SHEETS.EMAILS_PENDENTES
      );
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "DESTINATARIO",
      "ASSUNTO",
      "CORPO"
    ]);
  }

  return sheet;
}

function adicionarEmailPendente(
  destinatario,
  assunto,
  corpo
) {
  const destino =
    normalizarEmail(
      destinatario
    );

  const titulo =
    textoSeguro(
      assunto
    );

  const mensagem =
    String(corpo || "");

  if (
    !emailValidoAPI(destino) ||
    !titulo ||
    !mensagem
  ) {
    return false;
  }

  obterAbaEmailsPendenteAPI()
    .appendRow([
      destino,
      titulo,
      mensagem
    ]);

  return true;
}

function processarFilaDeEmails() {
  const sheet =
    obterAbaEmailsPendenteAPI();

  if (sheet.getLastRow() <= 1) {
    return;
  }

  const dados =
    sheet.getDataRange()
      .getValues();

  for (
    let i = dados.length - 1;
    i >= 1;
    i--
  ) {
    const destinatario =
      normalizarEmail(
        dados[i][0]
      );

    const assunto =
      textoSeguro(
        dados[i][1]
      );

    const corpo =
      String(
        dados[i][2] || ""
      );

    if (
      !emailValidoAPI(
        destinatario
      ) ||
      !assunto ||
      !corpo
    ) {
      sheet.deleteRow(i + 1);
      continue;
    }

    try {
      MailApp.sendEmail(
        destinatario,
        assunto,
        corpo
      );

      sheet.deleteRow(i + 1);
    } catch (erro) {
      registrarErroAPI(
        "PROCESSAR_FILA_EMAILS",
        new Error(
          "Falha ao enviar e-mail para " +
          destinatario +
          ": " +
          (
            erro.message ||
            erro
          )
        )
      );
    }
  }
}

function instalarTriggerEmails() {
  ScriptApp
    .getProjectTriggers()
    .forEach(trigger => {
      if (
        trigger.getHandlerFunction() ===
        "processarFilaDeEmails"
      ) {
        ScriptApp.deleteTrigger(
          trigger
        );
      }
    });

  ScriptApp
    .newTrigger(
      "processarFilaDeEmails"
    )
    .timeBased()
    .everyMinutes(1)
    .create();

  return "Gatilho de e-mails instalado.";
}

/**
 * ==========================================================
 * LOG
 * ==========================================================
 */

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
  "SENHA_GERADA",
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
  const lista = [];
  try {
    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const idxEmail = mapa.EMAIL;
    const idxAtivo = mapa.ATIVO;
    if (
      idxEmail === undefined ||
      idxAtivo === undefined ||
      (mapa.PERFIL === undefined && mapa.NIVEL === undefined)
    ) {
      const fallback = obterConfiguracaoAPI("EMAIL_GESTOR");
      if (fallback && emailValidoAPI(fallback)) {
        lista.push(normalizarEmail(fallback));
      }
      return lista;
    }
    DB.read(sheet).forEach(linha => {
      const perfil = perfilUsuarioPorLinha(mapa, linha);
      const ativo = paraBoolean(linha[idxAtivo - 1]);
      const email = normalizarEmail(linha[idxEmail - 1]);
      if (
        perfil === CONFIG.PERFIS.GESTOR_SISTEMA &&
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

function listarNotificacoes(email, authDados) {
  try {
    let emailAlvo = normalizarEmail(email);
    const usuario = new AuthService(authDados).usuarioAtual();
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

function marcarNotificacaoLida(id, authDados) {
  const lock = LockService.getScriptLock();
  let precisaLiberar = false;
  try {
    if (!lock.hasLock()) {
      lock.waitLock(30000);
      precisaLiberar = true;
    }
    const idBusca = textoSeguro(id);
    if (!idBusca) throw new Error("ID da notifica\u00e7\u00e3o \u00e9 obrigat\u00f3rio.");
    const usuario = new AuthService(authDados).usuarioAtual();
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
    if (!lock.hasLock()) {
      lock.waitLock(30000);
      precisaLiberar = true;
    }
    let emailAlvo = normalizarEmail(email);
    let usuario = new AuthService(authDados).usuarioAtual();
    let emailSessao = normalizarEmail(usuario.email || "");
    if ((!usuario.logado || !emailSessao) && authDados && typeof authDados === "object") {
      try {
        const emailAuth = normalizarEmail(valorObjeto(authDados, "email", "EMAIL") || "");
        const senhaAuth = textoSeguro(valorObjeto(authDados, "senha", "SENHA", "password") || "");
        if (emailAuth && senhaAuth) {
          const resAuth = autenticarConsulta({ email: emailAuth, senha: senhaAuth });
          if (resAuth && resAuth.sucesso === true && resAuth.dados) {
            usuario = { email: resAuth.dados.email, nome: resAuth.dados.nome, perfil: resAuth.dados.perfil, logado: true, ativo: true, comarcas: resAuth.dados.comarcas || [] };
            emailSessao = normalizarEmail(usuario.email || "");
            if (!emailAlvo) emailAlvo = emailSessao;
          }
        }
      } catch (eAuth2) {}
    }
    if (!emailAlvo) emailAlvo = normalizarEmail(usuario.email || obterEmailSessaoAPI() || emailSessao || "");
    if (!emailAlvo) throw new Error("E-mail n\u00e3o informado.");
    const ehProprio = normalizarEmail(usuario.email) === emailAlvo;
    const ehGestor = usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA;
    if (!ehProprio && !ehGestor) {
      let permitirProprio = false;
      try {
        const alvoInfo = new AuthService().buscarUsuario(emailAlvo);
        if (alvoInfo && alvoInfo.ativo && alvoInfo.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO) permitirProprio = true;
      } catch (e) {}
      if (!permitirProprio) emailAlvo = normalizarEmail(usuario.email || emailSessao || "");
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
    let emailAlvo = normalizarEmail(email);
    let usuario = new AuthService(authDados).usuarioAtual();
    let emailSessao = normalizarEmail(usuario.email || "");
    if ((!usuario.logado || !emailSessao) && authDados && typeof authDados === "object") {
      try {
        const emailAuth = normalizarEmail(valorObjeto(authDados, "email", "EMAIL") || "");
        const senhaAuth = textoSeguro(valorObjeto(authDados, "senha", "SENHA", "password") || "");
        if (emailAuth && senhaAuth) {
          const resAuth = autenticarConsulta({ email: emailAuth, senha: senhaAuth });
          if (resAuth && resAuth.sucesso === true && resAuth.dados) {
            usuario = { email: resAuth.dados.email, nome: resAuth.dados.nome, perfil: resAuth.dados.perfil, logado: true, ativo: true, comarcas: resAuth.dados.comarcas || [] };
            emailSessao = normalizarEmail(usuario.email || "");
            if (!emailAlvo) emailAlvo = emailSessao;
          }
        }
      } catch (eAuth3) {}
    }
    if (!emailAlvo) emailAlvo = normalizarEmail(usuario.email || obterEmailSessaoAPI() || emailSessao || "");
    if (!emailAlvo) return respostaSucesso({ total: 0, count: 0 });
    const ehProprio = normalizarEmail(usuario.email) === emailAlvo;
    const ehGestor = usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA;
    if (!ehProprio && !ehGestor) {
      let permitirProprio = false;
      try {
        const alvoInfo = new AuthService().buscarUsuario(emailAlvo);
        if (alvoInfo && alvoInfo.ativo && alvoInfo.perfil === CONFIG.PERFIS.GESTOR_CONTEUDO) permitirProprio = true;
      } catch (e) {}
      if (!permitirProprio) emailAlvo = normalizarEmail(usuario.email || emailSessao || "");
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

  return AuthService
    .obterEmailAtivo();
}

function obterConfiguracaoAPI(chave) {
  try {
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

function listarUsuarios(authDados) {
  try {
    new AuthService(authDados).exigirPerfil(
      CONFIG.PERFIS.GESTOR_SISTEMA
    );

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const dados = DB.read(sheet);

    const idxEmail = mapa.EMAIL;
    const idxNome = mapa.NOME;
    const idxAtivo = mapa.ATIVO;
    const idxComarcas = mapa.COMARCAS;

    /*
     * Visitantes (USUARIO_CONSULTA) não aparecem na lista:
     * a lista gerencia pessoas com acesso administrativo.
     */
    const resultado =
      dados
        .filter(linha => {
          const perfil = perfilUsuarioPorLinha(mapa, linha);

          return perfil !== CONFIG.PERFIS.USUARIO_CONSULTA;
        })
        .map(linha => ({
          id: mapa.ID !== undefined ? textoSeguro(linha[mapa.ID - 1]) : "",
          email: idxEmail !== undefined ? normalizarEmail(linha[idxEmail - 1]) : "",
          nome: textoSeguro(idxNome ? linha[idxNome - 1] : ""),
          perfil: perfilUsuarioPorLinha(mapa, linha),
          nivel: mapa.NIVEL !== undefined ? Number(linha[mapa.NIVEL - 1]) || 1 : nivelPorPerfil(perfilUsuarioPorLinha(mapa, linha)),
          ativo: paraBoolean(idxAtivo ? linha[idxAtivo - 1] : false),
          comarcas: idxComarcas !== undefined ? textoSeguro(linha[idxComarcas - 1]) : ""
        }));

    return respostaSucesso(resultado);
  } catch (erro) {
    registrarErroAPI(
      "LISTAR_USUARIOS",
      erro
    );

    return respostaErro(erro);
  }
}

/**
 * Solicita acesso de edição a uma comarca fora do escopo
 * do gestor de conteúdo.
 *
 * Cria uma solicitação PENDENTE na aba SOLICITACOES_ACESSO
 * para que o Gestor do Sistema veja em solicitacoes-view
 * (via listarSolicitacoes) e possa aprovar/rejeitar.
 * Também notifica os gestores do sistema por e-mail
 * (fila EMAILS_PENDENTES) e registra no LOG.
 * Usa LockService para evitar duplicidade.
 */
function solicitarPermissaoComarca(comarca, authDados) {
  const lock =
    LockService.getScriptLock();

  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    let usuario = null;
    let viaSenha = false;
    // Prioriza sessão por senha (Login) quando authDados vier do frontend
    var dadosAuthPre = (authDados && typeof authDados === "object") ? authDados : {};
    var emailAuthPre = normalizarEmail(valorObjeto(dadosAuthPre, "email", "EMAIL") || "");
    var senhaAuthPre = textoSeguro(valorObjeto(dadosAuthPre, "senha", "SENHA", "password") || "");
    if (emailAuthPre && senhaAuthPre) {
      var resAuthPre = autenticarConsulta({email: emailAuthPre, senha: senhaAuthPre});
      if (resAuthPre && resAuthPre.sucesso === true && resAuthPre.dados) {
        usuario = {
          email: resAuthPre.dados.email,
          nome: resAuthPre.dados.nome,
          perfil: resAuthPre.dados.perfil,
          ativo: true,
          logado: true,
          comarcas: resAuthPre.dados.comarcas || []
        };
        viaSenha = true;
      } else {
        var msgAuthPre = (resAuthPre && resAuthPre.erro) ? String(resAuthPre.erro) : "Sessão inválida. Faça login novamente.";
        throw new Error(msgAuthPre);
      }
    }
    if (!usuario || !usuario.logado) {
      try {
        const authTmp = new AuthService(authDados);
        authTmp.exigirPermissao(CONFIG.PERMISSOES.EDITAR);
        const uTmp = authTmp.usuarioAtual();
        if (uTmp && uTmp.logado) usuario = uTmp;
      } catch(eGoogle) { if(!usuario) usuario = null; }
    }
    if (!usuario || !usuario.logado) {
      // tenta sessão por senha fallback (se não veio no pre)
      var dadosAuth = (authDados && typeof authDados === "object") ? authDados : {};
      var emailAuth = normalizarEmail(valorObjeto(dadosAuth, "email", "EMAIL") || "");
      var senhaAuth = textoSeguro(valorObjeto(dadosAuth, "senha", "SENHA", "password") || "");
      if (emailAuth && senhaAuth && !viaSenha) {
        var resAuth = autenticarConsulta({email: emailAuth, senha: senhaAuth});
        if (resAuth && resAuth.sucesso === true && resAuth.dados) {
          usuario = {
            email: resAuth.dados.email,
            nome: resAuth.dados.nome,
            perfil: resAuth.dados.perfil,
            ativo: true,
            logado: true,
            comarcas: resAuth.dados.comarcas || []
          };
          viaSenha = true;
        } else {
          var msgAuth = (resAuth && resAuth.erro) ? String(resAuth.erro) : "Sessão inválida. Faça login novamente.";
          throw new Error(msgAuth);
        }
      }
    }
    if (!usuario || !usuario.logado) {
      throw new Error("É necessário estar autenticado.");
    }
    if (usuario.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO) {
      if (usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA) {
        throw new Error("Gestor do Sistema já tem acesso a todas as comarcas.");
      }
      throw new Error(
        "Somente gestores de conteúdo solicitam acesso a comarcas."
      );
    }

    const comarcaAlvo =
      textoSeguro(comarca);

    if (!comarcaAlvo) {
      throw new Error("Informe a comarca desejada.");
    }

    /*
     * A comarca precisa existir na base.
     */
    const dados =
      new TelefoneRepository().listar();

    const chaveAlvo =
      normalizarChave(comarcaAlvo);

    const existe =
      dados.some(item =>
        normalizarChave(
          textoSeguro(item.comarca)
        ) === chaveAlvo
      );

    if (!existe) {
      throw new Error(
        "A comarca \"" +
        comarcaAlvo +
        "\" não foi encontrada na base."
      );
    }

    /*
     * Sem escopo definido (vazia = todas) não há o que solicitar.
     */
    const atuais =
      Array.isArray(usuario.comarcas)
        ? usuario.comarcas
        : [];

    if (atuais.length === 0) {
      throw new Error(
        "Você já pode editar todas as comarcas."
      );
    }

    const jaTem =
      atuais.some(item =>
        normalizarChave(item) === chaveAlvo
      );

    if (jaTem) {
      throw new Error(
        "Você já tem acesso à comarca \"" +
        comarcaAlvo +
        "\"."
      );
    }

    /*
     * Verifica solicitação pendente já existente para este e-mail + comarca.
     * Evita duplicidade na aba SOLICITACOES_ACESSO.
     */
    const sheetSolic =
      DB.solicitacoesAcesso();

    if (!sheetSolic) {
      throw new Error(
        "Aba de solicitações de acesso não encontrada."
      );
    }

    const dadosSolic =
      sheetSolic.getDataRange().getValues();

    const indicesSolic =
      indicesSolicitacao(dadosSolic[0] || []);

    const emailSolicNorm =
      normalizarEmail(usuario.email);

    const jaPendenteMesmaComarca =
      dadosSolic.slice(1).some(row => {
        const emailLinha =
          indicesSolic.EMAIL !== undefined
            ? normalizarEmail(row[indicesSolic.EMAIL])
            : normalizarEmail(row[1]);

        const statusLinha =
          indicesSolic.STATUS !== undefined
            ? String(row[indicesSolic.STATUS] || "").trim().toUpperCase()
            : String(row[5] || "").trim().toUpperCase();

        const comarcaLinha =
          indicesSolic.COMARCA !== undefined
            ? normalizarChave(String(row[indicesSolic.COMARCA] || ""))
            : "";

        return (
          emailLinha === emailSolicNorm &&
          statusLinha === "PENDENTE" &&
          comarcaLinha === chaveAlvo
        );
      });

    if (jaPendenteMesmaComarca) {
      throw new Error(
        "Já existe uma solicitação pendente para a comarca \"" +
        comarcaAlvo +
        "\". Aguarde a análise do Gestor do Sistema."
      );
    }

    /*
     * Cria solicitação PENDENTE para que o Gestor do Sistema
     * veja em solicitacoes-view (listarSolicitacoes).
     */
    const idSolic =
      Utilities.getUuid();

    const nomeSolic =
      textoSeguro(usuario.nome) ||
      String(usuario.email || "")
        .split("@")[0];

    const justificativaSolic =
      "Solicitação de acesso à comarca \"" +
      comarcaAlvo +
      "\" via Telefones (Gestor de Conteúdo) \u2014 " +
      nomeSolic +
      " (" +
      emailSolicNorm +
      ")";

    const linhaSolic =
      montarLinhaSolicitacao(indicesSolic, {
        ID: idSolic,
        EMAIL: emailSolicNorm,
        NOME: nomeSolic,
        COMARCA: comarcaAlvo,
        PERFIL: CONFIG.PERFIS.GESTOR_CONTEUDO,
        JUSTIFICATIVA: justificativaSolic,
        STATUS: "PENDENTE",
        DATA: new Date()
      });

    sheetSolic.appendRow(linhaSolic);

    /*
     * Destinatários: gestores do sistema ativos;
     * sem nenhum, usa a configuração EMAIL_GESTOR.
     */
    const destinatarios = [];

    try {
      const sheet = DB.usuarios();
      const mapa = DB.map(sheet);

      const idxAtivo = mapa.ATIVO;
      const idxEmail = mapa.EMAIL;

      DB.read(sheet).forEach(linha => {
        const perfil = perfilUsuarioPorLinha(mapa, linha);

        const ativo =
          paraBoolean(
            idxAtivo ? linha[idxAtivo - 1] : false
          );

        const email =
          textoSeguro(
            idxEmail ? linha[idxEmail - 1] : ""
          );

        if (
          perfil === CONFIG.PERFIS.GESTOR_SISTEMA &&
          ativo &&
          emailValidoAPI(email)
        ) {
          destinatarios.push(email);
        }
      });
    } catch (erro) {
      registrarInfoAPI(
        "SOLICITAR_ACESSO_COMARCA",
        "Falha ao listar gestores do sistema: " + erro.message
      );
    }

    if (destinatarios.length === 0) {
      const fallback =
        obterConfiguracaoAPI("EMAIL_GESTOR");

      if (fallback && emailValidoAPI(fallback)) {
        destinatarios.push(fallback);
      }
    }

    const nomeSolicitante =
      textoSeguro(usuario.nome) ||
      String(usuario.email || "")
        .split("@")[0];

    const assunto =
      "Solicitação de acesso à comarca - " +
      comarcaAlvo;

    const corpo =
      "Um gestor de conteúdo solicitou acesso de edição a uma comarca:\n\n" +
      "Nome: " + nomeSolicitante + "\n" +
      "E-mail: " + textoSeguro(usuario.email) + "\n" +
      "Comarca solicitada: " + comarcaAlvo + "\n\n" +
      "Para liberar o acesso, edite o usuário no painel de Usuários\n" +
      "e adicione a comarca à coluna COMARCAS.\n\n" +
      "Acesse a área administrativa:\n" +
      obterUrlAdmin();

    let notificados = 0;

    destinatarios.forEach(destino => {
      if (
        adicionarEmailPendente(
          destino,
          assunto,
          corpo
        )
      ) {
        notificados++;
      }
    });

    try{
      const msgComarca = (textoSeguro(usuario.nome) || usuario.email) + " solicitou acesso \u00e0 comarca \"" + comarcaAlvo + "\".";
      destinatarios.forEach(function(emailG){
        try{ criarNotificacao(emailG, "SOLICITACAO_COMARCA", msgComarca, idSolic); }catch(e){}
      });
    }catch(eNC){ try{ registrarErroAPI("NOTIFICAR_SOLICITACAO_COMARCA", eNC); }catch(e){} }

    registrarLog(
      "SOLICITAR_ACESSO_COMARCA " +
      textoSeguro(usuario.email) +
      " -> " +
      comarcaAlvo
    );

    return respostaSucesso({
      comarca: comarcaAlvo,
      notificados: notificados,
      id: idSolic
    });
  } catch (erro) {
    registrarErroAPI(
      "SOLICITAR_ACESSO_COMARCA",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

/**
 * Cancela uma solicitação pendente de acesso à comarca.
 *
 * O gestor de conteúdo pode desfazer o pedido dentro da janela
 * de 10 minutos (controle de UI) ou a qualquer momento enquanto
 * ainda estiver PENDENTE. Remove a linha da aba SOLICITACOES_ACESSO
 * para que o Gestor do Sistema não veja mais o pedido.
 */
function cancelarSolicitacaoComarca(comarca, authDados) {
  const lock =
    LockService.getScriptLock();

  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    let usuario = null;
    let viaSenha = false;
    var dadosAuthPre2 = (authDados && typeof authDados === "object") ? authDados : {};
    var emailAuthPre2 = normalizarEmail(valorObjeto(dadosAuthPre2, "email", "EMAIL") || "");
    var senhaAuthPre2 = textoSeguro(valorObjeto(dadosAuthPre2, "senha", "SENHA", "password") || "");
    if (emailAuthPre2 && senhaAuthPre2) {
      var resAuthPre2 = autenticarConsulta({email: emailAuthPre2, senha: senhaAuthPre2});
      if (resAuthPre2 && resAuthPre2.sucesso === true && resAuthPre2.dados) {
        usuario = {
          email: resAuthPre2.dados.email,
          nome: resAuthPre2.dados.nome,
          perfil: resAuthPre2.dados.perfil,
          ativo: true,
          logado: true,
          comarcas: resAuthPre2.dados.comarcas || []
        };
        viaSenha = true;
      } else {
        var msgAuthPre2 = (resAuthPre2 && resAuthPre2.erro) ? String(resAuthPre2.erro) : "Sessão inválida. Faça login novamente.";
        throw new Error(msgAuthPre2);
      }
    }
    if (!usuario || !usuario.logado) {
      try {
        const authTmp2 = new AuthService(authDados);
        authTmp2.exigirPermissao(CONFIG.PERMISSOES.EDITAR);
        const uTmp2 = authTmp2.usuarioAtual();
        if (uTmp2 && uTmp2.logado) usuario = uTmp2;
      } catch(eGoogle2) { if(!usuario) usuario = null; }
    }
    if (!usuario || !usuario.logado) {
      var dadosAuth2 = (authDados && typeof authDados === "object") ? authDados : {};
      var emailAuth2 = normalizarEmail(valorObjeto(dadosAuth2, "email", "EMAIL") || "");
      var senhaAuth2 = textoSeguro(valorObjeto(dadosAuth2, "senha", "SENHA", "password") || "");
      if (emailAuth2 && senhaAuth2 && !viaSenha) {
        var resAuth2 = autenticarConsulta({email: emailAuth2, senha: senhaAuth2});
        if (resAuth2 && resAuth2.sucesso === true && resAuth2.dados) {
          usuario = {
            email: resAuth2.dados.email,
            nome: resAuth2.dados.nome,
            perfil: resAuth2.dados.perfil,
            ativo: true,
            logado: true,
            comarcas: resAuth2.dados.comarcas || []
          };
          viaSenha = true;
        } else {
          var msgAuth2 = (resAuth2 && resAuth2.erro) ? String(resAuth2.erro) : "Sessão inválida. Faça login novamente.";
          throw new Error(msgAuth2);
        }
      }
    }
    if (!usuario || !usuario.logado) {
      throw new Error("É necessário estar autenticado.");
    }
    if (usuario.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO) {
      throw new Error("Somente gestores de conteúdo podem cancelar solicitações de comarca.");
    }

    const comarcaAlvo2 =
      textoSeguro(comarca);

    if (!comarcaAlvo2) {
      throw new Error("Informe a comarca desejada.");
    }

    const chaveAlvo2 =
      normalizarChave(comarcaAlvo2);

    const sheetSolic2 =
      DB.solicitacoesAcesso();

    if (!sheetSolic2) {
      throw new Error("Aba de solicitações de acesso não encontrada.");
    }

    const dadosSolic2 =
      sheetSolic2.getDataRange().getValues();

    if (dadosSolic2.length <= 1) {
      throw new Error("Nenhuma solicitação encontrada para cancelar.");
    }

    const indicesSolic2 =
      indicesSolicitacao(dadosSolic2[0] || []);

    const emailSolicNorm2 =
      normalizarEmail(usuario.email);

    let linhaAlvo = -1;
    let idAlvo = "";

    for (let i = 1; i < dadosSolic2.length; i++) {
      const emailLinha2 =
        indicesSolic2.EMAIL !== undefined
          ? normalizarEmail(dadosSolic2[i][indicesSolic2.EMAIL])
          : normalizarEmail(dadosSolic2[i][1]);

      const statusLinha2 =
        indicesSolic2.STATUS !== undefined
          ? String(dadosSolic2[i][indicesSolic2.STATUS] || "").trim().toUpperCase()
          : String(dadosSolic2[i][5] || "").trim().toUpperCase();

      const comarcaLinha2 =
        indicesSolic2.COMARCA !== undefined
          ? normalizarChave(String(dadosSolic2[i][indicesSolic2.COMARCA] || ""))
          : "";

      if (
        emailLinha2 === emailSolicNorm2 &&
        statusLinha2 === "PENDENTE" &&
        comarcaLinha2 === chaveAlvo2
      ) {
        linhaAlvo = i + 1;
        idAlvo = indicesSolic2.ID !== undefined ? String(dadosSolic2[i][indicesSolic2.ID] || "") : "";
        break;
      }
    }

    if (linhaAlvo === -1) {
      throw new Error("Nenhuma solicitação pendente encontrada para a comarca \"" + comarcaAlvo2 + "\".");
    }

    // Remove a linha pendente (Gestor do Sistema não verá mais)
    sheetSolic2.deleteRow(linhaAlvo);

    try{
      const gestoresCancel = obterEmailsGestoresSistema();
      const msgCancel = (textoSeguro(usuario.nome) || usuario.email) + " cancelou a solicita\u00e7\u00e3o de acesso \u00e0 comarca \"" + comarcaAlvo2 + "\".";
      gestoresCancel.forEach(function(emailG){
        try{ criarNotificacao(emailG, "CANCELAMENTO", msgCancel, idAlvo || comarcaAlvo2); }catch(e){}
      });
    }catch(eCancNotif){ try{ registrarErroAPI("NOTIFICAR_CANCELAMENTO", eCancNotif); }catch(e){} }

    registrarLog(
      "CANCELAR_SOLICITACAO_COMARCA " +
      textoSeguro(usuario.email) +
      " -> " +
      comarcaAlvo2 +
      (idAlvo ? " (" + idAlvo + ")" : "")
    );

    return respostaSucesso({
      comarca: comarcaAlvo2,
      id: idAlvo
    });
  } catch (erro) {
    registrarErroAPI(
      "CANCELAR_SOLICITACAO_COMARCA",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

/**
 * Atualiza um usuário da aba USUARIOS.
 *
 * Permite trocar o perfil (GESTOR_SISTEMA, GESTOR_CONTEUDO ou
 * USUARIO_CONSULTA/visitante), ativar/desativar e definir as
 * comarcas permitidas para gestores de conteúdo.
 *
 * Proteções:
 * - Somente GESTOR_SISTEMA;
 * - não é possível editar a própria conta (evita trava acidental);
 * - não é possível remover o último gestor do sistema ativo.
 */
function atualizarUsuario(email, dados, authDados) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const auth = new AuthService(authDados);

    auth.exigirPerfil(
      CONFIG.PERFIS.GESTOR_SISTEMA
    );

    const emailAlvo = normalizarEmail(email);

    if (!emailAlvo) {
      throw new Error("E-mail do usuário é obrigatório.");
    }

    const sessao = auth.usuarioAtual();

    if (normalizarEmail(sessao.email) === emailAlvo) {
      throw new Error("Você não pode editar a sua própria conta pelo painel de usuários.");
    }

    const entrada = ehObjeto(dados) ? dados : {};

    const possuiNome =
      possuiCampo(entrada, "nome", "NOME");

    const nomeNovo =
      possuiNome
        ? textoSeguro(
            valorObjeto(entrada, "nome", "NOME")
          )
        : null;

    const possuiPerfil =
      possuiCampo(entrada, "perfil", "PERFIL");

    const possuiAtivo =
      possuiCampo(entrada, "ativo", "ATIVO");

    const possuiComarcas =
      possuiCampo(entrada, "comarcas", "COMARCAS");

    const perfilBruto =
      possuiPerfil
        ? String(
            valorObjeto(entrada, "perfil", "PERFIL") || ""
          )
            .trim()
            .toUpperCase()
        : null;

    const ativoBruto =
      possuiAtivo
        ? valorObjeto(entrada, "ativo", "ATIVO")
        : null;

    const comarcasBruto =
      possuiComarcas
        ? valorObjeto(entrada, "comarcas", "COMARCAS")
        : null;

    let sheet = DB.usuarios();
    let mapa = DB.map(sheet);
    let dadosSheet = sheet.getDataRange().getValues();

    let idxEmail = mapa.EMAIL;
    let idxNome = mapa.NOME;
    let idxPerfil = mapa.PERFIL;
    let idxNivel = mapa.NIVEL;
    let idxAtivo = mapa.ATIVO;
    let idxComarcas = mapa.COMARCAS;
    let idxSenha = mapa.SENHA;

    if (idxSenha === undefined) {
      try {
        const ssTmpSenha = DB.getSpreadsheet();
        garantirColunaSenhaUsuarios(ssTmpSenha, sheet);
        mapa = DB.map(sheet);
        idxSenha = mapa.SENHA;
      } catch (eSenhaU) {}
    }

    let linhaEncontrada = -1;

    for (let i = 1; i < dadosSheet.length; i++) {
      if (normalizarEmail(dadosSheet[i][idxEmail - 1]) === emailAlvo) {
        linhaEncontrada = i + 1;
        break;
      }
    }

    if (linhaEncontrada === -1) {
      throw new Error("Usuário não encontrado na aba USUARIOS.");
    }

    const perfilAtual = perfilUsuarioPorLinha(mapa, dadosSheet[linhaEncontrada - 1]);

    const ativoAtual =
      paraBoolean(dadosSheet[linhaEncontrada - 1][idxAtivo - 1]);

    const comarcasAtualRaw =
      idxComarcas !== undefined
        ? textoSeguro(dadosSheet[linhaEncontrada - 1][idxComarcas - 1])
        : "";

    const comarcasAtual = parseComarcas(comarcasAtualRaw);

    const perfilNovo =
      possuiPerfil ? perfilBruto : perfilAtual;

    const perfisValidos = [
      CONFIG.PERFIS.GESTOR_SISTEMA,
      CONFIG.PERFIS.GESTOR_CONTEUDO,
      CONFIG.PERFIS.USUARIO_CONSULTA
    ];

    if (!perfisValidos.includes(perfilNovo)) {
      throw new Error("Perfil inválido.");
    }

    const ativoNovo =
      possuiAtivo ? paraBoolean(ativoBruto) : ativoAtual;

    let comarcasNovo =
      possuiComarcas
        ? parseComarcas(comarcasBruto)
        : comarcasAtual;

    if (perfilNovo === CONFIG.PERFIS.GESTOR_SISTEMA) {
      comarcasNovo = [];
    }

    if (
      perfilNovo === CONFIG.PERFIS.GESTOR_CONTEUDO &&
      comarcasNovo.length > 0
    ) {
      // valida apenas que o texto não contém separadores inválidos
      if (comarcasNovo.some(item => item.length > 150)) {
        throw new Error("Nome de comarca muito longo.");
      }
    }

    /*
     * Proteção: não permitir desativar/demover o último
     * gestor do sistema ativo.
     */
    if (
      perfilAtual === CONFIG.PERFIS.GESTOR_SISTEMA &&
      ativoAtual &&
      (perfilNovo !== CONFIG.PERFIS.GESTOR_SISTEMA || !ativoNovo)
    ) {
      let outrosGestores = 0;

      for (let i = 1; i < dadosSheet.length; i++) {
        if (i === linhaEncontrada - 1) continue;

        const perfil = perfilUsuarioPorLinha(mapa, dadosSheet[i]);

        const ativo =
          paraBoolean(dadosSheet[i][idxAtivo - 1]);

        if (
          perfil === CONFIG.PERFIS.GESTOR_SISTEMA &&
          ativo
        ) {
          outrosGestores++;
        }
      }

      if (outrosGestores === 0) {
        throw new Error(
          "Não é possível remover o último gestor do sistema ativo."
        );
      }
    }

    if (idxNome !== undefined && nomeNovo !== null) {
      sheet.getRange(linhaEncontrada, idxNome).setValue(nomeNovo);
    }

    if (idxPerfil !== undefined && possuiPerfil) {
      sheet.getRange(linhaEncontrada, idxPerfil).setValue(perfilNovo);
    }

    if (idxNivel !== undefined && possuiPerfil) {
      sheet.getRange(linhaEncontrada, idxNivel).setValue(nivelPorPerfil(perfilNovo));
    }

    if (idxAtivo !== undefined && possuiAtivo) {
      sheet.getRange(linhaEncontrada, idxAtivo).setValue(ativoNovo ? "SIM" : "NÃO");
    }

    const deveLimparComarcasSistema = perfilNovo === CONFIG.PERFIS.GESTOR_SISTEMA;

    if (idxComarcas !== undefined && (possuiComarcas || deveLimparComarcasSistema)) {
      sheet.getRange(linhaEncontrada, idxComarcas).setValue(
        serializarComarcas(comarcasNovo)
      );
    }

    if (idxSenha !== undefined) {
      const senhaAtual = textoSeguro(dadosSheet[linhaEncontrada - 1][idxSenha - 1]);
      if (!senhaAtual && ativoNovo) {
        try {
          const novaSenha = gerarSenha20();
          sheet.getRange(linhaEncontrada, idxSenha).setValue(novaSenha);
          try{ const emailAlvo2 = normalizarEmail(emailAlvo); if(emailValidoAPI(emailAlvo2)) criarNotificacao(emailAlvo2, "SENHA_GERADA", "Sua senha de acesso foi (re)gerada pelo Gestor do Sistema e enviada por e-mail.", emailAlvo2); }catch(eN){ try{ registrarErroAPI("NOTIFICAR_SENHA_ATUALIZAR", eN); }catch(e){} }
        } catch (eNovaSenha) {}
      }
    }

    SpreadsheetApp.flush();

    registrarInfoAPI(
      "ATUALIZAR_USUARIO",
      emailAlvo + " -> " + perfilNovo + (ativoNovo ? " (ativo)" : " (inativo)")
    );

    return respostaSucesso({
      email: emailAlvo,
      perfil: perfilNovo,
      ativo: ativoNovo,
      comarcas: serializarComarcas(comarcasNovo)
    });
  } catch (erro) {
    registrarErroAPI(
      "ATUALIZAR_USUARIO",
      erro
    );

    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}
/**
 * Cria um novo usuário na aba USUARIOS.
 *
 * Somente GESTOR_SISTEMA pode criar.
 * Valida e-mail institucional (@tjes.jus.br), perfil,
 * comarcas e verifica duplicidade.
 */
function criarUsuario(dados, authDados) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const auth = new AuthService(authDados);
    auth.exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);

    const entrada = ehObjeto(dados) ? dados : {};

    const emailBruto = textoSeguro(valorObjeto(entrada, "email", "EMAIL"));
    const email = normalizarEmail(emailBruto);

    if (!email) {
      throw new Error("E-mail é obrigatório.");
    }

    if (!emailValidoAPI(email)) {
      throw new Error("E-mail inválido.");
    }

    if (!emailInstitucional(email)) {
      throw new Error("Somente e-mails institucionais (@tjes.jus.br) são permitidos.");
    }

    const nome = textoSeguro(valorObjeto(entrada, "nome", "NOME"));

    if (!nome) {
      throw new Error("Nome é obrigatório.");
    }

    if (nome.length < 3) {
      throw new Error("Informe um nome válido (mínimo de 3 caracteres).");
    }

    if (nome.length > CONFIG.LIMITES.TAMANHO_MAXIMO_NOME) {
      throw new Error("Nome muito longo.");
    }

    const perfilBruto = String(valorObjeto(entrada, "perfil", "PERFIL") || "").trim().toUpperCase();
    const perfil = perfilBruto || CONFIG.PERFIS.GESTOR_CONTEUDO;

    const perfisValidos = [CONFIG.PERFIS.GESTOR_SISTEMA, CONFIG.PERFIS.GESTOR_CONTEUDO];

    if (!perfisValidos.includes(perfil)) {
      throw new Error("Perfil inválido. Use Gestor do Sistema ou Gestor de Conteúdo.");
    }

    const ativo = possuiCampo(entrada, "ativo", "ATIVO") ? paraBoolean(valorObjeto(entrada, "ativo", "ATIVO")) : true;

    const comarcasBruto = valorObjeto(entrada, "comarcas", "COMARCAS");
    const comarcasLista = parseComarcas(comarcasBruto);

    if (perfil === CONFIG.PERFIS.GESTOR_CONTEUDO && comarcasLista.length > 0) {
      if (comarcasLista.some(item => item.length > 150)) {
        throw new Error("Nome de comarca muito longo.");
      }
    }

    const comarcasSerial = perfil === CONFIG.PERFIS.GESTOR_SISTEMA ? "" : serializarComarcas(comarcasLista);

    const senhaGerada = gerarSenha20();

    let sheet = DB.usuarios();
    let mapa = DB.map(sheet);
    let idxEmail = mapa.EMAIL;
    let idxNome = mapa.NOME;
    let idxPerfil = mapa.PERFIL;
    let idxNivel = mapa.NIVEL;
    let idxId = mapa.ID;
    let idxAtivo = mapa.ATIVO;
    let idxComarcas = mapa.COMARCAS;
    let idxSenha = mapa.SENHA;

    if (idxSenha === undefined) {
      try {
        const ssTmp = DB.getSpreadsheet();
        garantirColunaSenhaUsuarios(ssTmp, sheet);
        mapa = DB.map(sheet);
        idxSenha = mapa.SENHA;
      } catch (eSenha) {}
    }

    if (!idxEmail || (!idxPerfil && !idxNivel) || !idxAtivo) {
      throw new Error("Aba USUARIOS sem cabeçalhos esperados. Execute instalarSistema().");
    }

    const dadosSheet = sheet.getDataRange().getValues();

    for (let i = 1; i < dadosSheet.length; i++) {
      if (normalizarEmail(dadosSheet[i][idxEmail - 1]) === email) {
        throw new Error("Já existe um usuário com este e-mail.");
      }
    }

    let headers = DB.headers(sheet);

    if (idxSenha === undefined) {
      try {
        const ssTmp2 = DB.getSpreadsheet();
        garantirColunaSenhaUsuarios(ssTmp2, sheet);
        mapa = DB.map(sheet);
        headers = DB.headers(sheet);
        idxSenha = mapa.SENHA;
      } catch (eSenha2) {}
    }

    const novaLinha = new Array(headers.length).fill("");

    if (idxId) novaLinha[idxId - 1] = gerarNovoIdUsuario(sheet);
    if (idxEmail) novaLinha[idxEmail - 1] = email;
    if (idxNome) novaLinha[idxNome - 1] = nome;
    if (idxPerfil) novaLinha[idxPerfil - 1] = perfil;
    if (idxNivel) novaLinha[idxNivel - 1] = nivelPorPerfil(perfil);
    if (idxAtivo) novaLinha[idxAtivo - 1] = ativo ? "SIM" : "NÃO";
    if (idxComarcas !== undefined) novaLinha[idxComarcas - 1] = comarcasSerial;
    if (idxSenha !== undefined) novaLinha[idxSenha - 1] = senhaGerada;

    sheet.appendRow(novaLinha);
    SpreadsheetApp.flush();

    try{
      criarNotificacao(email, "SENHA_GERADA", "Sua senha de acesso ao Sistema de Telefones foi gerada e enviada por e-mail. Guarde-a em local seguro.", email);
    }catch(eNotifSenha){ try{ registrarErroAPI("NOTIFICAR_SENHA_GERADA", eNotifSenha); }catch(e){} }

    // Envia senha ao novo usuário por e-mail (fila) — também visível ao Gestor na resposta
    try{
      var assuntoN = "PJES Telefones — sua senha de acesso (" + perfil + ")";
      var corpoN =
        "Olá " + (nome || email.split("@")[0]) + ",\n\n" +
        "Seu acesso ao Sistema Inteligente de Gestão de Telefones do PJES foi criado.\n\n" +
        "E-mail: " + email + "\n" +
        "Perfil: " + perfil + "\n" +
        (comarcasSerial ? "Comarcas: " + comarcasSerial + "\n" : "Comarcas: Todas\n") +
        "Senha (20 caracteres): " + senhaGerada + "\n\n" +
        "Anote sua senha de acesso. Também foi enviada ao e-mail institucional.\n" +
        "Você já pode fazer login imediatamente.\n\n" +
        "Atenciosamente,\nPJES — STI";
      if (typeof adicionarEmailPendente==="function") adicionarEmailPendente(email, assuntoN, corpoN);
      else if (typeof MailApp!=="undefined" && MailApp.sendEmail) MailApp.sendEmail({to: email, subject: assuntoN, body: corpoN});
    }catch(eN){ try{ registrarErroAPI("EMAIL_SENHA_CRIAR_USUARIO", eN); }catch(e2){} }

    registrarInfoAPI("CRIAR_USUARIO", email + " -> " + perfil + (ativo ? " (ativo)" : " (inativo)"));

    return respostaSucesso({
      email: email,
      nome: nome,
      perfil: perfil,
      ativo: ativo,
      comarcas: comarcasSerial,
      senha: senhaGerada
    });
  } catch (erro) {
    registrarErroAPI("CRIAR_USUARIO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

/**
 * Exclui um usuário da aba USUARIOS (remoção física da linha).
 *
 * Somente GESTOR_SISTEMA. Proteções:
 * - não pode excluir a própria conta;
 * - não pode excluir o último gestor do sistema ativo.
 */
function excluirUsuario(email, authDados) {
  const lock = LockService.getScriptLock();
  let bloqueado = false;

  try {
    lock.waitLock(30000);
    bloqueado = true;

    const auth = new AuthService(authDados);
    auth.exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);

    const emailAlvo = normalizarEmail(email);

    if (!emailAlvo) {
      throw new Error("E-mail é obrigatório.");
    }

    const sessao = auth.usuarioAtual();

    if (normalizarEmail(sessao.email) === emailAlvo) {
      throw new Error("Você não pode remover a sua própria conta.");
    }

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const idxEmail = mapa.EMAIL;
    const idxAtivo = mapa.ATIVO;

    if (!idxEmail) {
      throw new Error("Aba USUARIOS sem cabeçalho EMAIL.");
    }

    const dadosSheet = sheet.getDataRange().getValues();
    let linhaEncontrada = -1;

    for (let i = 1; i < dadosSheet.length; i++) {
      if (normalizarEmail(dadosSheet[i][idxEmail - 1]) === emailAlvo) {
        linhaEncontrada = i + 1;
        break;
      }
    }

    if (linhaEncontrada === -1) {
      throw new Error("Usuário não encontrado na aba USUARIOS.");
    }

    const perfilAtual = perfilUsuarioPorLinha(mapa, dadosSheet[linhaEncontrada - 1]);
    const ativoAtual = paraBoolean(dadosSheet[linhaEncontrada - 1][idxAtivo - 1]);

    if (perfilAtual === CONFIG.PERFIS.GESTOR_SISTEMA && ativoAtual) {
      let outrosGestores = 0;

      for (let i = 1; i < dadosSheet.length; i++) {
        if (i === linhaEncontrada - 1) continue;

        const perfil = perfilUsuarioPorLinha(mapa, dadosSheet[i]);
        const ativo = paraBoolean(dadosSheet[i][idxAtivo - 1]);

        if (perfil === CONFIG.PERFIS.GESTOR_SISTEMA && ativo) {
          outrosGestores++;
        }
      }

      if (outrosGestores === 0) {
        throw new Error("Não é possível remover o último gestor do sistema ativo.");
      }
    }

    sheet.deleteRow(linhaEncontrada);
    SpreadsheetApp.flush();

    registrarInfoAPI("EXCLUIR_USUARIO", emailAlvo);

    return respostaSucesso({ email: emailAlvo });
  } catch (erro) {
    registrarErroAPI("EXCLUIR_USUARIO", erro);
    return respostaErro(erro);
  } finally {
    if (bloqueado) {
      lock.releaseLock();
    }
  }
}

