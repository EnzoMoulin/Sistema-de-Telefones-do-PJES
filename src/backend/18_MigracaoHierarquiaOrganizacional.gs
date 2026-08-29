/**
 * ==========================================================
 * MIGRAÇÃO V5 — HIERARQUIA ORGANIZACIONAL AUTO-RELACIONADA
 * ==========================================================
 *
 * Migração idempotente e não destrutiva:
 * - UNIDADES viram nós-raiz selecionáveis, mantendo seus IDs;
 * - SETORES viram filhos das antigas Unidades, mantendo seus IDs;
 * - CONTATOS recebe UNIDADE_ORGANIZACIONAL_ID;
 * - UNIDADES e SETORES continuam na planilha somente para rollback.
 */

function migrarHierarquiaOrganizacionalV5() {
  const ss = DB.getSpreadsheet();
  const destino = garantirAbaForumV4(
    ss,
    CONFIG.SHEETS.UNIDADES_ORGANIZACIONAIS,
    ["ID","FORUM_ID","PAI_ID","TIPO","NOME","ENDERECO","CEP","OBSERVACAO","SELECIONAVEL_ACESSO","ATIVO","ORDEM"]
  );
  const contatos = garantirAbaForumV4(
    ss,
    CONFIG.SHEETS.CONTATOS,
    ["ID","FORUM_ID","UNIDADE_ORGANIZACIONAL_ID","UNIDADE_ID","SETOR_ID","TIPO","DESCRICAO","VALOR","ORDEM","DATA_CRIACAO","DATA_ATUALIZACAO","ATIVO","OBSERVACAO"]
  );

  const nosExistentes = new Set();
  const mapaDestino = DB.map(destino);
  DB.read(destino).forEach(function(linha) {
    const id = textoSeguro(_fcCampo(mapaDestino, linha, ["ID"]));
    if (id) nosExistentes.add(id);
  });

  const unidadesLegadas = DB.unidadesOuNulo();
  const setoresLegados = DB.setoresOuNulo();
  const forumPorUnidade = {};
  const novasLinhas = [];
  const headersDestino = DB.headers(destino);

  const montarLinha = function(registro) {
    return headersDestino.map(function(header) {
      const chave = normalizarChave(header);
      return Object.prototype.hasOwnProperty.call(registro, chave) ? registro[chave] : "";
    });
  };

  if (unidadesLegadas) {
    const mapa = DB.map(unidadesLegadas);
    DB.read(unidadesLegadas).forEach(function(linha, indice) {
      const id = textoSeguro(_fcCampo(mapa, linha, ["ID"]));
      const forumId = textoSeguro(_fcCampo(mapa, linha, ["FORUM_ID"]));
      if (!id) return;
      forumPorUnidade[id] = forumId;
      if (nosExistentes.has(id)) return;
      novasLinhas.push(montarLinha({
        ID: id,
        FORUMID: forumId,
        PAIID: "",
        TIPO: "UNIDADE",
        NOME: textoSeguro(_fcCampo(mapa, linha, ["NOME"])),
        ENDERECO: textoSeguro(_fcCampo(mapa, linha, ["ENDERECO", "ENDEREÇO"])),
        CEP: textoSeguro(_fcCampo(mapa, linha, ["CEP"])),
        OBSERVACAO: textoSeguro(_fcCampo(mapa, linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
        SELECIONAVELACESSO: true,
        ATIVO: paraBoolean(_fcCampo(mapa, linha, ["ATIVO"], true)),
        ORDEM: _fcCampo(mapa, linha, ["ORDEM"], indice + 1)
      }));
      nosExistentes.add(id);
    });
  }

  if (setoresLegados) {
    const mapa = DB.map(setoresLegados);
    DB.read(setoresLegados).forEach(function(linha, indice) {
      const id = textoSeguro(_fcCampo(mapa, linha, ["ID"]));
      const paiId = textoSeguro(_fcCampo(mapa, linha, ["UNIDADE_ID"]));
      if (!id || nosExistentes.has(id)) return;
      novasLinhas.push(montarLinha({
        ID: id,
        FORUMID: forumPorUnidade[paiId] || "",
        PAIID: paiId,
        TIPO: "SETOR",
        NOME: textoSeguro(_fcCampo(mapa, linha, ["NOME"])),
        ENDERECO: textoSeguro(_fcCampo(mapa, linha, ["ENDERECO", "ENDEREÇO"])),
        CEP: textoSeguro(_fcCampo(mapa, linha, ["CEP"])),
        OBSERVACAO: textoSeguro(_fcCampo(mapa, linha, ["OBSERVACAO", "OBSERVAÇÃO"])),
        SELECIONAVELACESSO: false,
        ATIVO: paraBoolean(_fcCampo(mapa, linha, ["ATIVO"], true)),
        ORDEM: _fcCampo(mapa, linha, ["ORDEM"], indice + 1)
      }));
      nosExistentes.add(id);
    });
  }

  if (novasLinhas.length) {
    destino.getRange(destino.getLastRow() + 1, 1, novasLinhas.length, headersDestino.length).setValues(novasLinhas);
  }

  const mapaContatos = DB.map(contatos);
  const idxNo = mapaContatos.UNIDADEORGANIZACIONALID;
  const idxUnidade = mapaContatos.UNIDADEID;
  const idxSetor = mapaContatos.SETORID;
  const dadosContatos = DB.read(contatos);
  let contatosAtualizados = 0;

  if (idxNo && dadosContatos.length) {
    const valores = dadosContatos.map(function(linha) {
      const atual = textoSeguro(linha[idxNo - 1]);
      const legado = textoSeguro(idxSetor ? linha[idxSetor - 1] : "") || textoSeguro(idxUnidade ? linha[idxUnidade - 1] : "");
      const atualValido = atual && nosExistentes.has(atual);
      const legadoValido = legado && nosExistentes.has(legado);
      const escolhido = atualValido ? atual : (legadoValido ? legado : (atual || legado));
      if (escolhido !== atual) contatosAtualizados++;
      return [escolhido];
    });
    contatos.getRange(2, idxNo, valores.length, 1).setValues(valores);
  }

  try { CACHE.limparTudo(); } catch (e) {}
  return {
    sucesso: true,
    nosInseridos: novasLinhas.length,
    contatosAtualizados: contatosAtualizados,
    abasLegadasPreservadas: [CONFIG.SHEETS.UNIDADES, CONFIG.SHEETS.SETORES]
  };
}

function validarIntegridadeHierarquiaOrganizacionalV5() {
  const ss = DB.getSpreadsheet();
  const obrigatorias = [
    CONFIG.SHEETS.MUNICIPIOS,
    CONFIG.SHEETS.FORUM,
    CONFIG.SHEETS.UNIDADES_ORGANIZACIONAIS,
    CONFIG.SHEETS.CONTATOS
  ];
  const ausentes = obrigatorias.filter(function(nome) { return !ss.getSheetByName(nome); });
  const problemas = ausentes.map(function(nome) { return "Aba ausente: " + nome; });
  if (ausentes.length) return { ok: false, problemas: problemas, abasAusentes: ausentes };

  const shForum = DB.forum();
  const shNos = DB.unidadesOrganizacionais();
  const shContatos = DB.contatos();
  const mapaForum = DB.map(shForum);
  const mapaNos = DB.map(shNos);
  const mapaContatos = DB.map(shContatos);
  const foruns = new Set();
  const nos = {};
  const duplicados = new Set();

  DB.read(shForum).forEach(function(linha) {
    const id = textoSeguro(_fcCampo(mapaForum, linha, ["ID"]));
    if (id) foruns.add(id);
  });

  DB.read(shNos).forEach(function(linha, indice) {
    const id = textoSeguro(_fcCampo(mapaNos, linha, ["ID"]));
    if (!id) { problemas.push("UNIDADES_ORGANIZACIONAIS linha " + (indice + 2) + " sem ID."); return; }
    if (nos[id]) duplicados.add(id);
    nos[id] = {
      id: id,
      paiId: textoSeguro(_fcCampo(mapaNos, linha, ["PAI_ID"])),
      forumId: textoSeguro(_fcCampo(mapaNos, linha, ["FORUM_ID"]))
    };
  });
  if (duplicados.size) problemas.push("Nós com ID duplicado: " + Array.from(duplicados).join(", "));

  Object.keys(nos).forEach(function(id) {
    const no = nos[id];
    if (!foruns.has(no.forumId)) problemas.push("Nó " + id + " aponta para Fórum inexistente: " + no.forumId);
    if (no.paiId === id) problemas.push("Nó " + id + " aponta para si próprio.");
    if (no.paiId && !nos[no.paiId]) problemas.push("Nó " + id + " aponta para pai inexistente: " + no.paiId);
    if (no.paiId && nos[no.paiId] && nos[no.paiId].forumId !== no.forumId) {
      problemas.push("Nó " + id + " e seu pai pertencem a Fóruns diferentes.");
    }

    const visitados = new Set();
    let atual = no;
    let profundidade = 0;
    while (atual && atual.paiId) {
      if (visitados.has(atual.id)) { problemas.push("Ciclo hierárquico envolvendo o nó " + id + "."); break; }
      visitados.add(atual.id);
      atual = nos[atual.paiId];
      profundidade++;
      if (profundidade > 50) { problemas.push("Profundidade inválida acima de 50 níveis no nó " + id + "."); break; }
    }
  });

  const idsContatos = new Set();
  DB.read(shContatos).forEach(function(linha, indice) {
    const id = textoSeguro(_fcCampo(mapaContatos, linha, ["ID"]));
    const forumId = textoSeguro(_fcCampo(mapaContatos, linha, ["FORUM_ID"]));
    const noId = _fcPrimeiroValor(mapaContatos, linha, ["UNIDADE_ORGANIZACIONAL_ID", "SETOR_ID", "UNIDADE_ID"]);
    if (!id) problemas.push("CONTATOS linha " + (indice + 2) + " sem ID.");
    else if (idsContatos.has(id)) problemas.push("Contato duplicado: " + id);
    else idsContatos.add(id);
    if (!forumId && !noId) problemas.push("CONTATOS linha " + (indice + 2) + " sem Fórum ou nó organizacional.");
    if (forumId && !foruns.has(forumId)) problemas.push("Contato " + id + " aponta para Fórum inexistente: " + forumId);
    if (noId && !nos[noId]) problemas.push("Contato " + id + " aponta para nó inexistente: " + noId);
    if (noId && forumId && nos[noId] && nos[noId].forumId !== forumId) problemas.push("Contato " + id + " possui Fórum diferente do nó vinculado.");
  });

  return {
    ok: problemas.length === 0,
    problemas: Array.from(new Set(problemas)),
    abasAusentes: ausentes,
    contagens: {
      municipios: DB.count(DB.municipios()),
      foruns: DB.count(shForum),
      nosOrganizacionais: Object.keys(nos).length,
      contatos: idsContatos.size
    }
  };
}
