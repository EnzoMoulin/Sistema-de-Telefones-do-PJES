/**
 * ==========================================================
 * INTEGRAÇÃO V4 — LEGACY -> MUNICIPIOS/FORUM/UNIDADES/SETORES/CONTATOS
 * ==========================================================
 *
 * Este arquivo faz a ponte dos caminhos legados do aplicativo para a
 * arquitetura definitiva. TELEFONES não é usado como fonte operacional.
 */

function _v4Col(mapa, linha, nomes, padrao) {
  const lista = Array.isArray(nomes) ? nomes : [nomes];
  for (const nome of lista) {
    const idx = mapa[normalizarChave(nome)];
    if (idx !== undefined) return linha[idx - 1];
  }
  return padrao === undefined ? "" : padrao;
}

function _v4Rows(sheet) {
  if (!sheet) return [];
  const mapa = DB.map(sheet);
  return DB.read(sheet).map((linha, i) => ({ linha, mapa, indice: i }));
}

function _v4IdNumero(id) {
  const m = String(id || "").match(/(\d+)$/);
  return m ? Number(m[1]) : 0;
}

function _v4NovoContatoId(tipo) {
  const rows = _v4Rows(DB.contatos());
  const prefixo = normalizarChave(tipo) === "EMAIL" ? "EML" : "T";
  let maior = 0;
  rows.forEach(item => {
    const id = textoSeguro(_v4Col(item.mapa, item.linha, ["ID"]));
    if ((prefixo === "EML" && id.indexOf("EML") === 0) || (prefixo === "T" && id.indexOf("T") === 0)) {
      maior = Math.max(maior, _v4IdNumero(id));
    }
  });
  return prefixo + String(maior + 1).padStart(6, "0");
}

function _v4TipoNormalizado(tipo) {
  const t = normalizarChave(tipo);
  if (t === "EMAIL" || t === "EMAIL") return "E-mail";
  if (t === "TELEFONE") return "Telefone";
  if (t === "RAMAL") return "Ramal";
  if (t === "WHATSAPP") return "WhatsApp";
  if (t === "FAX") return "Fax";
  return textoSeguro(tipo);
}

function _v4ValorNormalizado(valor) {
  return limparTexto(valor);
}

function _v4Usuario() {
  return new AuthService().usuarioAtual();
}

function v4ObterUsuarioAtual() {
  return respostaSucesso(_v4Usuario());
}

function _v4EscopoPermitido(usuario, forumId, unidadeId) {
  if (!usuario || !usuario.logado || !usuario.ativo) return false;
  if (usuario.perfil === CONFIG.PERFIS.GESTOR_SISTEMA) return true;
  if (usuario.perfil !== CONFIG.PERFIS.GESTOR_CONTEUDO) return false;
  return Boolean(unidadeId) && Array.isArray(usuario.unidadeIds) &&
    usuario.unidadeIds.includes(textoSeguro(unidadeId));
}

function _v4ResolverContexto(dados) {
  const entrada = ehObjeto(dados) ? dados : {};
  let forumId = textoSeguro(valorObjeto(entrada, "forumId", "FORUM_ID"));
  let unidadeId = textoSeguro(valorObjeto(entrada, "unidadeId", "UNIDADE_ID"));
  let setorId = textoSeguro(valorObjeto(entrada, "setorId", "SETOR_ID"));

  const shSet = DB.setores();
  const ms = DB.map(shSet);
  if (setorId) {
    const row = DB.read(shSet).find(l => textoSeguro(_v4Col(ms, l, ["ID"])) === setorId);
    if (!row) throw new Error("Setor não encontrado.");
    unidadeId = unidadeId || textoSeguro(_v4Col(ms, row, ["UNIDADE_ID"]));
  }

  const shUni = DB.unidades();
  const mu = DB.map(shUni);
  if (unidadeId) {
    const row = DB.read(shUni).find(l => textoSeguro(_v4Col(mu, l, ["ID"])) === unidadeId);
    if (!row) throw new Error("Unidade não encontrada.");
    forumId = forumId || textoSeguro(_v4Col(mu, row, ["FORUM_ID"]));
  }

  if (forumId) {
    const shForum = DB.forum();
    const mf = DB.map(shForum);
    const row = DB.read(shForum).find(l => textoSeguro(_v4Col(mf, l, ["ID"])) === forumId);
    if (!row) throw new Error("Fórum não encontrado.");
  }

  if (!forumId && !unidadeId && !setorId) throw new Error("Informe Fórum, Unidade ou Setor.");
  return { forumId, unidadeId, setorId };
}

