/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 04_TelefoneRepository.gs
 * ==========================================================
 */

class TelefoneRepository {
  constructor() {
    // v3.34 — detecta modelo normalizado (MUNICIPIOS/UNIDADES/SETORES/CONTATOS) vs flat TELEFONES
    this.modoNormalizado = false;
    try { this.modoNormalizado = DB.temModeloNormalizado(); } catch(e){ this.modoNormalizado = false; }
    if (this.modoNormalizado) {
      // Modo normalizado: não exige TELEFONES flat, mas inicializa headers vazios para compat
      this.sheet = null;
      this.headers = [];
      this.map = {};
      // Cache de join será carregado em listar()
    } else {
      this.sheet = DB.telefones();
      this.headers = DB.headers(this.sheet);
      this.map = DB.map(this.sheet);
      if (this.headers.length === 0) {
        throw new Error("A aba TELEFONES não possui cabeçalho.");
      }
    }
  }

  getColIdx(...nomes) {
    for (const nome of nomes) {
      const chave = normalizarChave(nome);
      if (this.map[chave] !== undefined) {
        return this.map[chave] - 1;
      }
    }
    return -1;
  }

  listar() {
    const cache = CACHE.obter(CACHE.chaveTelefones());
    if (Array.isArray(cache)) return cache;
    // v3.34 — modo normalizado: join MUNICIPIOS+UNIDADES+SETORES+CONTATOS → flat virtual
    if (this.modoNormalizado) {
      const resultado = this.listarNormalizado();
      CACHE.salvar(CACHE.chaveTelefones(), resultado, CONFIG.CACHE.TEMPO_PADRAO);
      return resultado;
    }
    const dados = DB.read(this.sheet);
    const resultado = dados.map(linha => this.rowToObject(linha));
    CACHE.salvar(CACHE.chaveTelefones(), resultado, CONFIG.CACHE.TEMPO_PADRAO);
    return resultado;
  }

