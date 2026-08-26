/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 06_ValidationService.gs
 * ==========================================================
 */

class ValidationService {
  validarTelefone(dados, idAtual) {
    const registro = ehObjeto(dados) ? dados : {};

    this.validarCamposObrigatorios(registro);

    const numero = textoSeguro(valorObjeto(registro, "numero", "Numero"));
    const ramal = textoSeguro(valorObjeto(registro, "ramal", "Ramal"));
    const whatsapp = textoSeguro(valorObjeto(registro, "whatsapp", "Whatsapp", "WhatsApp"));
    const emailC = textoSeguro(valorObjeto(registro, "email", "E_MAIL", "E-mail", "EMAIL"));
    const tipo = textoSeguro(valorObjeto(registro, "tipo", "Tipo"));
    // Single contact enforcement
    var preenchidos = [numero, ramal, whatsapp, emailC].filter(function(v){ return String(v||"").trim()!==""; });
    if (preenchidos.length === 0) {
      throw new Error("Informe ao menos um meio de contato: Telefone, Ramal, WhatsApp ou E-mail.");
    }
    if (preenchidos.length > 1) {
      throw new Error("Informe apenas um tipo de contato por vez.");
    }
    // Valida consistência Tipo vs campo preenchido
    if (tipo) {
      var tipoNorm = tipo.trim().toLowerCase();
      if (tipoNorm==="telefone" && !numero) throw new Error("Tipo Telefone selecionado, mas telefone não preenchido.");
      if (tipoNorm==="ramal" && !ramal) throw new Error("Tipo Ramal selecionado, mas ramal não preenchido.");
      if (tipoNorm==="whatsapp" && !whatsapp) throw new Error("Tipo WhatsApp selecionado, mas WhatsApp não preenchido.");
      if (tipoNorm==="e-mail" && !emailC) throw new Error("Tipo E-mail selecionado, mas e-mail não preenchido.");
      if (tipoNorm==="email" && !emailC) throw new Error("Tipo E-mail selecionado, mas e-mail não preenchido.");
    }
    if (emailC) this.validarEmail(emailC);

    this.validarNumero(numero);
    this.validarRamal(ramal);
    this.validarWhatsapp(whatsapp);
    this.validarDuplicidade(registro,idAtual);

    return true;
  }

  normalizarNumero(valor) {
    return String(valor || "")
      .replace(/\D/g, "");
  }

  validarTextoNumerico(valor, mensagem, minimo, maximo) {
    const texto = textoSeguro(valor);

    if (!texto) {
      return true;
    }

    if (!/^[0-9+().\-\s]+$/.test(texto)) {
      throw new Error(mensagem);
    }

    const digitos =this.normalizarNumero(texto);

    if (digitos.length < minimo || digitos.length > maximo) {
      throw new Error(mensagem);
    }

    return true;
  }

  validarDuplicidade(dados, idAtual) {
    // v3.34 — normalizado usa VALOR
    const numeroRaw = textoSeguro(valorObjeto(dados, "numero", "Numero", "valor", "VALOR", "Valor"));
    const numero = this.normalizarNumero(numeroRaw);

    if (!numero) {
      return;
    }

    const setor = textoSeguro(valorObjeto(dados, "setor", "Setor"));

    const telefones =
      new TelefoneRepository()
        .listar();

    const encontrado =
      telefones.find(item => {
        const itemId = textoSeguro(item.ID || item.id);

        if (idAtual && itemId === textoSeguro(idAtual)) {
          return false;
        }

        const setorExistente = textoSeguro(item.setor);

        const numeroExistente = this.normalizarNumero(item.numero);

        return (limparTexto(setorExistente) === limparTexto(setor) && numeroExistente === numero);
      });

    if (encontrado) {
      throw new Error("Já existe um telefone cadastrado para este setor com o mesmo número.");
    }
  }

  validarCamposObrigatorios(dados) {
    // V4 — MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS
    const temForum = textoSeguro(valorObjeto(dados, "forumId", "FORUM_ID", "forum_id", "forum", "FORUM"));
    const temUnidade = textoSeguro(valorObjeto(dados, "unidadeId", "UNIDADE_ID", "unidade_id", "unidade", "UNIDADE"));
    const temSetor = textoSeguro(valorObjeto(dados, "setorId", "SETOR_ID", "setor_id", "setor", "SETOR"));
    const isNormalizedCheck = (typeof DB !== "undefined" && DB.temModeloNormalizado && DB.temModeloNormalizado());
    const ehNormalizado = !!(temForum || temUnidade || temSetor || isNormalizedCheck);
    // Normalizado requer pelo menos um vínculo FORUM/UNIDADE/SETOR + TIPO
    if (ehNormalizado) {
      const faltantes = [];
      const temVinculo = !!(temForum || temUnidade || temSetor || textoSeguro(valorObjeto(dados, "setor", "Setor")) || textoSeguro(valorObjeto(dados, "comarca", "Comarca")));
      // Se veio setor nome legado, será resolvido em TelefoneRepository — não falha aqui se tem setor nome
      if (!temVinculo) faltantes.push("Fórum/Unidade/Setor");
      const tipoV = textoSeguro(valorObjeto(dados, "tipo", "Tipo"));
      if (!tipoV) faltantes.push("Tipo");
      if (faltantes.length > 0) {
        throw new Error("Por favor, preencha os campos obrigatórios: " + faltantes.join(", ") + ".");
      }
    } else {
      const regras = [{campo: "microrregiao", nome: "Microrregião"}, {campo: "comarca", nome: "Comarca"}, {campo: "setor", nome: "Setor"}, {campo: "tipo", nome: "Tipo"}];
      const faltantes = [];
      regras.forEach(regra => {
        const valor = textoSeguro(valorObjeto(dados,regra.campo));
        if (!valor) faltantes.push(regra.nome);
      });
      if (faltantes.length > 0) {
        throw new Error("Por favor, preencha os campos obrigatórios: " + faltantes.join(", ") + ".");
      }
    }

    const status = textoSeguro(valorObjeto(dados, "status", "Status")
      );

    if (status && !["ATIVO", "INATIVO"].includes(status.toUpperCase())
    ) {
      throw new Error("Status inválido.");
    }
  }

  validarNumero(numero) {
    return this.validarTextoNumerico(numero, "Número de telefone inválido.", 8, 13);
  }

  validarRamal(ramal) {
    return this.validarTextoNumerico(ramal, "Ramal inválido.", 1, 6);
  }

  validarWhatsapp(whatsapp) {
    return this.validarTextoNumerico(whatsapp, "WhatsApp inválido.", 10, 13);
  }

  validarEmail(email) {
    const texto = textoSeguro(email);
    if (!texto) return true;
    // Validação simples de e-mail institucional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
      throw new Error("E-mail inválido.");
    }
    return true;
  }
}