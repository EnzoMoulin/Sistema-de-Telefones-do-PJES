/**
 * ==========================================================
 * SERVIÇO V5 — HIERARQUIA ORGANIZACIONAL DINÂMICA
 * ==========================================================
 *
 * MUNICIPIOS -> FORUM -> UNIDADES_ORGANIZACIONAIS (árvore) -> CONTATOS.
 * A planilha é lida em blocos e a árvore é montada em memória por mapas
 * de adjacência. Não existem leituras N+1 nem profundidade de negócio fixa.
 */

function _fcCampo(mapa, linha, nomes, padrao) {
  const lista = Array.isArray(nomes) ? nomes : [nomes];
  for (const nome of lista) {
    const idx = mapa[normalizarChave(nome)];
    if (idx !== undefined) return linha[idx - 1];
  }
  return padrao === undefined ? "" : padrao;
}

function _fcTexto(valor) { return textoSeguro(valor); }

/** Retorna o primeiro campo existente que também possua valor. */
function _fcPrimeiroValor(mapa, linha, nomes) {
  const lista = Array.isArray(nomes) ? nomes : [nomes];
  for (const nome of lista) {
    const valor = _fcTexto(_fcCampo(mapa, linha, [nome], ""));
    if (valor) return valor;
  }
  return "";
}

function _fcOrdem(valor, fallback) {
  const s = _fcTexto(valor);
  if (!s) return { tipo: 2, valor: fallback };
  const n = Number(s.replace(",", "."));
  if (Number.isFinite(n)) return { tipo: 0, valor: n };
  return { tipo: 1, valor: s.toLocaleUpperCase("pt-BR") };
}

function _fcComparar(a, b) {
  const aa = a.__ordem;
  const bb = b.__ordem;
  if (aa.tipo !== bb.tipo) return aa.tipo - bb.tipo;
  if (aa.valor < bb.valor) return -1;
  if (aa.valor > bb.valor) return 1;
  return (a.__indice || 0) - (b.__indice || 0);
}

function _fcOrdenar(lista) {
  return (Array.isArray(lista) ? lista : []).slice().sort(_fcComparar);
}

function _fcLerAba(sheet) {
  if (!sheet) return [];
  const mapa = DB.map(sheet);
  return DB.read(sheet).map(function(linha, indice) {
    return { linha: linha, mapa: mapa, indice: indice };
  });
}

function _fcContatoPublico(c) {
  return {
    id: c.id,
    forumId: c.forumId,
    unidadeOrganizacionalId: c.noId,
    tipo: c.tipo,
    descricao: c.descricao,
    valor: c.valor,
    observacao: c.observacao,
    dataCriacao: c.dataCriacao,
    dataAtualizacao: c.dataAtualizacao,
    ativo: c.ativo,
    ordem: c.ordem
  };
}

function _fcTipoNo(valor) {
  return normalizarChave(valor || "GENERICO") || "GENERICO";
}