  listarNormalizado() {
    // V4: MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS
    const shMun = DB.municipiosOuNulo();
    const shForum = DB.forumOuNulo();
    const shUni = DB.unidadesOuNulo();
    const shSet = DB.setoresOuNulo();
    const shCon = DB.contatosOuNulo();
    if (!shCon) return [];
    const dadosCon = DB.read(shCon);
    const mapCon = DB.map(shCon);
    const dadosSet = shSet ? DB.read(shSet) : [];
    const mapSet = shSet ? DB.map(shSet) : {};
    const dadosUni = shUni ? DB.read(shUni) : [];
    const mapUni = shUni ? DB.map(shUni) : {};
    const dadosForum = shForum ? DB.read(shForum) : [];
    const mapForum = shForum ? DB.map(shForum) : {};
    const dadosMun = shMun ? DB.read(shMun) : [];
    const mapMun = shMun ? DB.map(shMun) : {};
    // Indices CONTATOS
    const idxConId = mapCon.ID;
    const idxConForum = mapCon.FORUMID || mapCon.FORUM;
    const idxConUnidade = mapCon.UNIDADEID || mapCon.UNIDADE;
    const idxConSetor = mapCon.SETORID || mapCon.SETOR;
    const idxConTipo = mapCon.TIPO;
    const idxConDescr = mapCon.DESCRICAO;
    const idxConValor = mapCon.VALOR;
    const idxConAtivo = mapCon.ATIVO;
    const idxConObs = mapCon.OBSERVACAO;
    const idxConCri = mapCon.DATACRIACAO || mapCon.DATA;
    const idxConAtu = mapCon.DATAATUALIZACAO;
    // Mapas auxiliares
    const mapSetorById = {};
    const idxSetId = mapSet.ID; const idxSetUni = mapSet.UNIDADEID; const idxSetNome = mapSet.NOME; const idxSetEnd = mapSet.ENDERECO; const idxSetCep = mapSet.CEP;
    for (const r of dadosSet) {
      const id = idxSetId !== undefined ? textoSeguro(r[idxSetId - 1]) : "";
      if (!id) continue;
      mapSetorById[id] = {
        nome: idxSetNome !== undefined ? textoSeguro(r[idxSetNome - 1]) : "",
        unidadeId: idxSetUni !== undefined ? textoSeguro(r[idxSetUni - 1]) : "",
        endereco: idxSetEnd !== undefined ? textoSeguro(r[idxSetEnd - 1]) : "",
        cep: idxSetCep !== undefined ? textoSeguro(r[idxSetCep - 1]) : ""
      };
    }
    const mapUniById = {};
    const idxUniId = mapUni.ID; const idxUniForum = mapUni.FORUMID; const idxUniMun = mapUni.MUNICIPIOID; const idxUniNome = mapUni.NOME; const idxUniEnd = mapUni.ENDERECO; const idxUniCep = mapUni.CEP; const idxUniEmail = mapUni.EMAIL;
    for (const r of dadosUni) {
      const id = idxUniId !== undefined ? textoSeguro(r[idxUniId - 1]) : "";
      if (!id) continue;
      mapUniById[id] = {
        nome: idxUniNome !== undefined ? textoSeguro(r[idxUniNome - 1]) : "",
        forumId: idxUniForum !== undefined ? textoSeguro(r[idxUniForum - 1]) : "",
        municipioId: idxUniMun !== undefined ? textoSeguro(r[idxUniMun - 1]) : "",
        endereco: idxUniEnd !== undefined ? textoSeguro(r[idxUniEnd - 1]) : "",
        cep: idxUniCep !== undefined ? textoSeguro(r[idxUniCep - 1]) : "",
        email: idxUniEmail !== undefined ? textoSeguro(r[idxUniEmail - 1]) : ""
      };
    }
    const mapForumById = {};
    const idxForumId = mapForum.ID; const idxForumMun = mapForum.MUNICIPIOID; const idxForumNome = mapForum.NOME; const idxForumEnd = mapForum.ENDERECO; const idxForumCep = mapForum.CEP; const idxForumEmail = mapForum.EMAIL;
    for (const r of dadosForum) {
      const id = idxForumId !== undefined ? textoSeguro(r[idxForumId - 1]) : "";
      if (!id) continue;
      mapForumById[id] = {
        nome: idxForumNome !== undefined ? textoSeguro(r[idxForumNome - 1]) : "",
        municipioId: idxForumMun !== undefined ? textoSeguro(r[idxForumMun - 1]) : "",
        endereco: idxForumEnd !== undefined ? textoSeguro(r[idxForumEnd - 1]) : "",
        cep: idxForumCep !== undefined ? textoSeguro(r[idxForumCep - 1]) : "",
        email: idxForumEmail !== undefined ? textoSeguro(r[idxForumEmail - 1]) : ""
      };
    }
    const mapMunById = {};
    const idxMunId = mapMun.ID; const idxMunNome = mapMun.NOME; const idxMunMicro = mapMun.MICRORREGIAO;
    for (const r of dadosMun) {
      const id = idxMunId !== undefined ? textoSeguro(r[idxMunId - 1]) : "";
      if (!id) continue;
      mapMunById[id] = {
        nome: idxMunNome !== undefined ? textoSeguro(r[idxMunNome - 1]) : "",
        microrregiao: idxMunMicro !== undefined ? textoSeguro(r[idxMunMicro - 1]) : ""
      };
    }
    const resultado = [];
    for (const r of dadosCon) {
      const id = idxConId !== undefined ? textoSeguro(r[idxConId - 1]) : "";
      if (!id) continue;
      const forumIdRaw = idxConForum !== undefined ? textoSeguro(r[idxConForum - 1]) : "";
      const unidadeIdRaw = idxConUnidade !== undefined ? textoSeguro(r[idxConUnidade - 1]) : "";
      const setorIdRaw = idxConSetor !== undefined ? textoSeguro(r[idxConSetor - 1]) : "";
      const tipoRaw = idxConTipo !== undefined ? textoSeguro(r[idxConTipo - 1]) : "";
      const descr = idxConDescr !== undefined ? textoSeguro(r[idxConDescr - 1]) : "";
      const valorRaw = idxConValor !== undefined ? textoSeguro(r[idxConValor - 1]) : "";
      const ativoRaw = idxConAtivo !== undefined ? r[idxConAtivo - 1] : "TRUE";
      const obs = idxConObs !== undefined ? textoSeguro(r[idxConObs - 1]) : "";
      // Resolve MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS
      let setor = setorIdRaw ? (mapSetorById[setorIdRaw] || { nome: setorIdRaw, unidadeId: unidadeIdRaw, endereco: "", cep: "" }) : null;
      let unidadeIdEfetivo = setor ? setor.unidadeId : unidadeIdRaw;
      if (!unidadeIdEfetivo && unidadeIdRaw) unidadeIdEfetivo = unidadeIdRaw;
      let uni = unidadeIdEfetivo ? (mapUniById[unidadeIdEfetivo] || { nome: unidadeIdEfetivo, forumId: forumIdRaw, municipioId: "", endereco: "", cep: "", email: "" }) : null;
      let forumIdEfetivo = uni ? uni.forumId : forumIdRaw;
      if (!forumIdEfetivo && forumIdRaw) forumIdEfetivo = forumIdRaw;
      let forum = forumIdEfetivo ? (mapForumById[forumIdEfetivo] || { nome: forumIdEfetivo, municipioId: "", endereco: "", cep: "", email: "" }) : null;
      let municipioIdEfetivo = forum ? forum.municipioId : "";
      if (!municipioIdEfetivo && uni && uni.municipioId) municipioIdEfetivo = uni.municipioId;
      let mun = municipioIdEfetivo ? (mapMunById[municipioIdEfetivo] || { nome: municipioIdEfetivo, microrregiao: "" }) : { nome: "", microrregiao: "" };
      const munNome = mun.nome || municipioIdEfetivo || "";
      const microrregiao = mun.microrregiao || "";
      const endereco = (setor && setor.endereco) ? setor.endereco : (uni && uni.endereco ? uni.endereco : (forum ? forum.endereco : ""));
      const forumNome = forum ? forum.nome : "";
      const uniNome = uni ? uni.nome : "";
      const setorNome = setor ? setor.nome : (setorIdRaw && !setor ? setorIdRaw : "");
      let comarca = munNome;
      if (forumNome && forumNome !== munNome) {
        comarca = munNome ? (munNome + " (" + forumNome + ")") : forumNome;
        if (uniNome && uniNome !== forumNome) comarca += " - " + uniNome;
      } else if (uniNome) {
        comarca = munNome ? (munNome + " (" + uniNome + ")") : uniNome;
      }
      const ativoBool = paraBoolean(ativoRaw);
      const tipo = textoSeguro(tipoRaw);
      let numero = "", ramal = "", whatsapp = "", email = "";
      const valor = textoSeguro(valorRaw);
      const tipoNorm = normalizarChave(tipo);
      if (tipoNorm === "TELEFONE") numero = valor;
      else if (tipoNorm === "RAMAL") ramal = valor;
      else if (tipoNorm === "WHATSAPP") whatsapp = valor;
      else if (tipoNorm === "EMAIL" || tipoNorm === "E_MAIL") email = valor;
      else numero = valor;
      resultado.push({
        ID: id, id: id,
        microrregiao: microrregiao,
        comarca: comarca,
        municipio: munNome,
        municipioId: municipioIdEfetivo,
        forum: forumNome,
        forumId: forumIdEfetivo || "",
        unidade: uniNome,
        unidadeId: unidadeIdEfetivo || "",
        setor: setorNome,
        setorId: setorIdRaw,
        tipo: tipo,
        numero: numero,
        ramal: ramal,
        whatsapp: whatsapp,
        email: email,
        endereco: endereco,
        status: ativoBool ? "ATIVO" : "INATIVO",
        observacao: descr || obs,
        descricao: descr,
        valor: valor,
        DATA_CRIACAO: idxConCri !== undefined ? r[idxConCri - 1] : "",
        DATA_ATUALIZACAO: idxConAtu !== undefined ? r[idxConAtu - 1] : ""
      });
    }
    return resultado;
  }

