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
  const idsV5 = new Set(_cgIdsAba(v5));

  // A árvore V5 é a fonte operacional. As abas legadas possuem outro espaço
  // de IDs e não podem disparar migração durante login, consulta ou navegação.
  if (v5 && idsV5.size > 0) return false;
  return _cgIdsAba(DB.unidadesOuNulo()).length > 0 ||
    _cgIdsAba(DB.setoresOuNulo()).length > 0;
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

  const v5 = DB.unidadesOrganizacionaisOuNulo();
  const precisaSincronizar = _cgPrecisaSincronizarV5();

  if (precisaSincronizar) {
    throw new Error(
      "A hierarquia V5 ainda não foi criada. Execute explicitamente " +
      "migrarHierarquiaOrganizacionalV5() no ambiente privado e valide os dados antes de publicar."
    );
  }

  if (!v5) {
    throw new Error(
      "A aba " + CONFIG.SHEETS.UNIDADES_ORGANIZACIONAIS +
      " não existe e não há dados legados suficientes para reconstruí-la."
    );
  }

  return {
    fonte: "V5",
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
    throw new Error("Seu perfil não possui acesso de edição a este Fórum ou Unidade.");
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

  if (!idxEndereco) throw new Error("A estrutura selecionada não possui coluna ENDERECO.");
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

    if (!localidadeId) throw new Error("Fórum, Órgão ou Unidade não informado.");

    let atualizado = false;
    if (tipoNormalizado === "MUNICIPIO" || tipoNormalizado === "ORGAO") {
      _cgExigirGerencia(usuario, "", "");
      atualizado = _cgAtualizarEnderecoNaAba(DB.municipios(), localidadeId, endereco, cep);
    } else if (tipoNormalizado === CONFIG.ACESSOS.FORUM) {
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
      throw new Error("Tipo de estrutura inválido.");
    }

    if (!atualizado) throw new Error("Não foi possível localizar a linha da estrutura para atualização.");
    try { CACHE.limparTudo(); } catch (e) {}
    try { registrarInfoAPI("ATUALIZAR_ENDERECO", tipoNormalizado + ":" + localidadeId); } catch (e) {}
    return respostaSucesso({ tipo: tipoNormalizado, id: localidadeId, endereco: endereco, cep: cep });
  });
}

function pjesCriarLocalidadeOrganizacional(dados) {
  return _cgExecutar("PJES_CRIAR_LOCALIDADE", function() {
    new AuthService().exigirPermissao(CONFIG.PERMISSOES.EDITAR);
    const usuario = new AuthService().usuarioAtual();
    const entrada = ehObjeto(dados) ? dados : {};
    let forumId = textoSeguro(valorObjeto(entrada, "forumId", "FORUM_ID"));
    let municipioId = textoSeguro(valorObjeto(entrada, "municipioId", "MUNICIPIO_ID"));
    const paiId = textoSeguro(valorObjeto(entrada, "paiId", "PAI_ID"));
    const tipo = normalizarChave(valorObjeto(entrada, "tipo", "TIPO"));
    const nome = textoSeguro(valorObjeto(entrada, "nome", "NOME"));
    const endereco = textoSeguro(valorObjeto(entrada, "endereco", "ENDERECO"));
    const cep = textoSeguro(valorObjeto(entrada, "cep", "CEP"));

    if (!nome) throw new Error("Nome é obrigatório.");
    if (["UNIDADE", "SETOR"].indexOf(tipo) === -1) throw new Error("Tipo de estrutura inválido.");
    if (tipo === "UNIDADE" && paiId) throw new Error("Uma nova Unidade deve ser vinculada diretamente ao Fórum ou Órgão.");
    if (tipo === "SETOR" && !paiId) throw new Error("Informe a Unidade pai do novo Setor.");
    const nosIniciais = _fcIndiceOrganizacional();
    if (paiId && nosIniciais[paiId]) {
      forumId = forumId || nosIniciais[paiId].forumId;
      municipioId = municipioId || nosIniciais[paiId].municipioId;
    }
    if (!forumId && !municipioId) throw new Error("Fórum ou Órgão é obrigatório.");
    if (forumId && municipioId) throw new Error("A Unidade deve pertencer a um Fórum ou a um Órgão, não a ambos.");
    _cgExigirGerencia(usuario, forumId, paiId);

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      _cgExigirGerencia(new AuthService().usuarioAtual(), forumId, paiId);
      const nos = _fcIndiceOrganizacional();
      if (paiId && (!nos[paiId] || nos[paiId].forumId !== forumId || nos[paiId].municipioId !== municipioId)) {
        throw new Error("A estrutura pai não pertence ao Fórum ou Órgão informado.");
      }
      const duplicadoId = Object.keys(nos).find(function(id) {
        const no = nos[id];
        return no.forumId === forumId && no.municipioId === municipioId && no.paiId === paiId &&
          no.tipo === tipo && no.ativo && limparTexto(no.nome) === limparTexto(nome);
      });
      if (duplicadoId) {
        return respostaSucesso({
          id: duplicadoId,
          forumId: forumId,
          municipioId: municipioId,
          paiId: paiId,
          tipo: tipo,
          nome: nos[duplicadoId].nome,
          existente: true
        });
      }

      const sheet = DB.unidadesOrganizacionais();
      const headers = DB.headers(sheet);
      const id = new IdService().gerarId(tipo === "SETOR" ? "SET" : "UNI");
      const ultimaLinha = sheet.getLastRow();
      const linha = headers.map(function(header) {
        const chave = normalizarChave(header);
        if (chave === "ID") return id;
        if (chave === "FORUMID") return forumId;
        if (chave === "MUNICIPIOID") return municipioId;
        if (chave === "PAIID") return paiId;
        if (chave === "TIPO") return tipo;
        if (chave === "NOME") return nome;
        if (chave === "ENDERECO") return endereco;
        if (chave === "CEP") return cep;
        if (chave === "SELECIONAVELACESSO") return tipo === "UNIDADE";
        if (chave === "ATIVO") return true;
        if (chave === "ORDEM") return ultimaLinha;
        return "";
      });
      sheet.getRange(ultimaLinha + 1, 1, 1, linha.length).setValues([linha]);
      try { CACHE.limparTudo(); } catch (e) {}
      return respostaSucesso({ id: id, forumId: forumId, municipioId: municipioId, paiId: paiId, tipo: tipo, nome: nome });
    } finally {
      lock.releaseLock();
    }
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
