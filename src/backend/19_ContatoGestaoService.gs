/**
 * ==========================================================
 * GESTÃO DE CONTATOS — PERMISSÕES, ENDEREÇOS E COMPATIBILIDADE
 * ==========================================================
 *
 * Centraliza os caminhos usados pela interface nova. O objetivo é manter a
 * arquitetura V5 como fonte operacional e, na implantação privada, concluir
 * de forma idempotente a migração V4 quando a planilha ainda estiver parcial.
 */

function _cgIdsAba(sheet) {
  if (!sheet) return [];
  const mapa = DB.map(sheet);
  const idx = mapa.ID;
  if (!idx) return [];
  return DB.read(sheet)
    .map(function(linha) { return textoSeguro(linha[idx - 1]); })
    .filter(Boolean);
}

function _cgPrecisaSincronizarV5() {
  const v5 = DB.unidadesOrganizacionaisOuNulo();
  const unidades = DB.unidadesOuNulo();
  const setores = DB.setoresOuNulo();
  const idsV5 = new Set(_cgIdsAba(v5));
  const idsLegado = _cgIdsAba(unidades).concat(_cgIdsAba(setores));

  if (!v5) return idsLegado.length > 0;
  if (idsLegado.some(function(id) { return !idsV5.has(id); })) return true;

  const contatos = DB.contatosOuNulo();
  if (!contatos) return false;
  const mapa = DB.map(contatos);
  const idxNo = mapa.UNIDADEORGANIZACIONALID;
  const idxUnidade = mapa.UNIDADEID;
  const idxSetor = mapa.SETORID;
  if (!idxNo && (idxUnidade || idxSetor)) return true;
  if (!idxNo) return false;

  return DB.read(contatos).some(function(linha) {
    const noId = textoSeguro(linha[idxNo - 1]);
    const legado = textoSeguro(idxSetor ? linha[idxSetor - 1] : "") ||
      textoSeguro(idxUnidade ? linha[idxUnidade - 1] : "");
    return !noId && !!legado;
  });
}

function _cgValidarAbasBasicas() {
  const ausentes = [];
  if (!DB.municipiosOuNulo()) ausentes.push(CONFIG.SHEETS.MUNICIPIOS);
  if (!DB.forumOuNulo()) ausentes.push(CONFIG.SHEETS.FORUM);
  if (!DB.contatosOuNulo()) ausentes.push(CONFIG.SHEETS.CONTATOS);
  if (ausentes.length) {
    throw new Error("Modelo de dados incompleto. Abas ausentes: " + ausentes.join(", ") + ".");
  }
}

function _cgGarantirModeloOperacional() {
  _cgValidarAbasBasicas();

  let v5 = DB.unidadesOrganizacionaisOuNulo();
  const possuiLegado = _cgIdsAba(DB.unidadesOuNulo()).length > 0 ||
    _cgIdsAba(DB.setoresOuNulo()).length > 0;
  const precisaSincronizar = _cgPrecisaSincronizarV5();

  if (precisaSincronizar && possuiLegado) {
    if (!AuthService.ehContextoPrivado()) {
      throw new Error(
        "A base pública ainda não recebeu a hierarquia organizacional V5. " +
        "Abra a implantação administrativa para concluir a sincronização e publique novamente os dados."
      );
    }

    const lock = LockService.getScriptLock();
    let bloqueado = false;
    try {
      lock.waitLock(30000);
      bloqueado = true;
      if (_cgPrecisaSincronizarV5()) migrarHierarquiaOrganizacionalV5();
    } finally {
      if (bloqueado) lock.releaseLock();
    }
    v5 = DB.unidadesOrganizacionaisOuNulo();
  }

  if (!v5) {
    throw new Error(
      "A aba " + CONFIG.SHEETS.UNIDADES_ORGANIZACIONAIS +
      " não existe e não há dados legados suficientes para reconstruí-la."
    );
  }

  return {
    fonte: precisaSincronizar && possuiLegado ? "V5_SINCRONIZADA" : "V5",
    nos: _cgIdsAba(v5).length,
    contatos: DB.count(DB.contatos())
  };
}

function _cgUsuarioAtual() {
  _cgGarantirModeloOperacional();
  return new AuthService().usuarioAtual();
}

