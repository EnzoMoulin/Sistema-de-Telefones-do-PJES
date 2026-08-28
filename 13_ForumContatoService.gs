/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 13_ForumContatoService.gs
 * ==========================================================
 *
 * Serviço de leitura da hierarquia definitiva:
 * MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS.
 *
 * Não utiliza nem recria a aba TELEFONES.
 */

function _fcCampo(mapa, linha, nomes, padrao) {
  const lista = Array.isArray(nomes) ? nomes : [nomes];
  for (const nome of lista) {
    const idx = mapa[normalizarChave(nome)];
    if (idx !== undefined) return linha[idx - 1];
  }
  return padrao === undefined ? "" : padrao;
}

function _fcTexto(valor) {
  return textoSeguro(valor);
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
  return (Array.isArray(lista) ? lista : [])
    .slice()
    .sort(_fcComparar)
    .map(item => {
      delete item.__ordem;
      delete item.__indice;
      return item;
    });
}

function _fcLerAba(sheet) {
  if (!sheet) return [];
  const mapa = DB.map(sheet);
  const dados = DB.read(sheet);
  return dados.map((linha, indice) => ({
    linha: linha,
    mapa: mapa,
    indice: indice
  }));
}

function construirHierarquiaForumContatos(opcoes) {
  const cfg = ehObjeto(opcoes) ? opcoes : {};
  const termo = limparTexto(cfg.termo || "");

  const shMun = DB.municipiosOuNulo();
  const shForum = DB.forumOuNulo();
  const shUni = DB.unidadesOuNulo();
  const shSet = DB.setoresOuNulo();
  const shCon = DB.contatosOuNulo();

  if (!shMun || !shForum || !shUni || !shSet || !shCon) {
    throw new Error(
      "Modelo incompleto. A planilha deve conter MUNICIPIOS, FORUM, UNIDADES, SETORES e CONTATOS."
    );
  }

  const municipiosRaw = _fcLerAba(shMun);
  const forumRaw = _fcLerAba(shForum);
  const unidadesRaw = _fcLerAba(shUni);
  const setoresRaw = _fcLerAba(shSet);
  const contatosRaw = _fcLerAba(shCon);

  const municipios = {};
  const foruns = {};
  const unidades = {};
  const setores = {};
  const contatos = [];

  municipiosRaw.forEach(item => {
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

  forumRaw.forEach(item => {
    const id = _fcTexto(_fcCampo(item.mapa, item.linha, ["ID", "FORUM_ID"]));
    if (!id) return;
    const municipioId = _fcTexto(_fcCampo(item.mapa, item.linha, ["MUNICIPIO_ID", "MUN_ID"]));
    foruns[id] = {
      id: id,
      municipioId: municipioId,
      nome: _fcTexto(_fcCampo(item.mapa, item.linha, ["NOME", "FORUM"])),
      endereco: _fcTexto(_fcCampo(item.mapa, item.linha, ["ENDERECO", "ENDEREÇO"])),
      cep: _fcTexto(_fcCampo(item.mapa, item.linha, ["CEP"])),
      email: _fcTexto(_fcCampo(item.mapa, item.linha, ["EMAIL", "E-MAIL", "E_MAIL"])),
      observacao: _fcTexto(_fcCampo(item.mapa, item.linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      ativo: paraBoolean(_fcCampo(item.mapa, item.linha, ["ATIVO"], true)),
      __ordem: _fcOrdem(_fcCampo(item.mapa, item.linha, ["ORDEM"]), item.indice),
      __indice: item.indice,
      contatos: [],
      unidades: []
    };
  });

  unidadesRaw.forEach(item => {
    const id = _fcTexto(_fcCampo(item.mapa, item.linha, ["ID", "UNIDADE_ID"]));
    if (!id) return;
    const forumId = _fcTexto(_fcCampo(item.mapa, item.linha, ["FORUM_ID"]));
    const municipioId = _fcTexto(_fcCampo(item.mapa, item.linha, ["MUNICIPIO_ID", "MUN_ID"]));
    unidades[id] = {
      id: id,
      forumId: forumId,
      municipioId: municipioId,
      nome: _fcTexto(_fcCampo(item.mapa, item.linha, ["NOME", "UNIDADE"])),
      endereco: _fcTexto(_fcCampo(item.mapa, item.linha, ["ENDERECO", "ENDEREÇO"])),
      cep: _fcTexto(_fcCampo(item.mapa, item.linha, ["CEP"])),
      email: _fcTexto(_fcCampo(item.mapa, item.linha, ["EMAIL", "E-MAIL", "E_MAIL"])),
      observacao: _fcTexto(_fcCampo(item.mapa, item.linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      ativo: paraBoolean(_fcCampo(item.mapa, item.linha, ["ATIVO"], true)),
      __ordem: _fcOrdem(_fcCampo(item.mapa, item.linha, ["ORDEM"]), item.indice),
      __indice: item.indice,
      setores: [],
      contatosDiretos: []
    };
  });

  setoresRaw.forEach(item => {
    const id = _fcTexto(_fcCampo(item.mapa, item.linha, ["ID", "SETOR_ID"]));
    if (!id) return;
    const unidadeId = _fcTexto(_fcCampo(item.mapa, item.linha, ["UNIDADE_ID", "UNI_ID"]));
    setores[id] = {
      id: id,
      unidadeId: unidadeId,
      nome: _fcTexto(_fcCampo(item.mapa, item.linha, ["NOME", "SETOR"])),
      endereco: _fcTexto(_fcCampo(item.mapa, item.linha, ["ENDERECO", "ENDEREÇO"])),
      cep: _fcTexto(_fcCampo(item.mapa, item.linha, ["CEP"])),
      observacao: _fcTexto(_fcCampo(item.mapa, item.linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      ativo: paraBoolean(_fcCampo(item.mapa, item.linha, ["ATIVO"], true)),
      __ordem: _fcOrdem(_fcCampo(item.mapa, item.linha, ["ORDEM"]), item.indice),
      __indice: item.indice,
      contatos: []
    };
  });

  contatosRaw.forEach(item => {
    const id = _fcTexto(_fcCampo(item.mapa, item.linha, ["ID"]));
    if (!id) return;
    const registro = {
      id: id,
      forumId: _fcTexto(_fcCampo(item.mapa, item.linha, ["FORUM_ID"])),
      unidadeId: _fcTexto(_fcCampo(item.mapa, item.linha, ["UNIDADE_ID"])),
      setorId: _fcTexto(_fcCampo(item.mapa, item.linha, ["SETOR_ID"])),
      tipo: _fcTexto(_fcCampo(item.mapa, item.linha, ["TIPO", "TIPO_CONTATO"])),
      descricao: _fcTexto(_fcCampo(item.mapa, item.linha, ["DESCRICAO", "DESCRIÇÃO"])),
      valor: _fcTexto(_fcCampo(item.mapa, item.linha, ["VALOR"])),
      observacao: _fcTexto(_fcCampo(item.mapa, item.linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
      dataCriacao: _fcCampo(item.mapa, item.linha, ["DATA_CRIACAO", "DATA"]),
      dataAtualizacao: _fcCampo(item.mapa, item.linha, ["DATA_ATUALIZACAO"]),
      ativo: paraBoolean(_fcCampo(item.mapa, item.linha, ["ATIVO"], true)),
      __ordem: _fcOrdem(_fcCampo(item.mapa, item.linha, ["ORDEM"]), item.indice),
      __indice: item.indice
    };

    // A consulta pública não deve apagar histórico legítimo, mas também não deve
    // exibir registros inativos como contatos operacionais.
    if (!registro.ativo) return;

    contatos.push(registro);

    if (registro.setorId && setores[registro.setorId]) {
      setores[registro.setorId].contatos.push(registro);
      return;
    }
    if (registro.unidadeId && unidades[registro.unidadeId]) {
      unidades[registro.unidadeId].contatosDiretos.push(registro);
      return;
    }
    if (registro.forumId && foruns[registro.forumId]) {
      foruns[registro.forumId].contatos.push(registro);
    }
  });

  // Relaciona setores -> unidades -> fóruns -> municípios.
  Object.keys(setores).forEach(id => {
    const setor = setores[id];
    const unidade = unidades[setor.unidadeId];
    if (unidade) unidade.setores.push(setor);
  });

  Object.keys(unidades).forEach(id => {
    const unidade = unidades[id];
    let forum = foruns[unidade.forumId];
    if (!forum && unidade.municipioId) {
      // Compatibilidade com planilhas antigas em que UNIDADES eram Fóruns.
      forum = Object.values(foruns).find(f => f.municipioId === unidade.municipioId && f.nome === unidade.nome);
      if (!forum) {
        forum = { id: "", municipioId: unidade.municipioId, nome: unidade.nome, endereco: unidade.endereco, cep: unidade.cep, email: unidade.email, contatos: [], unidades: [] };
      }
    }
    if (forum) forum.unidades.push(unidade);
  });

  Object.keys(foruns).forEach(id => {
    const forum = foruns[id];
    const municipio = municipios[forum.municipioId];
    if (municipio) municipio.foruns.push(forum);
  });

  // Herança de endereço/e-mail: setor -> unidade -> fórum.
  Object.values(unidades).forEach(unidade => {
    const forum = foruns[unidade.forumId] || null;
    unidade.enderecoExibicao = unidade.endereco || (forum ? forum.endereco : "");
    unidade.cepExibicao = unidade.cep || (forum ? forum.cep : "");
    unidade.emailExibicao = unidade.email || (forum ? forum.email : "");

    unidade.setores.forEach(setor => {
      setor.enderecoExibicao = setor.endereco || unidade.endereco || (forum ? forum.endereco : "");
      setor.cepExibicao = setor.cep || unidade.cep || (forum ? forum.cep : "");
      setor.emailExibicao = unidade.email || (forum ? forum.email : "");
    });
  });

  // Remove registros de suporte interno antes de serializar.
  Object.values(setores).forEach(setor => {
    setor.contatos = _fcOrdenar(setor.contatos);
  });
  Object.values(unidades).forEach(unidade => {
    unidade.setores = _fcOrdenar(unidade.setores).filter(s => s.ativo);
    unidade.contatosDiretos = _fcOrdenar(unidade.contatosDiretos);
  });
  Object.values(foruns).forEach(forum => {
    forum.contatos = _fcOrdenar(forum.contatos);
    forum.unidades = _fcOrdenar(forum.unidades).filter(u => u.ativo);
  });
  Object.values(municipios).forEach(municipio => {
    municipio.foruns = _fcOrdenar(municipio.foruns).filter(f => f.ativo);
  });

  let listaMunicipios = Object.values(municipios).filter(m => m.ativo);

  if (termo) {
    const norma = limparTexto(termo);
    const filtrarContato = contato => {
      const texto = limparTexto([
        contato.tipo,
        contato.descricao,
        contato.valor,
        contato.observacao,
        contato.id
      ].join(" "));
      return texto.includes(norma);
    };
    const filtrarSetor = setor => {
      const base = limparTexto([setor.nome, setor.observacao, setor.id, setor.emailExibicao, setor.enderecoExibicao].join(" "));
      return base.includes(norma) || setor.contatos.some(filtrarContato);
    };
    const filtrarUnidade = unidade => {
      const base = limparTexto([unidade.nome, unidade.emailExibicao, unidade.enderecoExibicao, unidade.id].join(" "));
      return base.includes(norma) || unidade.contatosDiretos.some(filtrarContato) || unidade.setores.some(filtrarSetor);
    };
    const filtrarForum = forum => {
      const base = limparTexto([forum.nome, forum.email, forum.endereco, forum.id].join(" "));
      return base.includes(norma) || forum.contatos.some(filtrarContato) || forum.unidades.some(filtrarUnidade);
    };
    listaMunicipios = listaMunicipios.filter(m =>
      limparTexto([m.nome, m.codigoIbge, m.microrregiao, m.id].join(" ")).includes(norma) ||
      m.foruns.some(filtrarForum)
    );
  }

  const retorno = listaMunicipios.map(municipio => {
    const qtdUnidades = municipio.foruns.reduce((soma, forum) => soma + forum.unidades.length, 0);
    const qtdContatos = municipio.foruns.reduce((soma, forum) => {
      const diretos = forum.contatos.length;
      const unidades = forum.unidades.reduce((s, u) => {
        return s + u.contatosDiretos.length + u.setores.reduce((ss, setor) => ss + setor.contatos.length, 0);
      }, 0);
      return soma + diretos + unidades;
    }, 0);

    return {
      id: municipio.id,
      nome: municipio.nome,
      codigoIbge: municipio.codigoIbge,
      microrregiao: municipio.microrregiao,
      qtdForuns: municipio.foruns.length,
      qtdUnidades: qtdUnidades,
      qtdContatos: qtdContatos,
      foruns: municipio.foruns.map(forum => ({
        id: forum.id,
        nome: forum.nome,
        endereco: forum.endereco,
        cep: forum.cep,
        email: forum.email,
        observacao: forum.observacao,
        qtdUnidades: forum.unidades.length,
        qtdContatos: forum.contatos.length + forum.unidades.reduce((s, u) => s + u.contatosDiretos.length + u.setores.reduce((ss, setor) => ss + setor.contatos.length, 0), 0),
        contatos: forum.contatos.map(c => _fcContatoPublico(c)),
        unidades: forum.unidades.map(unidade => ({
          id: unidade.id,
          nome: unidade.nome,
          endereco: unidade.endereco,
          cep: unidade.cep,
          email: unidade.email,
          enderecoExibicao: unidade.enderecoExibicao,
          cepExibicao: unidade.cepExibicao,
          emailExibicao: unidade.emailExibicao,
          observacao: unidade.observacao,
          contatosDiretos: unidade.contatosDiretos.map(c => _fcContatoPublico(c)),
          setores: unidade.setores.map(setor => ({
            id: setor.id,
            nome: setor.nome,
            endereco: setor.endereco,
            cep: setor.cep,
            observacao: setor.observacao,
            enderecoExibicao: setor.enderecoExibicao,
            cepExibicao: setor.cepExibicao,
            emailExibicao: setor.emailExibicao,
            contatos: setor.contatos.map(c => _fcContatoPublico(c))
          }))
        }))
      }))
    };
  });

  return {
    sucesso: true,
    geradoEm: new Date(),
    municipios: retorno
  };
}

function _fcContatoPublico(c) {
  return {
    id: c.id,
    forumId: c.forumId,
    unidadeId: c.unidadeId,
    setorId: c.setorId,
    tipo: c.tipo,
    descricao: c.descricao,
    valor: c.valor,
    observacao: c.observacao,
    dataCriacao: c.dataCriacao,
    dataAtualizacao: c.dataAtualizacao,
    ativo: c.ativo
  };
}

function listarHierarquiaContatos(termo) {
  const chaveCache = CONFIG.CACHE.CHAVE_TELEFONES + (limparTexto(termo || "") ? ":" + limparTexto(termo) : "");
  const cache = CACHE.obter(chaveCache);
  if (cache) return cache;
  const resultado = construirHierarquiaForumContatos({ termo: termo || "" });
  CACHE.salvar(chaveCache, resultado, CONFIG.CACHE.TEMPO_PADRAO);
  return resultado;
}

function pesquisarHierarquiaContatos(termo) {
  return listarHierarquiaContatos(termo || "");
}

function validarModeloForumContatos() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  return validarModeloForumContatosInterno_();
}

function validarModeloForumContatosInterno_() {
  const ss = DB.getSpreadsheet();
  const obrigatorias = [
    CONFIG.SHEETS.MUNICIPIOS,
    CONFIG.SHEETS.FORUM,
    CONFIG.SHEETS.UNIDADES,
    CONFIG.SHEETS.SETORES,
    CONFIG.SHEETS.CONTATOS
  ];
  const abas = ss.getSheets().map(s => s.getName());
  const ausentes = obrigatorias.filter(n => abas.indexOf(n) === -1);
  const possuiTelefones = abas.indexOf("TELEFONES") !== -1;
  const diagnostico = construirHierarquiaForumContatos({});

  return {
    ok: ausentes.length === 0,
    abasObrigatorias: obrigatorias,
    abasAusentes: ausentes,
    possuiTELEFONES: possuiTelefones,
    municipios: diagnostico.municipios.length,
    foruns: diagnostico.municipios.reduce((s, m) => s + m.qtdForuns, 0),
    unidades: diagnostico.municipios.reduce((s, m) => s + m.qtdUnidades, 0),
    contatosAtivos: diagnostico.municipios.reduce((s, m) => s + m.qtdContatos, 0)
  };
}
