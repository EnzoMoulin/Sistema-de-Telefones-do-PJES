/**
 * Autenticação e autorização pela identidade Google da implantação privada.
 * A implantação pública falha de forma fechada e nunca concede privilégios.
 */
class AuthService {
  constructor() {
    this.modo = AuthService.modoAplicacao();
    this.email = this.obterEmailDaSessao();
  }

  static modoAplicacao() {
    const props = PropertiesService.getScriptProperties();
    const valor = String(
      props.getProperty(CONFIG.AUTH.PROPRIEDADE_MODO) || ""
    ).trim().toUpperCase();
    return valor === CONFIG.AUTH.MODO_PRIVADO
      ? CONFIG.AUTH.MODO_PRIVADO
      : CONFIG.AUTH.MODO_PUBLICO;
  }

  static ehContextoPrivado() {
    return AuthService.modoAplicacao() === CONFIG.AUTH.MODO_PRIVADO;
  }

  static exigirContextoPrivado() {
    if (!AuthService.ehContextoPrivado()) {
      throw new Error("Operação administrativa indisponível na URL pública.");
    }
    return true;
  }

  static obterEmailAtivo() {
    try {
      return normalizarEmail(Session.getActiveUser().getEmail());
    } catch (erro) {
      return "";
    }
  }

  static emailsTestePrivado() {
    if (!AuthService.ehContextoPrivado()) return [];
    const bruto = PropertiesService.getScriptProperties()
      .getProperty(CONFIG.AUTH.PROPRIEDADE_EMAILS_TESTE) || "";
    return String(bruto)
      .split(/[;,\n]+/)
      .map(normalizarEmail)
      .filter(Boolean);
  }

  static emailPermitidoNoPrivado(email) {
    const normalizado = normalizarEmail(email);
    if (!normalizado || !AuthService.ehContextoPrivado()) return false;
    return emailInstitucional(normalizado) ||
      AuthService.emailsTestePrivado().includes(normalizado);
  }

  obterEmailDaSessao() {
    if (!AuthService.ehContextoPrivado()) return "";
    const email = AuthService.obterEmailAtivo();
    return AuthService.emailPermitidoNoPrivado(email) ? email : "";
  }

  static usuarioConsulta(estado, email) {
    const identificado = Boolean(email);
    return {
      email: identificado ? normalizarEmail(email) : "",
      nome: identificado ? normalizarEmail(email).split("@")[0] : "Visitante",
      nivel: null,
      perfil: CONFIG.PERFIS.USUARIO_CONSULTA,
      logado: false,
      ativo: false,
      cadastrado: false,
      identificado: identificado,
      contexto: AuthService.modoAplicacao(),
      estadoAcesso: estado,
      podeSolicitarAcesso: false,
      unidadeIds: [],
      unidades: [],
      comarcas: []
    };
  }

  usuarioAtual() {
    if (!AuthService.ehContextoPrivado()) {
      return AuthService.usuarioConsulta("CONSULTA_PUBLICA", "");
    }

    const emailAtivo = AuthService.obterEmailAtivo();
    if (!emailAtivo) {
      return AuthService.usuarioConsulta("IDENTIDADE_NAO_DISPONIVEL", "");
    }

    if (!AuthService.emailPermitidoNoPrivado(emailAtivo)) {
      return AuthService.usuarioConsulta("DOMINIO_NAO_AUTORIZADO", emailAtivo);
    }

    return this.buscarUsuario(emailAtivo);
  }