function _v4Flat(opcoes) {
  const hier = construirHierarquiaForumContatos(opcoes || {});
  const out = [];
  const vistos = new Set();

  (hier.municipios || []).forEach(m => {
    (m.foruns || []).forEach(f => {
      const base = {
        municipioId: m.id,
        municipio: m.nome,
        microrregiao: m.microrregiao || "",
        forumId: f.id,
        forum: f.nome,
        forumEmail: f.email || "",
        forumEndereco: f.endereco || ""
      };
      const incluir = c => {
        if (!c || vistos.has(c.id)) return;
        vistos.add(c.id);
        let unidade = null, setor = null;
        (f.unidades || []).some(u => {
          if (u.id === c.unidadeId) { unidade = u; return true; }
          return false;
        });
        if (c.setorId) {
          for (const u of (f.unidades || [])) {
            const s = (u.setores || []).find(x => x.id === c.setorId);
            if (s) { unidade = u; setor = s; break; }
          }
        }
        const tipo = _v4TipoNormalizado(c.tipo);
        const valor = textoSeguro(c.valor);
        const row = Object.assign({}, base, {
          ID: c.id,
          id: c.id,
          tipo,
          descricao: c.descricao || "",
          valor,
          setorId: c.setorId || "",
          setor: setor ? setor.nome : "",
          unidadeId: c.unidadeId || (unidade ? unidade.id : ""),
          unidade: unidade ? unidade.nome : "",
          endereco: setor && setor.enderecoExibicao ? setor.enderecoExibicao : (unidade && unidade.enderecoExibicao ? unidade.enderecoExibicao : f.endereco || ""),
          emailEfetivo: setor && setor.emailExibicao ? setor.emailExibicao : (unidade && unidade.emailExibicao ? unidade.emailExibicao : f.email || ""),
          emailHerdado: tipo !== "E-mail",
          contatoDiretoForum: !c.setorId && !c.unidadeId && !!c.forumId,
          contatoDiretoUnidade: !c.setorId && !!c.unidadeId,
          ativo: true,
          status: "ATIVO",
          observacao: c.observacao || (setor ? setor.observacao : ""),
          ordem: c.ordem || ""
        });
        row.numero = tipo === "Telefone" ? valor : "";
        row.ramal = tipo === "Ramal" ? valor : "";
        row.whatsapp = tipo === "WhatsApp" ? valor : "";
        row.email = tipo === "E-mail" ? valor : "";
        out.push(row);
      };
      (f.contatos || []).forEach(incluir);
      (f.unidades || []).forEach(u => {
        (u.contatosDiretos || []).forEach(incluir);
        (u.setores || []).forEach(s => (s.contatos || []).forEach(incluir));
      });
    });
  });
  return out;
}

function v4ListarContatos() {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
  return respostaSucesso(_v4Flat({}));
}

function v4PesquisarContatos(texto) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.PESQUISAR);
  const termo = textoSeguro(texto);
  if (termo && limparTexto(termo).length < CONFIG.LIMITES.TAMANHO_PESQUISA) return respostaSucesso([]);
  const dados = _v4Flat({});
  const t = limparTexto(termo);
  if (!t) return respostaSucesso(dados);
  return respostaSucesso(dados.filter(x => limparTexto([x.municipio, x.forum, x.unidade, x.setor, x.tipo, x.descricao, x.valor, x.email, x.endereco, x.observacao].join(" ")).includes(t)));
}

