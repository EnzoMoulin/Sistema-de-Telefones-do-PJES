/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 10_AuthService.gs
 * ==========================================================
 */

class AuthService {
  constructor(authDados) {
    this.cache = CacheService.getUserCache();
    this.sessaoSenha = AuthService.obterSessaoSenha(authDados);
    this.email = this.sessaoSenha
      ? normalizarEmail(this.sessaoSenha.email)
      : this.obterEmailDaSessao();
  }

  /**
   * Obtém a identidade real do usuário ativo.
   */
  static obterEmailAtivo() {
    try {
      return normalizarEmail(
        Session
          .getActiveUser()
          .getEmail()
      );
    } catch (erro) {
      return "";
    }
  }

  static extrairToken(authDados) {
    if (typeof authDados === "string") return textoSeguro(authDados);
    if (!authDados || typeof authDados !== "object") return "";
    return textoSeguro(authDados.token || authDados.TOKEN || authDados.sessionToken);
  }

  static chaveSessaoSenha(token) {
    return "AUTH_SENHA_" + hashSenha(token);
  }

  static criarSessaoSenha(usuario) {
    const email = normalizarEmail(usuario && usuario.email);
    const perfil = String((usuario && usuario.perfil) || "").trim().toUpperCase();

    if (!email || !emailInstitucional(email)) {
      throw new Error("Não foi possível criar a sessão de acesso.");
    }

    const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    const duracao = Math.min(Math.max(Number(CONFIG.AUTH.DURACAO_SESSAO_SEGUNDOS) || 3600, 60), 21600);
    const expiraEm = Date.now() + duracao * 1000;
    const sessao = { email: email, perfil: perfil, expiraEm: expiraEm };

    CacheService.getScriptCache().put(
      AuthService.chaveSessaoSenha(token),
      JSON.stringify(sessao),
      duracao
    );

    return { token: token, expiraEm: expiraEm };
  }

  static obterSessaoSenha(authDados) {
    const token = AuthService.extrairToken(authDados);
    if (!token) return null;

    try {
      const bruto = CacheService.getScriptCache().get(AuthService.chaveSessaoSenha(token));
      if (!bruto) return null;

      const sessao = JSON.parse(bruto);
      if (!sessao || !sessao.email || Number(sessao.expiraEm || 0) <= Date.now()) {
        CacheService.getScriptCache().remove(AuthService.chaveSessaoSenha(token));
        return null;
      }

      return sessao;
    } catch (erro) {
      return null;
    }
  }

  static chaveTentativasLogin(email) {
    return "AUTH_FALHAS_" + hashSenha(normalizarEmail(email)).slice(0, 32);
  }

  static verificarLimiteLogin(email) {
    const cache = CacheService.getScriptCache();
    const tentativas = Number(cache.get(AuthService.chaveTentativasLogin(email)) || 0);
    if (tentativas >= 5) {
      throw new Error("Muitas tentativas de login. Aguarde 10 minutos e tente novamente.");
    }
  }

  static registrarFalhaLogin(email) {
    if (!email) return;
    const cache = CacheService.getScriptCache();
    const chave = AuthService.chaveTentativasLogin(email);
    const tentativas = Number(cache.get(chave) || 0) + 1;
    cache.put(chave, String(tentativas), 600);
  }

  static limparFalhasLogin(email) {
    if (!email) return;
    CacheService.getScriptCache().remove(AuthService.chaveTentativasLogin(email));
  }

  /**
   * A identidade do usuário vem da conta Google ativa.
   *
   * Com a implantação em versão única (acesso "Qualquer pessoa com
   * conta Google"), o Session.getActiveUser() é confiável e dispensa
   * o cache de sessão — não existe mais sessão "velha" entre telas.
   */
  obterEmailDaSessao() {
    const emailAtivo = AuthService.obterEmailAtivo();

    if (!emailAtivo || !emailInstitucional(emailAtivo)) {
      return "";
    }

    return emailAtivo;
  }