  buscarUsuario(email) {
    AuthService.exigirContextoPrivado();
    const emailNormalizado = normalizarEmail(email);
    const base = AuthService.usuarioConsulta("NAO_CADASTRADO", emailNormalizado);
    base.identificado = true;
    base.podeSolicitarAcesso = AuthService.emailPermitidoNoPrivado(emailNormalizado);

    const sheet = DB.usuarios();
    const mapa = DB.map(sheet);
    const obrigatorios = ["ID", "NOME", "EMAIL", "NIVEL", "ATIVO"];
    const ausentes = obrigatorios.filter(campo => mapa[campo] === undefined);
    if (ausentes.length) {
      throw new Error("Aba USUARIOS inválida. Cabeçalhos ausentes: " + ausentes.join(", ") + ".");
    }

    const linhas = DB.read(sheet).filter(item =>
      normalizarEmail(item[mapa.EMAIL - 1]) === emailNormalizado
    );
    if (!linhas.length) return base;

    // Em bases migradas pode existir uma linha antiga/inativa duplicada. A linha
    // ativa com nível válido deve prevalecer, sem tornar a ordem física da aba
    // um fator de autenticação.
    const linha = linhas.find(item => {
      const nivelItem = Number(item[mapa.NIVEL - 1]);
      return paraBoolean(item[mapa.ATIVO - 1]) &&
        (nivelItem === CONFIG.NIVEIS.GESTOR_CONTEUDO || nivelItem === CONFIG.NIVEIS.GESTOR_SISTEMA);
    }) || linhas[0];

    const id = textoSeguro(linha[mapa.ID - 1]);
    const nome = textoSeguro(linha[mapa.NOME - 1]) || emailNormalizado.split("@")[0];
    const nivel = Number(linha[mapa.NIVEL - 1]);
    const ativo = paraBoolean(linha[mapa.ATIVO - 1]);
    const perfil = CONFIG.NIVEIS.POR_NIVEL[String(nivel)] || CONFIG.PERFIS.USUARIO_CONSULTA;
    const nivelValido = nivel === CONFIG.NIVEIS.GESTOR_CONTEUDO || nivel === CONFIG.NIVEIS.GESTOR_SISTEMA;

    if (!ativo || !nivelValido) {
      return Object.assign(base, {
        id: id,
        nome: nome,
        nivel: nivelValido ? nivel : null,
        cadastrado: true,
        ativo: false,
        podeSolicitarAcesso: false,
        estadoAcesso: !ativo ? "CONTA_DESATIVADA" : "NIVEL_INVALIDO"
      });
    }

    const escopo = nivel === CONFIG.NIVEIS.GESTOR_CONTEUDO
      ? this.obterEscopoUnidades(id)
      : { ids: [], unidades: [] };

    return {
      id: id,
      email: emailNormalizado,
      nome: nome,
      nivel: nivel,
      perfil: perfil,
      logado: true,
      ativo: true,
      cadastrado: true,
      identificado: true,
      contexto: CONFIG.AUTH.MODO_PRIVADO,
      estadoAcesso: "AUTORIZADO",
      podeSolicitarAcesso: nivel === CONFIG.NIVEIS.GESTOR_CONTEUDO,
      unidadeIds: escopo.ids,
      unidades: escopo.unidades,
      comarcas: Array.from(new Set(escopo.unidades.map(item => item.municipio).filter(Boolean)))
    };
  }