  obter(id) {
    const idBusca = textoSeguro(id);
    if (!idBusca) return null;
    return this.listar().find(item => textoSeguro(item.ID || item.id) === idBusca) || null;
  }

  buscarPorId(id) { return this.obter(id); }

  pesquisar(texto) {
    const termo = limparTexto(texto);
    if (!termo) return this.listar();
    return this.listar().filter(item =>
      Object.values(item).map(valor => limparTexto(valor)).join(" ").includes(termo)
    );
  }

  inserir(dados) {
    // v3.34 — se modo normalizado, insere em CONTATOS (requer SETOR_ID)
    if (this.modoNormalizado) {
      return this.inserirNormalizado(dados);
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const entrada = ehObjeto(dados) ? dados : {};
      const id = new IdService().novoTelefone(this.sheet);
      const momento = new Date();

      const registro = {
        ID: id,
        id: id,
        microrregiao: textoSeguro(valorObjeto(entrada, "microrregiao", "Microrregiao")),
        comarca: textoSeguro(valorObjeto(entrada, "comarca", "Comarca")),
        setor: textoSeguro(valorObjeto(entrada, "setor", "Setor")),
        tipo: textoSeguro(valorObjeto(entrada, "tipo", "Tipo")),
        numero: textoSeguro(valorObjeto(entrada, "numero", "Numero", "TELEFONE", "Telefone")),
        ramal: textoSeguro(valorObjeto(entrada, "ramal", "Ramal")),
        whatsapp: textoSeguro(valorObjeto(entrada, "whatsapp", "Whatsapp", "WhatsApp")),
        email: textoSeguro(valorObjeto(entrada, "email", "EMAIL", "E_MAIL")),          // ← NOVO
        endereco: textoSeguro(valorObjeto(entrada, "endereco", "ENDERECO")),            // ← NOVO
        status: textoSeguro(valorObjeto(entrada, "status", "Status")) || "ATIVO",
        observacao: textoSeguro(valorObjeto(entrada, "observacao", "Observacao")),
        DATA_CRIACAO: momento,
        DATA_ATUALIZACAO: momento
      };

      new ValidationService().validarTelefone(registro);
      const linha = this.linhaDoObjeto(registro);
      this.sheet.getRange(this.sheet.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush();
      CACHE.limparTelefones();
      this.registrarHistoricoSeguro(id, "CRIACAO", {}, registro);
      return serializarParaCliente(registro);
    } finally {
      lock.releaseLock();
    }
  }

  inserirNormalizado(dados) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const entrada = ehObjeto(dados) ? dados : {};
      // V4: aceita FORUM_ID, UNIDADE_ID ou SETOR_ID (pelo menos um)
      let forumId = textoSeguro(valorObjeto(entrada, "forumId", "FORUM_ID", "forum_id", "forum"));
      let unidadeId = textoSeguro(valorObjeto(entrada, "unidadeId", "UNIDADE_ID", "unidade_id", "unidade"));
      let setorId = textoSeguro(valorObjeto(entrada, "setorId", "SETOR_ID", "setor_id", "setor"));
      // Compat: tenta resolver SETOR_ID por nome se veio nome em vez de ID (comarca+setor ou unidade+setor)
      if ((!setorId || !/^SET/i.test(setorId)) && (textoSeguro(valorObjeto(entrada, "comarca", "Comarca")) || textoSeguro(valorObjeto(entrada, "forum", "Forum", "FORUM")))) {
        const comarca = textoSeguro(valorObjeto(entrada, "comarca", "Comarca", "municipio", "Municipio"));
        const setorNome = setorId || textoSeguro(valorObjeto(entrada, "setor", "Setor"));
        const forumNome = textoSeguro(valorObjeto(entrada, "forum", "FORUM", "Forum"));
        if (setorNome) {
          try {
            const shSet = DB.setoresOuNulo(); const shUni = DB.unidadesOuNulo(); const shForum = DB.forumOuNulo(); const shMun = DB.municipiosOuNulo();
            if (shSet && shUni && shForum && shMun) {
              const dadosSet = DB.read(shSet); const mapSet = DB.map(shSet);
              const dadosUni = DB.read(shUni); const mapUni = DB.map(shUni);
              const dadosForum = DB.read(shForum); const mapForum = DB.map(shForum);
              const dadosMun = DB.read(shMun); const mapMun = DB.map(shMun);
              outer: for (const r of dadosSet) {
                const sNome = mapSet.NOME !== undefined ? textoSeguro(r[mapSet.NOME - 1]) : "";
                const sUniId = mapSet.UNIDADEID !== undefined ? textoSeguro(r[mapSet.UNIDADEID - 1]) : "";
                if (normalizarChave(sNome) !== normalizarChave(setorNome)) continue;
                for (const u of dadosUni) {
                  const uId = mapUni.ID !== undefined ? textoSeguro(u[mapUni.ID - 1]) : "";
                  if (uId !== sUniId) continue;
                  const uNome = mapUni.NOME !== undefined ? textoSeguro(u[mapUni.NOME - 1]) : "";
                  const uForumId = mapUni.FORUMID !== undefined ? textoSeguro(u[mapUni.FORUMID - 1]) : "";
                  for (const f of dadosForum) {
                    const fId = mapForum.ID !== undefined ? textoSeguro(f[mapForum.ID - 1]) : "";
                    if (uForumId && fId !== uForumId) continue;
                    const fNome = mapForum.NOME !== undefined ? textoSeguro(f[mapForum.NOME - 1]) : "";
                    const fMunId = mapForum.MUNICIPIOID !== undefined ? textoSeguro(f[mapForum.MUNICIPIOID - 1]) : "";
                    let mNome = "";
                    for (const m of dadosMun) {
                      const mId = mapMun.ID !== undefined ? textoSeguro(m[mapMun.ID - 1]) : "";
                      if (mId === fMunId) { mNome = mapMun.NOME !== undefined ? textoSeguro(m[mapMun.NOME - 1]) : ""; break; }
                    }
                    const labelComarca1 = mNome && fNome ? (mNome + " (" + fNome + ")") : (mNome || fNome || uNome);
                    const labelComarca2 = uNome ? (mNome ? (mNome + " (" + uNome + ")") : uNome) : "";
                    if (!comarca || normalizarChave(labelComarca1) === normalizarChave(comarca) || normalizarChave(labelComarca2) === normalizarChave(comarca) || normalizarChave(mNome) === normalizarChave(comarca) || normalizarChave(fNome) === normalizarChave(comarca) || normalizarChave(uNome) === normalizarChave(comarca) || (forumNome && normalizarChave(fNome) === normalizarChave(forumNome))) {
                      setorId = mapSet.ID !== undefined ? textoSeguro(r[mapSet.ID - 1]) : "";
                      if (setorId) { forumId = forumId || fId; unidadeId = unidadeId || uId; break outer; }
                    }
                  }
                }
              }
            }
          } catch(e){}
        }
      }
      // Auto-complete: se tem setor, deriva unidade/forum; se tem unidade, deriva forum
      if (setorId && (!unidadeId || !forumId)) {
        try {
          const shSet = DB.setoresOuNulo(); const shUni = DB.unidadesOuNulo();
          if (shSet) {
            const dadosSet = DB.read(shSet); const mapSet = DB.map(shSet);
            for (const r of dadosSet) {
              const sId = mapSet.ID !== undefined ? textoSeguro(r[mapSet.ID - 1]) : "";
              if (sId === setorId) {
                const sUniId = mapSet.UNIDADEID !== undefined ? textoSeguro(r[mapSet.UNIDADEID - 1]) : "";
                if (sUniId && !unidadeId) unidadeId = sUniId;
                break;
              }
            }
          }
          if (unidadeId && !forumId) {
            const shUni = DB.unidadesOuNulo();
            if (shUni) {
              const dadosUni = DB.read(shUni); const mapUni = DB.map(shUni);
              for (const u of dadosUni) {
                const uId = mapUni.ID !== undefined ? textoSeguro(u[mapUni.ID - 1]) : "";
                if (uId === unidadeId) {
                  const uForum = mapUni.FORUMID !== undefined ? textoSeguro(u[mapUni.FORUMID - 1]) : "";
                  if (uForum) forumId = uForum;
                  break;
                }
              }
            }
          }
        } catch(e){}
      } else if (unidadeId && !forumId) {
        try {
          const shUni = DB.unidadesOuNulo();
          if (shUni) {
            const dadosUni = DB.read(shUni); const mapUni = DB.map(shUni);
            for (const u of dadosUni) {
              const uId = mapUni.ID !== undefined ? textoSeguro(u[mapUni.ID - 1]) : "";
              if (uId === unidadeId) {
                const uForum = mapUni.FORUMID !== undefined ? textoSeguro(u[mapUni.FORUMID - 1]) : "";
                if (uForum) forumId = uForum;
                break;
              }
            }
          }
        } catch(e){}
      }
      if (!forumId && !unidadeId && !setorId) throw new Error("Informe Fórum, Unidade ou Setor (FORUM_ID, UNIDADE_ID ou SETOR_ID).");
      const tipo = textoSeguro(valorObjeto(entrada, "tipo", "Tipo")) || "Telefone";
      const valor = textoSeguro(valorObjeto(entrada, "valor", "VALOR", "numero", "Numero", "telefone", "Telefone", "ramal", "Ramal", "whatsapp", "Whatsapp", "email", "EMAIL")) || textoSeguro(valorObjeto(entrada, "numero"));
      const descricao = textoSeguro(valorObjeto(entrada, "descricao", "DESCRICAO", "observacao", "Observacao"));
      const id = new IdService().novoContato(DB.contatos());
      const momento = new Date();
      const shCon = DB.contatos();
      const headers = DB.headers(shCon);
      const ativo = "TRUE";
      const linhaObj = {};
      headers.forEach(h => {
        const k = normalizarChave(h);
        if (k === "ID") linhaObj[h] = id;
        else if (k === "FORUMID") linhaObj[h] = forumId;
        else if (k === "UNIDADEID") linhaObj[h] = unidadeId;
        else if (k === "SETORID" || k === "SETOR") linhaObj[h] = setorId;
        else if (k === "TIPO") linhaObj[h] = tipo;
        else if (k === "DESCRICAO") linhaObj[h] = descricao;
        else if (k === "VALOR") linhaObj[h] = valor;
        else if (k === "ATIVO") linhaObj[h] = ativo;
        else if (k === "DATACRIACAO") linhaObj[h] = momento;
        else if (k === "DATAATUALIZACAO") linhaObj[h] = momento;
        else if (k === "OBSERVACAO") linhaObj[h] = descricao;
        else if (k === "ORDEM") linhaObj[h] = valorObjeto(entrada, "ordem", "ORDEM") || "";
        else linhaObj[h] = "";
      });
      const linha = headers.map(h => linhaObj[h] !== undefined ? linhaObj[h] : "");
      shCon.getRange(shCon.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush(); CACHE.limparTelefones();
      const registro = { ID: id, id: id, forumId: forumId, unidadeId: unidadeId, setorId: setorId, tipo: tipo, valor: valor, descricao: descricao, status: "ATIVO", DATA_CRIACAO: momento, DATA_ATUALIZACAO: momento };
      this.registrarHistoricoSeguro(id, "CRIACAO", {}, registro);
      return serializarParaCliente(registro);
    } finally { lock.releaseLock(); }
  }

