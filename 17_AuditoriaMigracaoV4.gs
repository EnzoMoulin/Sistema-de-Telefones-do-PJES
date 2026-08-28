/**
 * ==========================================================
 * AUDITORIA REAL — CONTATOS V4
 * ==========================================================
 *
 * SOMENTE LEITURA.
 *
 * Verifica:
 * - estrutura das abas
 * - IDs duplicados
 * - campos obrigatórios
 * - tipos de contato
 * - referências FORUM/UNIDADE/SETOR
 * - coerência SETOR -> UNIDADE -> FORUM
 * - duplicidade real de conteúdo
 *
 * Não altera dados.
 */

function audV4Campo(mapa, linha, aliases, padrao) {
  const nomes = Array.isArray(aliases) ? aliases : [aliases];

  for (const nome of nomes) {
    const chave = normalizarChave(nome);
    const idx = mapa[chave];

    if (idx !== undefined) {
      return linha[idx - 1];
    }
  }

  return padrao === undefined ? "" : padrao;
}

function audV4Texto(valor) {
  return textoSeguro(valor);
}

function audV4NormalizarTipo(tipo) {
  const original = audV4Texto(tipo);
  const tipoNormalizado = normalizarChave(original);

  switch (tipoNormalizado) {
    case "TELEFONE":
    case "FIXO":
      return "Telefone";

    case "RAMAL":
      return "Ramal";

    case "WHATSAPP":
    case "WHATS":
      return "WhatsApp";

    case "EMAIL":
    case "EMAILINSTITUCIONAL":
      return "E-mail";

    case "FAX":
      return "Fax";

    default:
      return original;
  }
}

function audV4Ids(sheet) {
  if (!sheet) return new Set();

  const mapa = DB.map(sheet);

  return new Set(
    DB.read(sheet)
      .map(function(linha) {
        return audV4Texto(
          audV4Campo(mapa, linha, ["ID"])
        );
      })
      .filter(Boolean)
  );
}