  obterEscopoUnidades(usuarioId) {
    const sheetAcessos = DB.acessosUnidadesOuNulo();
    if (!sheetAcessos) return { ids: [], unidades: [] };
    const mapaA = DB.map(sheetAcessos);
    if (mapaA.USUARIO_ID === undefined || mapaA.UNIDADE_ID === undefined || mapaA.ATIVO === undefined) {
      throw new Error("Aba ACESSOS_UNIDADES inválida.");
    }

    const ids = DB.read(sheetAcessos)
      .filter(linha =>
        textoSeguro(linha[mapaA.USUARIO_ID - 1]) === textoSeguro(usuarioId) &&
        paraBoolean(linha[mapaA.ATIVO - 1])
      )
      .map(linha => textoSeguro(linha[mapaA.UNIDADE_ID - 1]))
      .filter(Boolean);
    const unicos = Array.from(new Set(ids));

    const sheetUnidades = DB.unidadesOrganizacionaisOuNulo();
    if (!sheetUnidades) return { ids: unicos, unidades: unicos.map(id => ({ id: id, nome: id })) };
    const mapaU = DB.map(sheetUnidades);
    const sheetForuns = DB.forumOuNulo();
    const mapaF = sheetForuns ? DB.map(sheetForuns) : null;
    const foruns = {};
    if (sheetForuns) DB.read(sheetForuns).forEach(function(linha) {
      const id = textoSeguro(linha[mapaF.ID - 1]);
      foruns[id] = {
        nome: mapaF.NOME ? textoSeguro(linha[mapaF.NOME - 1]) : "",
        municipioId: mapaF.MUNICIPIO_ID ? textoSeguro(linha[mapaF.MUNICIPIO_ID - 1]) : ""
      };
    });
    const sheetMunicipios = DB.municipiosOuNulo();
    const mapaM = sheetMunicipios ? DB.map(sheetMunicipios) : null;
    const municipios = {};
    if (sheetMunicipios) DB.read(sheetMunicipios).forEach(function(linha) {
      municipios[textoSeguro(linha[mapaM.ID - 1])] = textoSeguro(linha[mapaM.NOME - 1]);
    });

    const nos = _fcIndiceOrganizacional();
    const unidades = DB.read(sheetUnidades)
      .filter(linha => unicos.includes(textoSeguro(linha[mapaU.ID - 1])))
      .map(function(linha) {
        const id = textoSeguro(linha[mapaU.ID - 1]);
        const forumId = mapaU.FORUM_ID ? textoSeguro(linha[mapaU.FORUM_ID - 1]) : "";
        const forum = foruns[forumId] || {};
        const caminho = id && nos[id] ? _fcResolverAncestros(nos, id) : [];
        return {
          id: id,
          nome: textoSeguro(linha[mapaU.NOME - 1]) || id,
          caminho: caminho.map(function(no) { return no.nome; }),
          caminhoTexto: caminho.map(function(no) { return no.nome; }).join(" › "),
          forumId: forumId,
          forum: forum.nome || "",
          municipio: municipios[forum.municipioId] || ""
        };
      });
    return { ids: unicos, unidades: unidades };
  }

  perfilAtual() {
    return this.usuarioAtual().perfil;
  }

  exigirPermissao(permissao) {
    const publicas = [CONFIG.PERMISSOES.VISUALIZAR, CONFIG.PERMISSOES.PESQUISAR];
    if (publicas.includes(permissao)) return true;
    AuthService.exigirContextoPrivado();
    const usuario = this.usuarioAtual();
    if (!usuario.logado || !usuario.ativo) {
      throw new Error("Acesso administrativo não autorizado.");
    }
    return true;
  }

  exigirPerfil(perfilNecessario) {
    AuthService.exigirContextoPrivado();
    const usuario = this.usuarioAtual();
    if (!usuario.logado || !usuario.ativo) throw new Error("É necessário acesso administrativo ativo.");
    if (usuario.perfil !== perfilNecessario) {
      throw new Error("Acesso permitido somente para " + perfilNecessario + ".");
    }
    return true;
  }

  exigirPermissaoUnidade(unidadeId) {
    this.exigirPermissao(CONFIG.PERMISSOES.EDITAR);
    const usuario = this.usuarioAtual();
    if (usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA) return true;
    const id = textoSeguro(unidadeId);
    if (!id || !usuario.unidadeIds.includes(id)) {
      throw new Error("Seu perfil não possui vínculo ativo com esta Unidade.");
    }
    return true;
  }

  exigirPermissaoComarca(unidadeId) {
    return this.exigirPermissaoUnidade(unidadeId);
  }

  static salvarSessao() {
    return true;
  }

  static limparSessao() {
    return true;
  }
}

AuthService.prototype.criarNotificacao = function(destinatarioEmail, tipo, mensagem, referencia) {
  return criarNotificacao(destinatarioEmail, tipo, mensagem, referencia);
};
AuthService.prototype.listarNotificacoes = function(email) {
  return listarNotificacoes(email);
};
AuthService.prototype.marcarNotificacaoLida = function(id) {
  return marcarNotificacaoLida(id);
};
AuthService.prototype.marcarTodasLidas = function(email) {
  return marcarTodasLidas(email);
};
AuthService.prototype.contarNaoLidas = function(email) {
  return contarNaoLidas(email);
};