  /**
   * Salva sessão autenticada do aplicativo.
   */
  static salvarSessao(email, perfil) {
    const emailNormalizado = normalizarEmail(email);

    if (!emailInstitucional(emailNormalizado)
    ) {
      throw new Error("Somente contas institucionais do TJES podem iniciar sessão.");
    }

    const perfilNormalizado =
      String(
        perfil ||
        CONFIG.PERFIS.USUARIO_CONSULTA
      )
        .trim()
        .toUpperCase();

    const perfisValidos = [CONFIG.PERFIS.GESTOR_SISTEMA, CONFIG.PERFIS.GESTOR_CONTEUDO, CONFIG.PERFIS.USUARIO_CONSULTA];

    const perfilSeguro = perfisValidos.includes(perfilNormalizado) ? perfilNormalizado : CONFIG.PERFIS.USUARIO_CONSULTA;

    const cache = CacheService.getUserCache();

    const duracao = CONFIG.AUTH.DURACAO_SESSAO_SEGUNDOS;

    cache.put("emailLogado", emailNormalizado, duracao);

    cache.put("perfilLogado", perfilSeguro, duracao);

    cache.put("sessaoAplicacaoAtiva", "SIM", duracao);
  }

  /**
   * Encerra a sessão do aplicativo.
   *
   * Não encerra a conta Google.
   */
  static limparSessao(authDados) {
    const token = AuthService.extrairToken(authDados);
    if (token) {
      try {
        CacheService.getScriptCache().remove(AuthService.chaveSessaoSenha(token));
      } catch (erroToken) {}
    }

    const cache = CacheService.getUserCache();

    cache.remove("emailLogado");
    cache.remove("perfilLogado");
    cache.remove("sessaoAplicacaoAtiva");
  }

  /**
   * Retorna o usuário atual.
   */
  usuarioAtual() {
    if (!this.email) {
      return {
        email: "",
        nome: "Visitante",
        perfil: CONFIG.PERFIS.USUARIO_CONSULTA,
        logado: false,
        ativo: false,
        comarcas: [],
        unidades: []
      };
    }

    if (!emailInstitucional(this.email)) {
      return {
        email: "",
        nome: "Visitante",
        perfil: CONFIG.PERFIS.USUARIO_CONSULTA,
        logado: false,
        ativo: false,
        comarcas: [],
        unidades: []
      };
    }

    const usuario = this.buscarUsuario(this.email);

      return {
        id: usuario.id || "",
        email: this.email,
        nome: usuario.nome || this.email.split("@")[0],
        perfil: usuario.ativo ? usuario.perfil : CONFIG.PERFIS.USUARIO_CONSULTA,
        nivel: usuario.nivel || nivelPorPerfil(usuario.perfil),
        logado: usuario.ativo === true,
        ativo: usuario.ativo === true,
        comarcas: usuario.comarcas || [],
        unidades: usuario.unidades || []
      };
  }