  atualizar(id, dados) {
    // v3.34 — modo normalizado
    if (this.modoNormalizado) { return this.atualizarNormalizado(id, dados); }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id);
      if (!idBusca) throw new Error("ID do telefone é obrigatório.");

      const entrada = ehObjeto(dados) ? dados : {};
      const atual = this.obter(idBusca);
      if (!atual) throw new Error("Telefone não encontrado para o ID: " + idBusca);

      const escolherCampo = (campo, fallback) => {
        if (possuiCampo(entrada, campo)) return textoSeguro(valorObjeto(entrada, campo));
        return fallback;
      };

      const novo = {
        ID: textoSeguro(atual.ID || atual.id) || idBusca,
        id: textoSeguro(atual.ID || atual.id) || idBusca,
        microrregiao: escolherCampo("microrregiao", textoSeguro(atual.microrregiao)),
        comarca: escolherCampo("comarca", textoSeguro(atual.comarca)),
        setor: escolherCampo("setor", textoSeguro(atual.setor)),
        tipo: escolherCampo("tipo", textoSeguro(atual.tipo)),
        numero: escolherCampo("numero", textoSeguro(atual.numero)),
        ramal: escolherCampo("ramal", textoSeguro(atual.ramal)),
        whatsapp: escolherCampo("whatsapp", textoSeguro(atual.whatsapp)),
        email: escolherCampo("email", textoSeguro(atual.email)),          // ← NOVO
        endereco: escolherCampo("endereco", textoSeguro(atual.endereco)), // ← NOVO
        status: escolherCampo("status", textoSeguro(atual.status)) || "ATIVO",
        observacao: escolherCampo("observacao", textoSeguro(atual.observacao)),
        DATA_CRIACAO: dataValida(atual.DATACRIACAO, new Date()),
        DATA_ATUALIZACAO: new Date()
      };