function v4ListarMunicipios() {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
  const hier = construirHierarquiaForumContatos({});
  return respostaSucesso((hier.municipios || []).map(m => m.nome));
}

function v4CarregarDashboard() {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
  const dados = v4ListarContatos().dados || [];
  const tipos = {}, setores = {}, comarcas = {}, foruns = {}, unidades = {}, municipios = {};
  dados.forEach(x => {
    const tipo = x.tipo || "Não informado";
    const setor = x.setor || "Não informado";
    const comarca = x.municipio || "Não informado";
    tipos[tipo] = (tipos[tipo] || 0) + 1;
    setores[setor] = (setores[setor] || 0) + 1;
    comarcas[comarca] = (comarcas[comarca] || 0) + 1;
    if (x.forumId) foruns[x.forumId] = true;
    if (x.unidadeId) unidades[x.unidadeId] = true;
    if (x.municipioId) municipios[x.municipioId] = true;
  });
  return respostaSucesso({ total: dados.length, tipos, setores, comarcas, totalForuns: Object.keys(foruns).length, totalUnidades: Object.keys(unidades).length, totalMunicipios: Object.keys(municipios).length });
}

function _v4DadosContatoPorId(id) {
  const sh = DB.contatos();
  const mapa = DB.map(sh);
  const row = DB.read(sh).find(l => textoSeguro(_v4Col(mapa, l, ["ID"])) === textoSeguro(id));
  if (!row) return null;
  const obj = {};
  DB.headers(sh).forEach((h, i) => obj[h] = row[i]);
  return { row, mapa, obj };
}

function _v4HistoricoRegistrar(contatoId, acao, antes, depois) {
  const sh = DB.historico();
  const headers = DB.headers(sh);
  const mapa = DB.map(sh);
  const linha = headers.map(h => {
    const k = normalizarChave(h);
    if (k === "ID") return Utilities.getUuid();
    if (k === "CONTATOID" || k === "CONTATO_ID") return contatoId;
    if (k === "TELEFONEID" || k === "TELEFONE_ID") return contatoId;
    if (k === "ACAO") return acao;
    if (k === "ANTES") return JSON.stringify(antes || {});
    if (k === "DEPOIS") return JSON.stringify(depois || {});
    if (k === "USUARIO") return _v4Usuario().email || "SISTEMA";
    if (k === "DATA" || k === "DATACRIACAO") return new Date();
    return "";
  });
  sh.getRange(sh.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
}

function v4ObterContato(id) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.VISUALIZAR);
  const dados = _v4Flat({}).find(x => x.ID === textoSeguro(id));
  return respostaSucesso(dados || null);
}

function v4CriarContato(dados) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.EDITAR);
  const entrada = ehObjeto(dados) ? dados : {};
  const contexto = _v4ResolverContexto(entrada);
  const usuario = _v4Usuario();
  if (!_v4EscopoPermitido(usuario, contexto.forumId, contexto.unidadeId)) throw new Error("Sem permissão para este Fórum/Unidade.");
  const tipo = _v4TipoNormalizado(valorObjeto(entrada, "tipo", "TIPO"));
  const valor = textoSeguro(valorObjeto(entrada, "valor", "VALOR"));
  const descricao = textoSeguro(valorObjeto(entrada, "descricao", "DESCRICAO", "descrição"));
  if (!tipo || !valor) throw new Error("Tipo e valor são obrigatórios.");
  if (tipo === "E-mail" && !/^\S+@\S+\.\S+$/.test(valor)) throw new Error("E-mail inválido.");

  const existentes = _v4Flat({});
  const chave = limparTexto(tipo + "|" + valor + "|" + descricao + "|" + contexto.forumId + "|" + contexto.unidadeId + "|" + contexto.setorId);
  if (existentes.some(x => limparTexto(x.tipo + "|" + x.valor + "|" + x.descricao + "|" + x.forumId + "|" + x.unidadeId + "|" + x.setorId) === chave)) throw new Error("Contato duplicado no mesmo contexto.");

  const sh = DB.contatos();
  const headers = DB.headers(sh);
  const agora = new Date();
  const id = _v4NovoContatoId(tipo);
  const linha = headers.map(h => {
    const k = normalizarChave(h);
    if (k === "ID") return id;
    if (k === "FORUMID") return contexto.forumId;
    if (k === "UNIDADEID") return contexto.unidadeId;
    if (k === "SETORID") return contexto.setorId;
    if (k === "TIPO") return tipo;
    if (k === "DESCRICAO") return descricao;
    if (k === "VALOR") return valor;
    if (k === "ORDEM") return valorObjeto(entrada, "ordem", "ORDEM") || "";
    if (k === "DATACRIACAO" || k === "DATA") return agora;
    if (k === "DATAATUALIZACAO") return agora;
    if (k === "ATIVO") return true;
    if (k === "OBSERVACAO") return valorObjeto(entrada, "observacao", "OBSERVACAO") || "";
    return "";
  });
  sh.getRange(sh.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
  _v4HistoricoRegistrar(id, "CRIACAO", {}, { id, ...contexto, tipo, descricao, valor });
  try { CACHE.limparTudo(); } catch (e) {}
  return v4ObterContato(id);
}