  /**
   * Pesquisa usuário na aba USUARIOS.
   */
  buscarUsuario(email) {
    const sheet = DB.usuarios();

    const dados = DB.read(sheet);

    const mapa = DB.map(sheet);

    // v3.34 — suporta ambos: legado (EMAIL/NOME/PERFIL/ATIVO/COMARCAS) e novo (ID/NOME/EMAIL/NIVEL/ATIVO + ACESSOS_UNIDADES)
    const idxNivel = mapa.NIVEL;
    const idxId = mapa.ID;

    const idxEmail = mapa.EMAIL;
    const idxNome = mapa.NOME;
    const idxPerfil = mapa.PERFIL;
    const idxAtivo = mapa.ATIVO;

    for (const linha of dados) {
      const emailLinha =
        idxEmail !== undefined
          ? normalizarEmail(linha[idxEmail - 1])
          : normalizarEmail(linha[0]);

      if (emailLinha !== normalizarEmail(email)) {
        continue;
      }

      const nome =
        idxNome !== undefined
          ? textoSeguro(linha[idxNome - 1])
          : textoSeguro(linha[1]);

      // v3.34 — NIVEL numérico (1/2/3) tem precedência sobre PERFIL string
      const perfilInformado = perfilUsuarioPorLinha(mapa, linha);
      const nivel = idxNivel !== undefined
        ? Number(linha[idxNivel - 1]) || nivelPorPerfil(perfilInformado)
        : nivelPorPerfil(perfilInformado);

      const perfisValidos = [CONFIG.PERFIS.GESTOR_SISTEMA, CONFIG.PERFIS.GESTOR_CONTEUDO, CONFIG.PERFIS.USUARIO_CONSULTA];

      const perfilSeguro = perfisValidos.includes(perfilInformado) ? perfilInformado : CONFIG.PERFIS.USUARIO_CONSULTA;

      const ativo =
        idxAtivo !== undefined
          ? paraBoolean(linha[idxAtivo - 1])
          : paraBoolean(linha[3]);

      // O escopo V4 vem exclusivamente de ACESSOS_UNIDADES.
      let unidades = [];
      let comarcas = []; // alias temporário de municípios para componentes legados de consulta
      try {
        const uid = idxId !== undefined ? textoSeguro(linha[idxId - 1]) : "";
        const sheetAcc = uid ? DB.acessosUnidadesOuNulo() : null;
        if (sheetAcc) {
          const mapaAcc = DB.map(sheetAcc);
          const catalogoResposta = listarUnidadesParaAcesso();
          const catalogo = {};
          if (catalogoResposta && catalogoResposta.sucesso === true) {
            (catalogoResposta.dados || []).forEach(function(item) { catalogo[item.id] = item; });
          }
          DB.read(sheetAcc).forEach(function(acesso) {
            const usuarioId = textoSeguro(_fcCampo(mapaAcc, acesso, ["USUARIO_ID"]));
            const unidadeId = textoSeguro(_fcCampo(mapaAcc, acesso, ["UNIDADE_ID"]));
            const ativoAcesso = paraBoolean(_fcCampo(mapaAcc, acesso, ["ATIVO"], false));
            if (usuarioId !== uid || !ativoAcesso || !catalogo[unidadeId]) return;
            const unidade = catalogo[unidadeId];
            unidades.push(unidade);
            if (comarcas.indexOf(unidade.municipio) === -1) comarcas.push(unidade.municipio);
          });
        }
      } catch (erroAcessos) {}

      return {
        id: idxId !== undefined ? textoSeguro(linha[idxId - 1]) : "",
        email: emailLinha,
        nome: nome,
        perfil: ativo ? perfilSeguro : CONFIG.PERFIS.USUARIO_CONSULTA,
        nivel: nivel,
        ativo: ativo,
        comarcas: comarcas,
        unidades: unidades
      };
    }

    /**
     * Usuário institucional ainda não aprovado.
     * Ele pode solicitar acesso, mas não pode editar.
     */
    return {
      id: "",
      email: normalizarEmail(email),
      nome: normalizarEmail(email).split("@")[0],
      perfil: CONFIG.PERFIS.USUARIO_CONSULTA,
      nivel: 1,
      ativo: false,
      comarcas: [],
      unidades: []
    };
  }

  perfilAtual() {
    return this.usuarioAtual().perfil;
  }

  exigirPermissao(permissao) {
    const usuario = this.usuarioAtual();

    const regras = {
      GESTOR_SISTEMA: [
        CONFIG.PERMISSOES.VISUALIZAR,
        CONFIG.PERMISSOES.PESQUISAR,
        CONFIG.PERMISSOES.EDITAR,
        CONFIG.PERMISSOES.EXCLUIR,
        CONFIG.PERMISSOES.HISTORICO
      ],

      GESTOR_CONTEUDO: [
        CONFIG.PERMISSOES.VISUALIZAR,
        CONFIG.PERMISSOES.PESQUISAR,
        CONFIG.PERMISSOES.EDITAR,
        CONFIG.PERMISSOES.EXCLUIR,
        CONFIG.PERMISSOES.HISTORICO
      ],

      USUARIO_CONSULTA: [CONFIG.PERMISSOES.VISUALIZAR, CONFIG.PERMISSOES.PESQUISAR]
    };

    const permissoes = regras[usuario.perfil] || [];

    const permissoesAdministrativas = [CONFIG.PERMISSOES.EDITAR, CONFIG.PERMISSOES.EXCLUIR, CONFIG.PERMISSOES.HISTORICO];

    if (permissoesAdministrativas.includes(permissao) && !usuario.logado) {
      throw new Error("Faça login pelo botão 'Acesso Administrativo'.");
    }

    if (!permissoes.includes(permissao)) {
      throw new Error("Usuário sem permissão para esta operação.");
    }

    return true;
  }

  exigirPerfil(perfilNecessario) {
    const usuario = this.usuarioAtual();

    if (!usuario.logado) {
      throw new Error("É necessário estar autenticado.");
    }

    if (usuario.perfil !== perfilNecessario) {
      throw new Error("Acesso permitido somente para " + perfilNecessario + ".");
    }

    return true;
  }