function _cgAcessoForumExplicito(usuario, forumId) {
  const id = textoSeguro(forumId);
  return !!id && Array.isArray(usuario && usuario.acessos) && usuario.acessos.some(function(acesso) {
    return normalizarChave(acesso.tipo) === CONFIG.ACESSOS.FORUM && textoSeguro(acesso.id) === id;
  });
}

function _cgPodeGerenciar(usuario, forumId, noId) {
  if (!usuario || usuario.logado !== true || usuario.ativo !== true) return false;
  if (usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA) return true;
  if (usuario.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO) return false;

  const idNo = textoSeguro(noId);
  if (idNo) {
    return Array.isArray(usuario.unidadeIds) && usuario.unidadeIds.map(textoSeguro).includes(idNo);
  }

  return _cgAcessoForumExplicito(usuario, forumId);
}

function _cgExigirGerencia(usuario, forumId, noId) {
  if (!_cgPodeGerenciar(usuario, forumId, noId)) {
    throw new Error("Seu perfil não possui acesso de edição a esta localidade.");
  }
  return true;
}

function _cgExecutar(nome, fn) {
  try {
    _cgGarantirModeloOperacional();
    return fn();
  } catch (erro) {
    try { registrarErroAPI(nome, erro); } catch (e) {}
    return respostaErro(erro);
  }
}

function pjesObterUsuarioAtual() {
  return _cgExecutar("PJES_OBTER_USUARIO", function() {
    return respostaSucesso(new AuthService().usuarioAtual());
  });
}

function pjesListarContatos() {
  return _cgExecutar("PJES_LISTAR_CONTATOS", function() {
    return v4ListarContatos();
  });
}

function pjesPesquisarContatos(texto) {
  return _cgExecutar("PJES_PESQUISAR_CONTATOS", function() {
    return v4PesquisarContatos(texto || "");
  });
}

function pjesCarregarDashboard() {
  return _cgExecutar("PJES_DASHBOARD", function() {
    return v4CarregarDashboard();
  });
}

function pjesObterHierarquiaContatos(termo) {
  return _cgExecutar("PJES_HIERARQUIA_CONTATOS", function() {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
    const dados = listarHierarquiaContatos(termo || "");
    return respostaSucesso(dados);
  });
}

function pjesPesquisarHierarquiaContatos(termo) {
  return _cgExecutar("PJES_PESQUISAR_HIERARQUIA", function() {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.PESQUISAR);
    const valor = termo === null || termo === undefined ? "" : String(termo);
    if (valor.trim() && limparTexto(valor).length < CONFIG.LIMITES.TAMANHO_PESQUISA) {
      return respostaSucesso({ sucesso: true, municipios: [] });
    }
    return respostaSucesso(pesquisarHierarquiaContatos(valor));
  });
}

function pjesCriarContato(dados) {
  return _cgExecutar("PJES_CRIAR_CONTATO", function() {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.EDITAR);
    const usuario = new AuthService().usuarioAtual();
    const contexto = _v4ResolverContexto(ehObjeto(dados) ? dados : {});
    _cgExigirGerencia(usuario, contexto.forumId, contexto.noId);
    return v4CriarContato(dados);
  });
}

function pjesAtualizarContato(id, dados) {
  return _cgExecutar("PJES_ATUALIZAR_CONTATO", function() {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.EDITAR);
    const usuario = new AuthService().usuarioAtual();
    const atual = v4ObterContato(id);
    const registro = atual && atual.sucesso === true ? atual.dados : null;
    if (!registro) throw new Error("Contato não encontrado.");

    _cgExigirGerencia(usuario, registro.forumId, registro.noId);
    const contextoNovo = _v4ResolverContexto(Object.assign({}, registro, ehObjeto(dados) ? dados : {}));
    _cgExigirGerencia(usuario, contextoNovo.forumId, contextoNovo.noId);
    return v4AtualizarContato(id, dados);
  });
}

function pjesExcluirContato(id) {
  return _cgExecutar("PJES_EXCLUIR_CONTATO", function() {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.EXCLUIR);
    const usuario = new AuthService().usuarioAtual();
    const atual = v4ObterContato(id);
    const registro = atual && atual.sucesso === true ? atual.dados : null;
    if (!registro) throw new Error("Contato não encontrado.");
    _cgExigirGerencia(usuario, registro.forumId, registro.noId);
    return v4ExcluirContato(id);
  });
}

