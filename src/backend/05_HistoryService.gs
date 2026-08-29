/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 05_HistoryService.gs
 * ==========================================================
 */

class HistoryService {
  constructor() {
    this.sheet = this.obterAbaHistorico();
    this.headers = DB.headers(this.sheet);
    this.map = DB.map(this.sheet);
  }

  obterAbaHistorico() {
    const ss = DB.getSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.HISTORICO);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEETS.HISTORICO);

      sheet.appendRow([
        "ID",
        "TELEFONE_ID",
        "ACAO",
        "ANTES",
        "DEPOIS",
        "USUARIO",
        "DATA"
      ]);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "ID",
        "TELEFONE_ID",
        "ACAO",
        "ANTES",
        "DEPOIS",
        "USUARIO",
        "DATA"
      ]);
    }

    return sheet;
  }

  getValorLinha(linha, ...nomes) {
    for (const nome of nomes) {
      const chave = normalizarChave(nome);
      const idx = this.map[chave];

      if (
        idx !== undefined &&
        linha[idx - 1] !== undefined
      ) {
        return linha[idx - 1];
      }
    }

    return "";
  }

  normalizarAcao(acao) {
    const valor = String(acao || "")
      .trim()
      .toUpperCase();

    switch (valor) {
      case "CRIACAO":
      case "CRIAÇÃO":
        return "CRIACAO";

      case "EDICAO":
      case "EDIÇÃO":
        return "EDICAO";

      case "EXCLUSAO":
      case "EXCLUSÃO":
        return "EXCLUSAO";

      default:
        return valor || "ALTERACAO";
    }
  }

  obterUsuarioAtual() {
    try {
      const atual =
        new AuthService().usuarioAtual();

      if (
        atual &&
        atual.email
      ) {
        return String(atual.email).trim();
      }

      const email =
        AuthService.obterEmailAtivo();

      if (email) {
        return String(email).trim();
      }
    } catch (erro) {
      console.error(
        "Erro ao obter usuário do histórico:",
        erro
      );
    }

    return "SISTEMA";
  }

  /**
   * Registra uma alteração.
   *
   * Estrutura:
   * ID | TELEFONE_ID | ACAO | ANTES | DEPOIS | USUARIO | DATA
   */
  registrar(telefoneId, acao, antes, depois) {
    const id =
      Utilities.getUuid();

    const usuario =
      this.obterUsuarioAtual();

    const registro = {
      ID: id,
      TELEFONE_ID:
        textoSeguro(telefoneId),

      ACAO:
        this.normalizarAcao(acao),

      ANTES:
        JSON.stringify(
          antes || {}
        ),

      DEPOIS:
        JSON.stringify(
          depois || {}
        ),

      USUARIO:
        usuario,

      DATA:
        new Date()
    };

    const linha =
      this.headers.map(header => {
        switch (
          normalizarChave(header)
        ) {
          case "ID":
            return registro.ID;

          case "TELEFONEID":
          case "TELEFONE_ID":
            return registro.TELEFONE_ID;

          case "ACAO":
            return registro.ACAO;

          case "ANTES":
            return registro.ANTES;

          case "DEPOIS":
            return registro.DEPOIS;

          case "USUARIO":
          case "USUARIOS":
            return registro.USUARIO;

          case "DATA":
          case "DATACRIACAO":
            return registro.DATA;

          default:
            return "";
        }
      });

    const linhaDestino =
      this.sheet.getLastRow() + 1;

    this.sheet
      .getRange(
        linhaDestino,
        1,
        1,
        linha.length
      )
      .setValues([linha]);

    return id;
  }

  /**
   * Lista o histórico de um telefone.
   */
  listar(telefoneId) {
    const idBusca =
      textoSeguro(telefoneId);

    if (!idBusca) {
      return [];
    }

    return DB.read(this.sheet)
      .filter(linha =>
        textoSeguro(
          this.getValorLinha(
            linha,
            "TELEFONE_ID",
            "TelefoneID"
          )
        ) === idBusca
      )
      .map(linha =>
        this.linhaParaObjeto(linha)
      );
  }

  /**
   * Lista todo o histórico.
   */
  listarTodos() {
    return DB.read(this.sheet)
      .map(linha =>
        this.linhaParaObjeto(linha)
      );
  }

  /**
   * v3.32: Lista histórico filtrado por comarcas permitidas (Gestor Conteúdo).
   * Se comarcasPermitidas for null ou vazio, retorna todo o histórico.
   */
  listarFiltradoPorComarcas(comarcasPermitidas) {
    const todos = this.listarTodos();
    if (!Array.isArray(comarcasPermitidas) || comarcasPermitidas.length === 0) {
      if (comarcasPermitidas === null) return todos;
      return todos;
    }
    const permitidas = comarcasPermitidas.map(c => normalizarChave(c));
    return todos.filter(item => {
      try {
        const antes = this.parseJSON(item.antes);
        const depois = this.parseJSON(item.depois);
        const snapshot = (depois && Object.keys(depois).length) ? depois : antes;
        const comarca = String((snapshot && (snapshot.comarca || snapshot.COMARCA)) || "").trim();
        if (!comarca) return true;
        return permitidas.includes(normalizarChave(comarca));
      } catch (e) { return true; }
    });
  }

  /**
   * Converte uma linha da planilha em objeto.
   */
  linhaParaObjeto(linha) {
    return {
      id:
        this.getValorLinha(
          linha,
          "ID"
        ),

      telefoneId:
        this.getValorLinha(
          linha,
          "TELEFONE_ID",
          "TelefoneID"
        ),

      acao:
        this.getValorLinha(
          linha,
          "ACAO",
          "Acao"
        ),

      antes:
        this.parseJSON(
          this.getValorLinha(
            linha,
            "ANTES",
            "Antes"
          )
        ),

      depois:
        this.parseJSON(
          this.getValorLinha(
            linha,
            "DEPOIS",
            "Depois"
          )
        ),

      usuario:
        this.getValorLinha(
          linha,
          "USUARIO",
          "Usuario"
        ),

      data:
        this.getValorLinha(
          linha,
          "DATA",
          "Data"
        )
    };
  }

  parseJSON(valor) {
    if (
      valor === null ||
      valor === undefined ||
      String(valor).trim() === ""
    ) {
      return {};
    }

    if (
      typeof valor === "object"
    ) {
      return valor;
    }

    try {
      return JSON.parse(
        String(valor)
      );
    } catch (erro) {
      return {
        detalhes:
          String(valor)
      };
    }
  }
}