function v4AtualizarContato(id, dados) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.EDITAR);
  const atual = _v4DadosContatoPorId(id);
  if (!atual) throw new Error("Contato não encontrado.");
  const usuario = _v4Usuario();
  const antigo = v4ObterContato(id).dados;
  const entrada = ehObjeto(dados) ? dados : {};
  const contexto = _v4ResolverContexto(Object.assign({}, antigo, entrada));
  if (!_v4EscopoPermitido(usuario, contexto.forumId, contexto.unidadeId)) throw new Error("Sem permissão para este Fórum/Unidade.");
  const sh = DB.contatos();
  const headers = DB.headers(sh);
  const rowIndex = DB.read(sh).findIndex(l => textoSeguro(_v4Col(atual.mapa, l, ["ID"])) === textoSeguro(id)) + 2;
  const atualObj = atual.obj;
  const tipo = _v4TipoNormalizado(valorObjeto(entrada, "tipo", "TIPO")) || textoSeguro(atualObj.TIPO);
  const valor = textoSeguro(valorObjeto(entrada, "valor", "VALOR")) || textoSeguro(atualObj.VALOR);
  const descricao = textoSeguro(valorObjeto(entrada, "descricao", "DESCRICAO")) || textoSeguro(atualObj.DESCRICAO);
  const agora = new Date();
  const linha = headers.map(h => {
    const k = normalizarChave(h);
    if (k === "ID") return id;
    if (k === "FORUMID") return contexto.forumId;
    if (k === "UNIDADEID") return contexto.unidadeId;
    if (k === "SETORID") return contexto.setorId;
    if (k === "TIPO") return tipo;
    if (k === "DESCRICAO") return descricao;
    if (k === "VALOR") return valor;
    if (k === "ORDEM") return valorObjeto(entrada, "ordem", "ORDEM") || atualObj.ORDEM || "";
    if (k === "DATAATUALIZACAO") return agora;
    if (k === "ATIVO") return valorObjeto(entrada, "ativo", "ATIVO") === "" ? true : paraBoolean(valorObjeto(entrada, "ativo", "ATIVO"));
    if (k === "OBSERVACAO") return valorObjeto(entrada, "observacao", "OBSERVACAO") || atualObj.OBSERVACAO || "";
    if (k === "DATACRIACAO" || k === "DATA") return atualObj[h] || agora;
    return atualObj[h] === undefined ? "" : atualObj[h];
  });
  sh.getRange(rowIndex, 1, 1, linha.length).setValues([linha]);
  _v4HistoricoRegistrar(id, "EDICAO", antigo, { id, ...contexto, tipo, descricao, valor });
  try { CACHE.limparTudo(); } catch (e) {}
  return v4ObterContato(id);
}