function _cgEncontrarLinhaPorId(sheet, id) {
  if (!sheet) return null;
  const mapa = DB.map(sheet);
  const idx = mapa.ID;
  if (!idx) return null;
  const linhas = DB.read(sheet);
  const posicao = linhas.findIndex(function(linha) {
    return textoSeguro(linha[idx - 1]) === textoSeguro(id);
  });
  if (posicao < 0) return null;
  return { mapa: mapa, linha: linhas[posicao], numeroLinha: posicao + 2 };
}

function _cgAtualizarEnderecoNaAba(sheet, id, endereco, cep) {
  const encontrado = _cgEncontrarLinhaPorId(sheet, id);
  if (!encontrado) return false;
  const mapa = encontrado.mapa;
  const linha = encontrado.linha.slice();
  const idxEndereco = mapa.ENDERECO;
  const idxCep = mapa.CEP;
  const idxAtualizacao = mapa.DATAATUALIZACAO;

  if (!idxEndereco) throw new Error("A localidade selecionada não possui coluna ENDERECO.");
  linha[idxEndereco - 1] = endereco;
  if (idxCep) linha[idxCep - 1] = cep;
  if (idxAtualizacao) linha[idxAtualizacao - 1] = new Date();
  sheet.getRange(encontrado.numeroLinha, 1, 1, linha.length).setValues([linha]);
  return true;
}

function pjesAtualizarEnderecoLocalidade(tipo, id, dados) {
  return _cgExecutar("PJES_ATUALIZAR_ENDERECO", function() {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.EDITAR);
    const usuario = new AuthService().usuarioAtual();
    const tipoNormalizado = normalizarChave(tipo);
    const localidadeId = textoSeguro(id);
    const entrada = ehObjeto(dados) ? dados : {};
    const endereco = textoSeguro(valorObjeto(entrada, "endereco", "ENDERECO", "endereço", "ENDEREÇO"));
    const cep = textoSeguro(valorObjeto(entrada, "cep", "CEP"));

    if (!localidadeId) throw new Error("Localidade não informada.");

    let atualizado = false;
    if (tipoNormalizado === CONFIG.ACESSOS.FORUM) {
      _cgExigirGerencia(usuario, localidadeId, "");
      atualizado = _cgAtualizarEnderecoNaAba(DB.forum(), localidadeId, endereco, cep);
    } else if (tipoNormalizado === CONFIG.ACESSOS.UNIDADE) {
      const nos = _fcIndiceOrganizacional();
      const no = nos[localidadeId];
      if (!no) throw new Error("Unidade organizacional não encontrada.");
      _cgExigirGerencia(usuario, no.forumId, localidadeId);

      atualizado = _cgAtualizarEnderecoNaAba(DB.unidadesOrganizacionaisOuNulo(), localidadeId, endereco, cep);
      if (!atualizado) atualizado = _cgAtualizarEnderecoNaAba(DB.unidadesOuNulo(), localidadeId, endereco, cep);
      if (!atualizado) atualizado = _cgAtualizarEnderecoNaAba(DB.setoresOuNulo(), localidadeId, endereco, cep);
    } else {
      throw new Error("Tipo de localidade inválido.");
    }

    if (!atualizado) throw new Error("Não foi possível localizar a linha da localidade para atualização.");
    try { CACHE.limparTudo(); } catch (e) {}
    try { registrarInfoAPI("ATUALIZAR_ENDERECO", tipoNormalizado + ":" + localidadeId); } catch (e) {}
    return respostaSucesso({ tipo: tipoNormalizado, id: localidadeId, endereco: endereco, cep: cep });
  });
}

function pjesDiagnosticarDadosContatos() {
  return _cgExecutar("PJES_DIAGNOSTICO_CONTATOS", function() {
    new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
    const modelo = _cgGarantirModeloOperacional();
    const hierarquia = construirHierarquiaForumContatos({});
    const municipios = hierarquia.municipios || [];
    const contatosHierarquia = municipios.reduce(function(total, municipio) {
      return total + Number(municipio.qtdContatos || 0);
    }, 0);
    return respostaSucesso({
      modelo: modelo,
      municipios: municipios.length,
      foruns: municipios.reduce(function(total, municipio) { return total + Number(municipio.qtdForuns || 0); }, 0),
      unidades: municipios.reduce(function(total, municipio) { return total + Number(municipio.qtdUnidades || 0); }, 0),
      contatosNaAba: DB.count(DB.contatos()),
      contatosNaHierarquia: contatosHierarquia
    });
  });
}