function _fcIndiceOrganizacional() {
  const sheet = DB.unidadesOrganizacionais();
  const mapa = DB.map(sheet);
  const nos = {};
  DB.read(sheet).forEach(function(linha, indice) {
    const id = _fcTexto(_fcCampo(mapa, linha, ["ID"]));
    if (!id) return;
    nos[id] = {
      id: id,
      forumId: _fcTexto(_fcCampo(mapa, linha, ["FORUM_ID"])),
      paiId: _fcTexto(_fcCampo(mapa, linha, ["PAI_ID"])),
      tipo: _fcTipoNo(_fcCampo(mapa, linha, ["TIPO"], "GENERICO")),
      nome: _fcTexto(_fcCampo(mapa, linha, ["NOME"])),
      endereco: _fcTexto(_fcCampo(mapa, linha, ["ENDERECO", "ENDEREÇO"])),
      cep: _fcTexto(_fcCampo(mapa, linha, ["CEP"])),
      observacao: _fcTexto(_fcCampo(mapa, linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      selecionavelAcesso: paraBoolean(_fcCampo(mapa, linha, ["SELECIONAVEL_ACESSO"], false)),
      ativo: paraBoolean(_fcCampo(mapa, linha, ["ATIVO"], true)),
      ordem: _fcCampo(mapa, linha, ["ORDEM"], indice + 1),
      __ordem: _fcOrdem(_fcCampo(mapa, linha, ["ORDEM"]), indice),
      __indice: indice,
      filhos: [],
      contatos: []
    };
  });
  return nos;
}

function _fcValidarArvore(nos, foruns) {
  const erros = [];
  Object.keys(nos).forEach(function(id) {
    const no = nos[id];
    if (!foruns[no.forumId]) erros.push("Nó " + id + " aponta para Fórum inexistente.");
    if (no.paiId && !nos[no.paiId]) erros.push("Nó " + id + " aponta para pai inexistente: " + no.paiId);
    if (no.paiId && nos[no.paiId] && nos[no.paiId].forumId !== no.forumId) erros.push("Nó " + id + " e seu pai pertencem a Fóruns diferentes.");
    const vistos = new Set();
    let atual = no;
    let profundidade = 0;
    while (atual && atual.paiId) {
      if (vistos.has(atual.id)) { erros.push("Ciclo hierárquico envolvendo o nó " + id + "."); break; }
      vistos.add(atual.id);
      atual = nos[atual.paiId];
      profundidade++;
      if (profundidade > 50) { erros.push("A árvore excede o limite de segurança de 50 níveis no nó " + id + "."); break; }
    }
  });
  if (erros.length) throw new Error(Array.from(new Set(erros)).slice(0, 10).join(" "));
}

function _fcResolverAncestros(nos, noId) {
  const caminho = [];
  const vistos = new Set();
  let atual = nos[noId] || null;
  while (atual) {
    if (vistos.has(atual.id)) throw new Error("Ciclo hierárquico envolvendo o nó " + noId + ".");
    vistos.add(atual.id);
    caminho.unshift(atual);
    atual = atual.paiId ? nos[atual.paiId] : null;
    if (caminho.length > 50) throw new Error("A árvore excede o limite de segurança de 50 níveis.");
  }
  return caminho;
}

function _fcAncoraAcesso(nos, noId) {
  const caminho = _fcResolverAncestros(nos, noId);
  for (let i = caminho.length - 1; i >= 0; i--) {
    if (caminho[i].selecionavelAcesso) return caminho[i];
  }
  return caminho.length ? caminho[0] : null;
}

function _fcSerializarNo(no, ancestrais, forum) {
  const caminho = ancestrais.concat([no]);
  let ancoraAcesso = null;
  for (let i = caminho.length - 1; i >= 0; i--) {
    if (caminho[i].selecionavelAcesso) { ancoraAcesso = caminho[i]; break; }
  }
  if (!ancoraAcesso && caminho.length) ancoraAcesso = caminho[0];
  const pai = ancestrais.length ? ancestrais[ancestrais.length - 1] : null;
  const enderecoExibicao = no.endereco || (pai ? pai.enderecoExibicao : "") || forum.endereco || "";
  const cepExibicao = no.cep || (pai ? pai.cepExibicao : "") || forum.cep || "";
  const atual = Object.assign({}, no, { enderecoExibicao: enderecoExibicao, cepExibicao: cepExibicao });
  const filhos = _fcOrdenar(no.filhos).filter(function(filho) { return filho.ativo; }).map(function(filho) {
    return _fcSerializarNo(filho, ancestrais.concat([atual]), forum);
  });
  return {
    id: no.id,
    forumId: no.forumId,
    paiId: no.paiId,
    tipo: no.tipo,
    nome: no.nome,
    endereco: no.endereco,
    cep: no.cep,
    enderecoExibicao: enderecoExibicao,
    cepExibicao: cepExibicao,
    observacao: no.observacao,
    selecionavelAcesso: no.selecionavelAcesso,
    nivel: caminho.length,
    caminhoIds: caminho.map(function(item) { return item.id; }),
    caminhoNomes: caminho.map(function(item) { return item.nome; }),
    ancoraAcessoId: ancoraAcesso ? ancoraAcesso.id : "",
    ancoraAcessoNome: ancoraAcesso ? ancoraAcesso.nome : "",
    contatos: _fcOrdenar(no.contatos).map(_fcContatoPublico),
    filhos: filhos,
    qtdFilhos: filhos.length,
    qtdNos: 1 + filhos.reduce(function(total, filho) { return total + filho.qtdNos; }, 0),
    qtdContatos: no.contatos.length + filhos.reduce(function(total, filho) { return total + filho.qtdContatos; }, 0)
  };
}

function _fcTextoContatoBusca(contato) {
  return limparTexto([contato.tipo, contato.descricao, contato.valor, contato.observacao, contato.id].join(" "));
}

function _fcFiltrarNo(no, termo, ancestrais) {
  const caminho = ancestrais.concat([no]);
  const proprio = limparTexto([
    no.nome, no.tipo, no.observacao, no.endereco, no.cep, no.id,
    caminho.map(function(item) { return item.nome; }).join(" ")
  ].join(" ")).includes(termo);
  const contatos = no.contatos.filter(function(contato) { return _fcTextoContatoBusca(contato).includes(termo); });
  const filhos = no.filhos.map(function(filho) { return _fcFiltrarNo(filho, termo, caminho); }).filter(Boolean);
  if (!proprio && !contatos.length && !filhos.length) return null;
  if (proprio) return no;
  return Object.assign({}, no, { contatos: contatos, filhos: filhos });
}

function construirHierarquiaForumContatos(opcoes) {
  const cfg = ehObjeto(opcoes) ? opcoes : {};
  const termo = limparTexto(cfg.termo || "");
  const shMun = DB.municipiosOuNulo();
  const shForum = DB.forumOuNulo();
  const shNos = DB.unidadesOrganizacionaisOuNulo();
  const shContatos = DB.contatosOuNulo();
  if (!shMun || !shForum || !shNos || !shContatos) {
    throw new Error("Modelo incompleto. Execute instalarSistemaForum() para criar MUNICIPIOS, FORUM, UNIDADES_ORGANIZACIONAIS e CONTATOS.");
  }

  const municipios = {};
  const foruns = {};
  const nos = _fcIndiceOrganizacional();

  _fcLerAba(shMun).forEach(function(item) {
    const id = _fcTexto(_fcCampo(item.mapa, item.linha, ["ID", "MUNICIPIO_ID"]));
    if (!id) return;
    municipios[id] = {
      id: id,
      nome: _fcTexto(_fcCampo(item.mapa, item.linha, ["NOME", "MUNICIPIO"])),
      codigoIbge: _fcTexto(_fcCampo(item.mapa, item.linha, ["CODIGO_IBGE", "IBGE"])),
      microrregiao: _fcTexto(_fcCampo(item.mapa, item.linha, ["MICRORREGIAO", "MICRORREGIÃO"])),
      ativo: paraBoolean(_fcCampo(item.mapa, item.linha, ["ATIVO"], true)),
      __ordem: _fcOrdem(_fcCampo(item.mapa, item.linha, ["ORDEM"]), item.indice),
      __indice: item.indice,
      foruns: []
    };
  });

  _fcLerAba(shForum).forEach(function(item) {
    const id = _fcTexto(_fcCampo(item.mapa, item.linha, ["ID", "FORUM_ID"]));
    if (!id) return;
    foruns[id] = {
      id: id,
      municipioId: _fcTexto(_fcCampo(item.mapa, item.linha, ["MUNICIPIO_ID"])),
      nome: _fcTexto(_fcCampo(item.mapa, item.linha, ["NOME", "FORUM"])),
      endereco: _fcTexto(_fcCampo(item.mapa, item.linha, ["ENDERECO", "ENDEREÇO"])),
      cep: _fcTexto(_fcCampo(item.mapa, item.linha, ["CEP"])),
      email: _fcTexto(_fcCampo(item.mapa, item.linha, ["EMAIL", "E-MAIL"])),
      observacao: _fcTexto(_fcCampo(item.mapa, item.linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      ativo: paraBoolean(_fcCampo(item.mapa, item.linha, ["ATIVO"], true)),
      __ordem: _fcOrdem(_fcCampo(item.mapa, item.linha, ["ORDEM"]), item.indice),
      __indice: item.indice,
      contatos: [],
      nosRaiz: []
    };
  });

  _fcValidarArvore(nos, foruns);
  Object.keys(nos).forEach(function(id) {
    const no = nos[id];
    if (no.paiId) nos[no.paiId].filhos.push(no);
    else if (foruns[no.forumId]) foruns[no.forumId].nosRaiz.push(no);
  });

  const mapaContatos = DB.map(shContatos);
  DB.read(shContatos).forEach(function(linha, indice) {
    const id = _fcTexto(_fcCampo(mapaContatos, linha, ["ID"]));
    if (!id || !paraBoolean(_fcCampo(mapaContatos, linha, ["ATIVO"], true))) return;
    const candidatosNo = ["UNIDADE_ORGANIZACIONAL_ID", "SETOR_ID", "UNIDADE_ID"]
      .map(function(campo) { return _fcTexto(_fcCampo(mapaContatos, linha, [campo], "")); })
      .filter(Boolean);
    const noId = candidatosNo.find(function(candidato) { return !!nos[candidato]; }) || candidatosNo[0] || "";
    const forumIdInformado = _fcTexto(_fcCampo(mapaContatos, linha, ["FORUM_ID"]));
    const forumId = noId && nos[noId] ? nos[noId].forumId : forumIdInformado;
    const contato = {
      id: id,
      forumId: forumId,
      noId: noId,
      tipo: _fcTexto(_fcCampo(mapaContatos, linha, ["TIPO", "TIPO_CONTATO"])),
      descricao: _fcTexto(_fcCampo(mapaContatos, linha, ["DESCRICAO", "DESCRIÇÃO"])),
      valor: _fcTexto(_fcCampo(mapaContatos, linha, ["VALOR"])),
      observacao: _fcTexto(_fcCampo(mapaContatos, linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      dataCriacao: _fcCampo(mapaContatos, linha, ["DATA_CRIACAO", "DATA"]),
      dataAtualizacao: _fcCampo(mapaContatos, linha, ["DATA_ATUALIZACAO"]),
      ativo: true,
      ordem: _fcCampo(mapaContatos, linha, ["ORDEM"], indice + 1),
      __ordem: _fcOrdem(_fcCampo(mapaContatos, linha, ["ORDEM"]), indice),
      __indice: indice
    };
    if (noId && nos[noId]) nos[noId].contatos.push(contato);
    else if (foruns[forumId]) foruns[forumId].contatos.push(contato);
  });

  Object.keys(foruns).forEach(function(id) {
    const forum = foruns[id];
    const municipio = municipios[forum.municipioId];
    if (municipio) municipio.foruns.push(forum);
  });
  Object.values(municipios).forEach(function(municipio) {
    municipio.foruns = _fcOrdenar(municipio.foruns).filter(function(forum) { return forum.ativo; });
  });

  let listaMunicipios = _fcOrdenar(Object.values(municipios).filter(function(municipio) { return municipio.ativo; }));
  if (termo) {
    listaMunicipios = listaMunicipios.map(function(municipio) {
      const municipioCasa = limparTexto([municipio.nome, municipio.codigoIbge, municipio.microrregiao, municipio.id].join(" ")).includes(termo);
      const copia = Object.assign({}, municipio);
      copia.foruns = municipio.foruns.map(function(forum) {
        const forumCasa = limparTexto([forum.nome, forum.email, forum.endereco, forum.id].join(" ")).includes(termo);
        const contatos = forum.contatos.filter(function(contato) { return _fcTextoContatoBusca(contato).includes(termo); });
        const raizes = forum.nosRaiz.map(function(no) { return _fcFiltrarNo(no, termo, []); }).filter(Boolean);
        if (!municipioCasa && !forumCasa && !contatos.length && !raizes.length) return null;
        return Object.assign({}, forum, {
          contatos: forumCasa || municipioCasa ? forum.contatos : contatos,
          nosRaiz: forumCasa || municipioCasa ? forum.nosRaiz : raizes
        });
      }).filter(Boolean);
      return copia.foruns.length || municipioCasa ? copia : null;
    }).filter(Boolean);
  }

  const retorno = listaMunicipios.map(function(municipio) {
    const forunsPublicos = municipio.foruns.map(function(forum) {
      const nosPublicos = _fcOrdenar(forum.nosRaiz).filter(function(no) { return no.ativo; }).map(function(no) {
        return _fcSerializarNo(no, [], forum);
      });
      const contarSelecionaveis = function(lista) {
        return lista.reduce(function(total, no) {
          return total + (no.selecionavelAcesso ? 1 : 0) + contarSelecionaveis(no.filhos || []);
        }, 0);
      };
      return {
        id: forum.id,
        nome: forum.nome,
        endereco: forum.endereco,
        cep: forum.cep,
        email: forum.email,
        observacao: forum.observacao,
        qtdNos: nosPublicos.reduce(function(total, no) { return total + no.qtdNos; }, 0),
        qtdUnidades: contarSelecionaveis(nosPublicos),
        qtdContatos: forum.contatos.length + nosPublicos.reduce(function(total, no) { return total + no.qtdContatos; }, 0),
        contatos: _fcOrdenar(forum.contatos).map(_fcContatoPublico),
        nos: nosPublicos
      };
    });
    return {
      id: municipio.id,
      nome: municipio.nome,
      codigoIbge: municipio.codigoIbge,
      microrregiao: municipio.microrregiao,
      qtdForuns: forunsPublicos.length,
      qtdNos: forunsPublicos.reduce(function(total, forum) { return total + forum.qtdNos; }, 0),
      qtdUnidades: forunsPublicos.reduce(function(total, forum) { return total + forum.qtdUnidades; }, 0),
      qtdContatos: forunsPublicos.reduce(function(total, forum) { return total + forum.qtdContatos; }, 0),
      foruns: forunsPublicos
    };
  });
  return { sucesso: true, geradoEm: new Date(), municipios: retorno };
}

function listarHierarquiaContatos(termo) {
  const normalizado = limparTexto(termo || "");
  const chaveCache = CONFIG.CACHE.CHAVE_TELEFONES + (normalizado ? ":" + normalizado : "");
  const cache = CACHE.obter(chaveCache);
  if (cache) return cache;
  const resultado = construirHierarquiaForumContatos({ termo: termo || "" });
  CACHE.salvar(chaveCache, resultado, CONFIG.CACHE.TEMPO_PADRAO);
  return resultado;
}

function pesquisarHierarquiaContatos(termo) { return listarHierarquiaContatos(termo || ""); }

function validarModeloForumContatos() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  return validarModeloForumContatosInterno_();
}

function validarModeloForumContatosInterno_() {
  const validacao = validarIntegridadeHierarquiaOrganizacionalV5();
  const diagnostico = validacao.ok ? construirHierarquiaForumContatos({}) : { municipios: [] };
  return {
    ok: validacao.ok,
    problemas: validacao.problemas || [],
    abasObrigatorias: [CONFIG.SHEETS.MUNICIPIOS, CONFIG.SHEETS.FORUM, CONFIG.SHEETS.UNIDADES_ORGANIZACIONAIS, CONFIG.SHEETS.CONTATOS],
    abasAusentes: validacao.abasAusentes || [],
    possuiTELEFONES: !!DB.getSpreadsheet().getSheetByName("TELEFONES"),
    municipios: diagnostico.municipios.length,
    foruns: diagnostico.municipios.reduce(function(total, municipio) { return total + municipio.qtdForuns; }, 0),
    nosOrganizacionais: diagnostico.municipios.reduce(function(total, municipio) { return total + municipio.qtdNos; }, 0),
    unidadesSelecionaveis: diagnostico.municipios.reduce(function(total, municipio) { return total + municipio.qtdUnidades; }, 0),
    contatosAtivos: diagnostico.municipios.reduce(function(total, municipio) { return total + municipio.qtdContatos; }, 0)
  };
}