function auditarContatosV4() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  const ss = DB.getSpreadsheet();

  const shMun = ss.getSheetByName("MUNICIPIOS");
  const shForum = ss.getSheetByName("FORUM");
  const shUni = ss.getSheetByName("UNIDADES");
  const shSet = ss.getSheetByName("SETORES");
  const shCon = ss.getSheetByName("CONTATOS");

  const problemasEstrutura = [];

  if (!shMun) problemasEstrutura.push("Aba MUNICIPIOS ausente.");
  if (!shForum) problemasEstrutura.push("Aba FORUM ausente.");
  if (!shUni) problemasEstrutura.push("Aba UNIDADES ausente.");
  if (!shSet) problemasEstrutura.push("Aba SETORES ausente.");
  if (!shCon) problemasEstrutura.push("Aba CONTATOS ausente.");

  if (problemasEstrutura.length) {
    const resultadoFalha = {
      ok: false,
      problemas: problemasEstrutura
    };

    Logger.log(JSON.stringify(resultadoFalha, null, 2));
    return resultadoFalha;
  }

  const idsMunicipios = audV4Ids(shMun);
  const idsForuns = audV4Ids(shForum);
  const idsUnidades = audV4Ids(shUni);
  const idsSetores = audV4Ids(shSet);

  const mapaContatos = DB.map(shCon);
  const rowsContatos = DB.read(shCon);

  const tiposValidos = new Set([
    "TELEFONE",
    "RAMAL",
    "WHATSAPP",
    "FAX",
    "EMAIL"
  ]);

  const estatisticas = {
    total: rowsContatos.length,
    ativos: 0,
    inativos: 0,
    semId: 0,
    semTipo: 0,
    semValor: 0,
    tipoDesconhecido: 0,
    semVinculo: 0,
    forumInexistente: 0,
    unidadeInexistente: 0,
    setorInexistente: 0,
    vinculosInvalidos: 0
  };

  const problemasDetalhados = [];
  const registros = [];

  rowsContatos.forEach(function(row, indice) {
    const linhaPlanilha = indice + 2;

    const id = audV4Texto(
      audV4Campo(mapaContatos, row, ["ID"])
    );

    const forumId = audV4Texto(
      audV4Campo(mapaContatos, row, ["FORUM_ID"])
    );

    const unidadeId = audV4Texto(
      audV4Campo(mapaContatos, row, ["UNIDADE_ID"])
    );

    const setorId = audV4Texto(
      audV4Campo(mapaContatos, row, ["SETOR_ID"])
    );

    const tipoOriginal = audV4Texto(
      audV4Campo(
        mapaContatos,
        row,
        ["TIPO", "TIPO_CONTATO"]
      )
    );

    const tipoNormalizado = audV4NormalizarTipo(tipoOriginal);

    const descricao = audV4Texto(
      audV4Campo(
        mapaContatos,
        row,
        ["DESCRICAO", "DESCRIÇÃO"]
      )
    );

    const valor = audV4Texto(
      audV4Campo(
        mapaContatos,
        row,
        ["VALOR"]
      )
    );

    const ativo = paraBoolean(
      audV4Campo(
        mapaContatos,
        row,
        ["ATIVO"],
        true
      )
    );

    const ordem = audV4Campo(
      mapaContatos,
      row,
      ["ORDEM"],
      ""
    );

    if (ativo) {
      estatisticas.ativos++;
    } else {
      estatisticas.inativos++;
    }

    if (!id) {
      estatisticas.semId++;

      problemasDetalhados.push({
        tipo: "SEM_ID",
        linha: linhaPlanilha
      });
    }

    if (!tipoOriginal) {
      estatisticas.semTipo++;

      problemasDetalhados.push({
        tipo: "SEM_TIPO",
        linha: linhaPlanilha,
        id: id
      });
    } else if (!tiposValidos.has(normalizarChave(tipoNormalizado))) {
      estatisticas.tipoDesconhecido++;

      problemasDetalhados.push({
        tipo: "TIPO_DESCONHECIDO",
        linha: linhaPlanilha,
        id: id,
        tipoOriginal: tipoOriginal
      });
    }

    if (!valor) {
      estatisticas.semValor++;

      problemasDetalhados.push({
        tipo: "SEM_VALOR",
        linha: linhaPlanilha,
        id: id
      });
    }

    if (!forumId && !unidadeId && !setorId) {
      estatisticas.semVinculo++;

      problemasDetalhados.push({
        tipo: "SEM_VINCULO",
        linha: linhaPlanilha,
        id: id
      });
    }

    if (forumId && !idsForuns.has(forumId)) {
      estatisticas.forumInexistente++;
      estatisticas.vinculosInvalidos++;

      problemasDetalhados.push({
        tipo: "FORUM_INEXISTENTE",
        linha: linhaPlanilha,
        id: id,
        forumId: forumId
      });
    }

    if (unidadeId && !idsUnidades.has(unidadeId)) {
      estatisticas.unidadeInexistente++;
      estatisticas.vinculosInvalidos++;

      problemasDetalhados.push({
        tipo: "UNIDADE_INEXISTENTE",
        linha: linhaPlanilha,
        id: id,
        unidadeId: unidadeId
      });
    }

    if (setorId && !idsSetores.has(setorId)) {
      estatisticas.setorInexistente++;
      estatisticas.vinculosInvalidos++;

      problemasDetalhados.push({
        tipo: "SETOR_INEXISTENTE",
        linha: linhaPlanilha,
        id: id,
        setorId: setorId
      });
    }

    registros.push({
      id: id,
      forumId: forumId,
      unidadeId: unidadeId,
      setorId: setorId,
      tipo: tipoNormalizado,
      descricao: descricao,
      valor: valor,
      ativo: ativo,
      ordem: ordem,
      linha: linhaPlanilha
    });
  });

  /*
   * IDs duplicados
   */
  const porId = {};

  registros.forEach(function(registro) {
    if (!registro.id) return;

    if (!porId[registro.id]) {
      porId[registro.id] = [];
    }

    porId[registro.id].push(registro);
  });

  const idsDuplicados = Object.keys(porId)
    .filter(function(id) {
      return porId[id].length > 1;
    })
    .map(function(id) {
      return {
        id: id,
        quantidade: porId[id].length,
        registros: porId[id]
      };
    });

  /*
   * Duplicidade real de conteúdo.
   *
   * O mesmo telefone pode legitimamente aparecer
   * em contatos diferentes.
   *
   * Por isso a chave inclui:
   * FORUM + UNIDADE + SETOR + TIPO + VALOR + DESCRICAO + ATIVO
   */
  const porConteudo = {};

  registros.forEach(function(registro) {
    if (!registro.valor) return;

    const chave = [
      registro.forumId,
      registro.unidadeId,
      registro.setorId,
      normalizarChave(registro.tipo),
      normalizarChave(registro.valor),
      normalizarChave(registro.descricao),
      registro.ativo ? "1" : "0"
    ].join("|");

    if (!porConteudo[chave]) {
      porConteudo[chave] = [];
    }

    porConteudo[chave].push(registro);
  });

  const duplicadosConteudo = Object.keys(porConteudo)
    .filter(function(chave) {
      return porConteudo[chave].length > 1;
    })
    .map(function(chave) {
      return {
        chave: chave,
        quantidade: porConteudo[chave].length,
        registros: porConteudo[chave]
      };
    });

  /*
   * Coerência hierárquica:
   *
   * SETOR -> UNIDADE
   * UNIDADE -> FORUM
   */
  const mapaUnidades = DB.map(shUni);
  const mapaSetores = DB.map(shSet);

  const unidadeForum = {};
  const setorUnidade = {};

  DB.read(shUni).forEach(function(row) {
    const unidadeId = audV4Texto(
      audV4Campo(mapaUnidades, row, ["ID"])
    );

    const forumId = audV4Texto(
      audV4Campo(mapaUnidades, row, ["FORUM_ID"])
    );

    if (unidadeId) {
      unidadeForum[unidadeId] = forumId;
    }
  });

  DB.read(shSet).forEach(function(row) {
    const setorId = audV4Texto(
      audV4Campo(mapaSetores, row, ["ID"])
    );

    const unidadeId = audV4Texto(
      audV4Campo(mapaSetores, row, ["UNIDADE_ID"])
    );

    if (setorId) {
      setorUnidade[setorId] = unidadeId;
    }
  });

  const inconsistenciasHierarquia = [];

  registros.forEach(function(registro) {
    if (registro.setorId && registro.unidadeId) {
      const unidadeReal = setorUnidade[registro.setorId];

      if (
        unidadeReal &&
        unidadeReal !== registro.unidadeId
      ) {
        inconsistenciasHierarquia.push({
          tipo: "SETOR_UNIDADE_INCOMPATIVEL",
          linha: registro.linha,
          id: registro.id,
          setorId: registro.setorId,
          unidadeInformada: registro.unidadeId,
          unidadeReal: unidadeReal
        });
      }
    }

    if (registro.unidadeId && registro.forumId) {
      const forumReal = unidadeForum[registro.unidadeId];

      if (
        forumReal &&
        forumReal !== registro.forumId
      ) {
        inconsistenciasHierarquia.push({
          tipo: "UNIDADE_FORUM_INCOMPATIVEL",
          linha: registro.linha,
          id: registro.id,
          unidadeId: registro.unidadeId,
          forumInformado: registro.forumId,
          forumReal: forumReal
        });
      }
    }
  });

  const resultado = {
    ok:
      estatisticas.semId === 0 &&
      estatisticas.semTipo === 0 &&
      estatisticas.semValor === 0 &&
      estatisticas.tipoDesconhecido === 0 &&
      estatisticas.semVinculo === 0 &&
      estatisticas.vinculosInvalidos === 0 &&
      idsDuplicados.length === 0 &&
      inconsistenciasHierarquia.length === 0,

    estrutura: {
      municipios: DB.count(shMun),
      foruns: DB.count(shForum),
      unidades: DB.count(shUni),
      setores: DB.count(shSet),
      contatos: DB.count(shCon)
    },

    estatisticas: estatisticas,

    idsDuplicados: idsDuplicados,

    duplicadosDeConteudo: duplicadosConteudo,

    inconsistenciasHierarquia: inconsistenciasHierarquia,

    amostrasProblemas: problemasDetalhados.slice(0, 100)
  };

  Logger.log(
    JSON.stringify(resultado, null, 2)
  );

  return resultado;
}