function v4ExcluirContato(id) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.EXCLUIR);
  const atual = v4ObterContato(id).dados;
  if (!atual) throw new Error("Contato não encontrado.");
  const usuario = _v4Usuario();
  if (!_v4EscopoPermitido(usuario, atual.forumId, atual.unidadeId)) throw new Error("Sem permissão para este Fórum/Unidade.");
  const sh = DB.contatos();
  const mapa = DB.map(sh);
  const valores = DB.read(sh);
  const idx = valores.findIndex(l => textoSeguro(_v4Col(mapa, l, ["ID"])) === textoSeguro(id));
  if (idx < 0) throw new Error("Contato não encontrado.");
  sh.deleteRow(idx + 2);
  _v4HistoricoRegistrar(id, "EXCLUSAO", atual, {});
  try { CACHE.limparTudo(); } catch (e) {}
  return respostaSucesso({ id, excluido: true });
}

function v4HistoricoContato(id) {
  new AuthService().exigirPermissao(CONFIG.PERMISSOES.HISTORICO);
  const atual = v4ObterContato(id).dados;
  if (!atual) return respostaSucesso([]);
  if (!_v4EscopoPermitido(_v4Usuario(), atual.forumId, atual.unidadeId)) throw new Error("Sem permissão para este Fórum/Unidade.");
  const sh = DB.historico();
  const mapa = DB.map(sh);
  return respostaSucesso(DB.read(sh).filter(l => textoSeguro(_v4Col(mapa, l, ["CONTATO_ID", "TELEFONE_ID", "TELEFONEID"])) === textoSeguro(id)).map(l => {
    const o = {}; DB.headers(sh).forEach((h,i) => o[h] = l[i]); return o;
  }));
}