  /**
   * Verifica se o usuário pode atuar na comarca informada.
   *
   * - GESTOR_SISTEMA: pode atuar em todas as comarcas.
   * - GESTOR_CONTEUDO: somente nas comarcas da coluna COMARCAS
   *   (vazia = todas as comarcas).
   * - Demais perfis: sem permissão de edição.
   */
  exigirPermissaoComarca(comarca) {
    const usuario = this.usuarioAtual();

    if (!usuario.logado) {
      throw new Error("É necessário estar autenticado.");
    }

    if (usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA) {
      return true;
    }

    if (usuario.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO) {
      throw new Error("Usuário sem permissão para editar telefones.");
    }

    const comarcaNormalizada =
      normalizarChave(comarca);

    if (!comarcaNormalizada) {
      throw new Error("Comarca não informada.");
    }

    const comarcas = usuario.comarcas || [];

    if (comarcas.length === 0) {
      return true;
    }

    const permitida =
      comarcas.some(item =>
        normalizarChave(item) === comarcaNormalizada
      );

    if (!permitida) {
      throw new Error(
        "Seu perfil permite editar somente as comarcas: " +
        comarcas.join(", ") +
        "."
      );
    }

    return true;
  }
}
/**
 * ==========================================================
 * NOTIFICACOES - Extensao AuthService (v3.32 - permissão próprio usuário)
 * ==========================================================
 * Estas funcoes espelham as de 11_API para garantir que
 * AuthService tambem exponha a API de notificacoes quando
 * solicitado pelo enunciado.
 * v3.32: Gestor Conteúdo pode listar apenas suas próprias notificações;
 *        sem notificação exibe "Não há notificações não lidas" (frontend).
 */

AuthService.prototype.criarNotificacao = function(destinatarioEmail, tipo, mensagem, referencia) {
  return criarNotificacao(destinatarioEmail, tipo, mensagem, referencia);
};

AuthService.prototype.listarNotificacoes = function(email, authDados) {
  const res = listarNotificacoes(email, authDados);
  return res && res.sucesso ? res.dados : [];
};

AuthService.prototype.marcarNotificacaoLida = function(id) {
  return marcarNotificacaoLida(id);
};

AuthService.prototype.marcarTodasLidas = function(email, authDados) {
  return marcarTodasLidas(email, authDados);
};

AuthService.prototype.contarNaoLidas = function(email, authDados) {
  const res = contarNaoLidas(email, authDados);
  if (res && res.sucesso && res.dados) {
    return res.dados.total || res.dados.count || 0;
  }
  return 0;
};

/**
 * Wrappers globais (fallback caso 11_API nao tenha sido carregado).
 * Se ja existirem, nao sobrescrevem.
 */
if (typeof criarNotificacaoAuth === "undefined") {
  function criarNotificacaoAuth(destinatarioEmail, tipo, mensagem, referencia) {
    return criarNotificacao(destinatarioEmail, tipo, mensagem, referencia);
  }
}

if (typeof listarNotificacoesAuth === "undefined") {
  function listarNotificacoesAuth(email, authDados) {
    return listarNotificacoes(email, authDados);
  }
}

if (typeof marcarNotificacaoLidaAuth === "undefined") {
  function marcarNotificacaoLidaAuth(id) {
    return marcarNotificacaoLida(id);
  }
}

if (typeof marcarTodasLidasAuth === "undefined") {
  function marcarTodasLidasAuth(email, authDados) {
    return marcarTodasLidas(email, authDados);
  }
}

if (typeof contarNaoLidasAuth === "undefined") {
  function contarNaoLidasAuth(email, authDados) {
    return contarNaoLidas(email, authDados);
  }
}


if (typeof criarNotificacao === "undefined") {
  criarNotificacao = function(destinatarioEmail, tipo, mensagem, referencia) {
    throw new Error("criarNotificacao stub - 11_API nao carregado");
  };
}
if (typeof listarNotificacoes === "undefined") {
  listarNotificacoes = function(email, authDados) {
    throw new Error("listarNotificacoes stub");
  };
}
if (typeof marcarNotificacaoLida === "undefined") {
  marcarNotificacaoLida = function(id) {
    throw new Error("marcarNotificacaoLida stub");
  };
}
if (typeof marcarTodasLidas === "undefined") {
  marcarTodasLidas = function(email, authDados) {
    throw new Error("marcarTodasLidas stub");
  };
}
if (typeof contarNaoLidas === "undefined") {
  contarNaoLidas = function(email, authDados) {
    throw new Error("contarNaoLidas stub");
  };
}

function contarSolicitacoesPendentesAuth(){ return contarSolicitacoesPendentes(); }