      new ValidationService().validarTelefone(novo, idBusca);
      const numeroLinha = this.buscarLinha(idBusca);
      if (!numeroLinha) throw new Error("Linha do telefone não encontrada.");

      const linha = this.linhaDoObjeto(novo);
      this.sheet.getRange(numeroLinha, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush();
      CACHE.limparTelefones();
      this.registrarHistoricoSeguro(idBusca, "EDICAO", atual, novo);
      return serializarParaCliente(novo);
    } finally {
      lock.releaseLock();
    }
  }

  excluirNormalizado(id) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id); if (!idBusca) throw new Error("ID obrigatório.");
      const shCon = DB.contatos(); const dados = DB.read(shCon); const mapa = DB.map(shCon);
      const idxId = mapa.ID; if (!idxId) throw new Error("CONTATOS sem ID");
      let linhaNum = null, atual = null;
      for (let i=0;i<dados.length;i++) {
        if (textoSeguro(dados[i][idxId - 1]) === idBusca) { linhaNum = i+2; atual = dados[i]; break; }
      }
      if (!linhaNum) throw new Error("Contato não encontrado.");
      shCon.deleteRow(linhaNum); CACHE.limparTelefones();
      this.registrarHistoricoSeguro(idBusca, "EXCLUSAO", {ID:idBusca}, {});
      return true;
    } finally { lock.releaseLock(); }
  }

  atualizarNormalizado(id, dados) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id); if (!idBusca) throw new Error("ID obrigatório.");
      const entrada = ehObjeto(dados) ? dados : {};
      const shCon = DB.contatos(); const headers = DB.headers(shCon); const mapCon = DB.map(shCon);
      const dadosAll = DB.read(shCon); const idxId = mapCon.ID;
      let linhaNum = null; let atualRow = null;
      for (let i=0;i<dadosAll.length;i++) if (textoSeguro(dadosAll[i][idxId - 1]) === idBusca) { linhaNum = i+2; atualRow = dadosAll[i]; break; }
      if (!linhaNum) throw new Error("Contato não encontrado: " + idBusca);
      const tipo = possuiCampo(entrada, "tipo") ? textoSeguro(valorObjeto(entrada, "tipo")) : textoSeguro(atualRow[mapCon.TIPO - 1]);
      const valor = possuiCampo(entrada, "valor") || possuiCampo(entrada, "numero") ? textoSeguro(valorObjeto(entrada, "valor", "VALOR", "numero", "Numero")) : textoSeguro(atualRow[mapCon.VALOR - 1]);
      const descr = possuiCampo(entrada, "descricao") ? textoSeguro(valorObjeto(entrada, "descricao", "DESCRICAO")) : (mapCon.DESCRICAO !== undefined ? textoSeguro(atualRow[mapCon.DESCRICAO - 1]) : "");
      const ativo = possuiCampo(entrada, "status") ? (paraBoolean(valorObjeto(entrada, "status")) ? "TRUE" : "FALSE") : textoSeguro(atualRow[mapCon.ATIVO - 1]) || "TRUE";
      let forumId = possuiCampo(entrada, "forumId", "FORUM_ID") ? textoSeguro(valorObjeto(entrada, "forumId", "FORUM_ID")) : (mapCon.FORUMID !== undefined ? textoSeguro(atualRow[mapCon.FORUMID - 1]) : "");
      let unidadeId = possuiCampo(entrada, "unidadeId", "UNIDADE_ID") ? textoSeguro(valorObjeto(entrada, "unidadeId", "UNIDADE_ID")) : (mapCon.UNIDADEID !== undefined ? textoSeguro(atualRow[mapCon.UNIDADEID - 1]) : "");
      let setorId = possuiCampo(entrada, "setorId", "SETOR_ID", "setor", "setor_id") ? textoSeguro(valorObjeto(entrada, "setorId", "SETOR_ID", "setor", "setor_id")) : (mapCon.SETORID !== undefined ? textoSeguro(atualRow[mapCon.SETORID - 1]) : (mapCon.SETOR !== undefined ? textoSeguro(atualRow[mapCon.SETOR - 1]) : ""));
      if (possuiCampo(entrada, "setorId", "SETOR_ID") && setorId) {
        try {
          const shSet = DB.setoresOuNulo();
          if (shSet) {
            const dSet = DB.read(shSet); const mSet = DB.map(shSet);
            for (const r of dSet) {
              const sId = mSet.ID !== undefined ? textoSeguro(r[mSet.ID - 1]) : "";
              if (sId === setorId) {
                const sUni = mSet.UNIDADEID !== undefined ? textoSeguro(r[mSet.UNIDADEID - 1]) : "";
                if (sUni && !unidadeId) unidadeId = sUni;
                if (sUni) {
                  const shUni = DB.unidadesOuNulo();
                  if (shUni) {
                    const dUni = DB.read(shUni); const mUni = DB.map(shUni);
                    for (const u of dUni) {
                      const uId = mUni.ID !== undefined ? textoSeguro(u[mUni.ID - 1]) : "";
                      if (uId === sUni) {
                        const uForum = mUni.FORUMID !== undefined ? textoSeguro(u[mUni.FORUMID - 1]) : "";
                        if (uForum && !forumId) forumId = uForum;
                        break;
                      }
                    }
                  }
                }
                break;
              }
            }
          }
        } catch(e){}
      } else if (possuiCampo(entrada, "unidadeId", "UNIDADE_ID") && unidadeId && !forumId) {
        try {
          const shUni = DB.unidadesOuNulo();
          if (shUni) {
            const dUni = DB.read(shUni); const mUni = DB.map(shUni);
            for (const u of dUni) {
              const uId = mUni.ID !== undefined ? textoSeguro(u[mUni.ID - 1]) : "";
              if (uId === unidadeId) {
                const uForum = mUni.FORUMID !== undefined ? textoSeguro(u[mUni.FORUMID - 1]) : "";
                if (uForum) forumId = uForum;
                break;
              }
            }
          }
        } catch(e){}
      }
      const momento = new Date();
      const linhaObj = {};
      headers.forEach(h => {
        const k = normalizarChave(h);
        if (k === "ID") linhaObj[h] = idBusca;
        else if (k === "FORUMID") linhaObj[h] = forumId;
        else if (k === "UNIDADEID") linhaObj[h] = unidadeId;
        else if (k === "SETORID" || k === "SETOR") linhaObj[h] = setorId;
        else if (k === "TIPO") linhaObj[h] = tipo;
        else if (k === "DESCRICAO") linhaObj[h] = descr;
        else if (k === "VALOR") linhaObj[h] = valor;
        else if (k === "ATIVO") linhaObj[h] = ativo;
        else if (k === "DATAATUALIZACAO") linhaObj[h] = momento;
        else if (k === "DATACRIACAO") linhaObj[h] = atualRow[mapCon.DATACRIACAO - 1] || momento;
        else if (k === "ORDEM") linhaObj[h] = possuiCampo(entrada, "ordem", "ORDEM") ? textoSeguro(valorObjeto(entrada, "ordem", "ORDEM")) : (mapCon.ORDEM !== undefined ? textoSeguro(atualRow[mapCon.ORDEM - 1]) : "");
        else if (k === "OBSERVACAO") linhaObj[h] = possuiCampo(entrada, "observacao", "OBSERVACAO") ? textoSeguro(valorObjeto(entrada, "observacao", "OBSERVACAO")) : (mapCon.OBSERVACAO !== undefined ? textoSeguro(atualRow[mapCon.OBSERVACAO - 1]) : descr);
        else linhaObj[h] = atualRow[mapCon[k] - 1] !== undefined ? atualRow[mapCon[k] - 1] : "";
      });
      const linha = headers.map(h => linhaObj[h] !== undefined ? linhaObj[h] : "");
      shCon.getRange(linhaNum, 1, 1, linha.length).setValues([linha]);
      SpreadsheetApp.flush(); CACHE.limparTelefones();
      const novo = { ID: idBusca, id: idBusca, forumId: forumId, unidadeId: unidadeId, setorId: setorId, tipo: tipo, valor: valor, descricao: descr, status: ativo === "TRUE" ? "ATIVO" : "INATIVO" };
      this.registrarHistoricoSeguro(idBusca, "EDICAO", {ID:idBusca}, novo);
      return serializarParaCliente(novo);
    } finally { lock.releaseLock(); }
  }

  excluir(id) {
    // v3.34 — modo normalizado
    if (this.modoNormalizado) { return this.excluirNormalizado(id); }
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const idBusca = textoSeguro(id);
      if (!idBusca) throw new Error("ID do telefone é obrigatório.");
      const atual = this.obter(idBusca);
      if (!atual) throw new Error("Telefone não encontrado.");
      const linha = this.buscarLinha(idBusca);
      if (!linha) throw new Error("Linha do telefone não encontrada.");
      this.sheet.deleteRow(linha);
      CACHE.limparTelefones();
      this.registrarHistoricoSeguro(idBusca, "EXCLUSAO", atual, {});
      return true;
    } finally {
      lock.releaseLock();
    }
  }

  registrarHistoricoSeguro(telefoneId, acao, antes, depois) {
    try {
      new HistoryService().registrar(telefoneId, acao, antes, depois);
    } catch (erro) {
      console.warn("Falha ao registrar histórico:", erro);
    }
  }

  rowToObject(linha) {
    const getVal = (...nomes) => {
      const idx = this.getColIdx(...nomes);
      if (idx === -1 || linha[idx] === undefined || linha[idx] === null) return "";
      return linha[idx];
    };

    return {
      ID: getVal("ID"),
      id: getVal("ID"),
      microrregiao: getVal("MICRORREGIAO", "Microrregiao"),
      comarca: getVal("COMARCA"),
      setor: getVal("SETOR"),
      tipo: getVal("TIPO"),
      numero: getVal("TELEFONE", "NUMERO", "Telefone", "Numero"),
      ramal: getVal("RAMAL"),
      whatsapp: getVal("WHATSAPP", "Whatsapp", "WhatsApp"),
      email: getVal("E_MAIL", "EMAIL"),         // ← NOVO
      endereco: getVal("ENDERECO"),             // ← NOVO
      status: getVal("STATUS") || "ATIVO",
      observacao: getVal("OBSERVACAO", "Observacao"),
      DATA_CRIACAO: getVal("CRIADOEM", "DATA_CRIACAO", "CREATED_AT", "CREATEDAT"),
      DATA_ATUALIZACAO: getVal("ATUALIZADOEM", "DATA_ATUALIZACAO", "UPDATED_AT", "UPDATEDAT")
    };
  }

  objectToRow(objeto) { return this.linhaDoObjeto(objeto); }

  buscarLinha(id) {
    const idBusca = textoSeguro(id);
    if (!idBusca) return null;
    if (this.modoNormalizado) {
      const shCon = DB.contatosOuNulo(); if (!shCon) return null;
      const idxId = DB.map(shCon).ID; if (!idxId) return null;
      const dados = DB.read(shCon);
      for (let i=0;i<dados.length;i++) if (textoSeguro(dados[i][idxId - 1]) === idBusca) return i+2;
      return null;
    }
    const ultimaLinha = this.sheet.getLastRow();
    if (ultimaLinha <= 1) return null;
    const idxID = this.map["ID"];
    if (!idxID) throw new Error("A aba TELEFONES não possui a coluna ID.");
    const dados = this.sheet.getRange(2, idxID, ultimaLinha - 1, 1).getValues();
    for (let i = 0; i < dados.length; i++) {
      if (textoSeguro(dados[i][0]) === idBusca) return i + 2;
    }
    return null;
  }

  linhaDoObjeto(objeto) {
    return this.headers.map(header => {
      const chave = normalizarChave(header);
      switch (chave) {
        case "ID": return textoSeguro(valorObjeto(objeto, "ID", "id"));
        case "MICROREGIAO": return textoSeguro(valorObjeto(objeto, "microrregiao", "Microrregiao"));
        case "COMARCA": return textoSeguro(valorObjeto(objeto, "comarca", "Comarca"));
        case "SETOR": return textoSeguro(valorObjeto(objeto, "setor", "Setor"));
        case "TIPO": return textoSeguro(valorObjeto(objeto, "tipo", "Tipo"));
        case "NUMERO":
        case "TELEFONE":
          return textoSeguro(valorObjeto(objeto, "numero", "Numero", "TELEFONE", "Telefone"));
        case "RAMAL": return textoSeguro(valorObjeto(objeto, "ramal", "Ramal"));
        case "WHATSAPP": return textoSeguro(valorObjeto(objeto, "whatsapp", "Whatsapp", "WhatsApp"));
        case "E_MAIL": case "EMAIL": return textoSeguro(valorObjeto(objeto, "email", "EMAIL", "E_MAIL"));
        case "ENDERECO": return textoSeguro(valorObjeto(objeto, "endereco", "ENDERECO"));
        case "STATUS": return textoSeguro(valorObjeto(objeto, "status", "Status")) || "ATIVO";
        case "OBSERVACAO": return textoSeguro(valorObjeto(objeto, "observacao", "Observacao"));
        case "CRIADOEM": case "DATACRIACAO": case "CREATEDAT":
          return dataValida(valorObjeto(objeto, "DATA_CRIACAO", "criadoEm", "created_at", "createdAt"), new Date());
        case "ATUALIZADOEM": case "DATAATUALIZACAO": case "UPDATEDAT":
          return dataValida(valorObjeto(objeto, "DATA_ATUALIZACAO", "atualizadoEm", "updated_at", "updatedAt"), new Date());
        default: return valorObjeto(objeto, header) || "";
      }
    });
  }
}