function validarDadosReaisForumV4() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  const ss = DB.getSpreadsheet();

  const obrigatorias = [
    CONFIG.SHEETS.MUNICIPIOS,
    CONFIG.SHEETS.FORUM,
    CONFIG.SHEETS.UNIDADES,
    CONFIG.SHEETS.SETORES,
    CONFIG.SHEETS.CONTATOS
  ];

  const ausentes = obrigatorias.filter(
    n => !ss.getSheetByName(n)
  );

  const problemas = [];

  obrigatorias.forEach(function(nome) {
    if (!ss.getSheetByName(nome)) {
      problemas.push("Aba ausente: " + nome);
    }
  });

  const ids = function(sheet, campo) {
    if (!sheet) return [];

    const mapa = DB.map(sheet);
    const idx = mapa[normalizarChave(campo)];

    return DB.read(sheet)
      .map(function(linha) {
        return textoSeguro(
          idx ? linha[idx - 1] : ""
        );
      })
      .filter(Boolean);
  };

  const duplicados = function(lista) {
    const vistos = new Set();
    const repetidos = [];

    lista.forEach(function(valor) {
      if (vistos.has(valor)) {
        repetidos.push(valor);
      } else {
        vistos.add(valor);
      }
    });

    return repetidos;
  };

  const municipio = DB.municipiosOuNulo();
  const forum = DB.forumOuNulo();
  const unidade = DB.unidadesOuNulo();
  const setor = DB.setoresOuNulo();
  const contato = DB.contatosOuNulo();

  [
    ["MUNICIPIO", municipio],
    ["FORUM", forum],
    ["UNIDADE", unidade],
    ["SETOR", setor],
    ["CONTATO", contato]
  ].forEach(function(par) {
    const repetidos = duplicados(
      ids(par[1], "ID")
    );

    if (repetidos.length) {
      problemas.push(
        par[0] +
        " IDs duplicados: " +
        repetidos.join(", ")
      );
    }
  });

  if (forum) {
    const mapaForum = DB.map(forum);
    const municipiosValidos = new Set(
      ids(municipio, "ID")
    );

    DB.read(forum).forEach(function(linha, indice) {
      const municipioId = textoSeguro(
        _v4Col(
          mapaForum,
          linha,
          ["MUNICIPIO_ID"]
        )
      );

      if (
        municipioId &&
        !municipiosValidos.has(municipioId)
      ) {
        problemas.push(
          "FORUM linha " +
          (indice + 2) +
          " aponta para MUNICIPIO inexistente: " +
          municipioId
        );
      }
    });
  }

  if (unidade) {
    const mapaUnidade = DB.map(unidade);

    const forunsValidos = new Set(
      ids(forum, "ID")
    );

    const municipiosValidos = new Set(
      ids(municipio, "ID")
    );

    DB.read(unidade).forEach(function(linha, indice) {
      const forumId = textoSeguro(
        _v4Col(
          mapaUnidade,
          linha,
          ["FORUM_ID"]
        )
      );

      const municipioId = textoSeguro(
        _v4Col(
          mapaUnidade,
          linha,
          ["MUNICIPIO_ID"]
        )
      );

      if (
        forumId &&
        !forunsValidos.has(forumId)
      ) {
        problemas.push(
          "UNIDADE linha " +
          (indice + 2) +
          " aponta para FORUM inexistente: " +
          forumId
        );
      }

      if (
        municipioId &&
        !municipiosValidos.has(municipioId)
      ) {
        problemas.push(
          "UNIDADE linha " +
          (indice + 2) +
          " aponta para MUNICIPIO inexistente: " +
          municipioId
        );
      }
    });
  }

  if (setor) {
    const mapaSetor = DB.map(setor);

    const unidadesValidas = new Set(
      ids(unidade, "ID")
    );

    DB.read(setor).forEach(function(linha, indice) {
      const unidadeId = textoSeguro(
        _v4Col(
          mapaSetor,
          linha,
          ["UNIDADE_ID"]
        )
      );

      if (
        unidadeId &&
        !unidadesValidas.has(unidadeId)
      ) {
        problemas.push(
          "SETOR linha " +
          (indice + 2) +
          " aponta para UNIDADE inexistente: " +
          unidadeId
        );
      }
    });
  }

  if (contato) {
    const mapaContato = DB.map(contato);

    const forunsValidos = new Set(
      ids(forum, "ID")
    );

    const unidadesValidas = new Set(
      ids(unidade, "ID")
    );

    const setoresValidos = new Set(
      ids(setor, "ID")
    );

    DB.read(contato).forEach(function(linha, indice) {
      const forumId = textoSeguro(
        _v4Col(
          mapaContato,
          linha,
          ["FORUM_ID"]
        )
      );

      const unidadeId = textoSeguro(
        _v4Col(
          mapaContato,
          linha,
          ["UNIDADE_ID"]
        )
      );

      const setorId = textoSeguro(
        _v4Col(
          mapaContato,
          linha,
          ["SETOR_ID"]
        )
      );

      if (
        !forumId &&
        !unidadeId &&
        !setorId
      ) {
        problemas.push(
          "CONTATO linha " +
          (indice + 2) +
          " não possui vínculo de Fórum/Unidade/Setor."
        );
      }

      if (
        forumId &&
        !forunsValidos.has(forumId)
      ) {
        problemas.push(
          "CONTATO linha " +
          (indice + 2) +
          " aponta para FORUM inexistente: " +
          forumId
        );
      }

      if (
        unidadeId &&
        !unidadesValidas.has(unidadeId)
      ) {
        problemas.push(
          "CONTATO linha " +
          (indice + 2) +
          " aponta para UNIDADE inexistente: " +
          unidadeId
        );
      }

      if (
        setorId &&
        !setoresValidos.has(setorId)
      ) {
        problemas.push(
          "CONTATO linha " +
          (indice + 2) +
          " aponta para SETOR inexistente: " +
          setorId
        );
      }
    });
  }

  return {
    ok: problemas.length === 0,
    problemas: problemas,
    abasAusentes: ausentes,
    contagens: {
      municipios: municipio
        ? DB.count(municipio)
        : 0,

      foruns: forum
        ? DB.count(forum)
        : 0,

      unidades: unidade
        ? DB.count(unidade)
        : 0,

      setores: setor
        ? DB.count(setor)
        : 0,

      contatos: contato
        ? DB.count(contato)
        : 0
    }
  };
}
