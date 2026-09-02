/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 07_IdService.gs
 * ==========================================================
 */

class IdService {
  novoContato(sheet, deslocamento) {
    return this.gerarSequencial(
      sheet || DB.contatos(),
      "C",
      6,
      deslocamento
    );
  }

  novoTelefone(sheet, deslocamento) {
    return this.novoContato(sheet, deslocamento);
  }

  novoUsuario(sheet, deslocamento) {
    return this.gerarSequencial(
      sheet || DB.usuarios(),
      "USR",
      4,
      deslocamento
    );
  }

  novaSolicitacaoAcesso(sheet, deslocamento) {
    return this.gerarSequencial(
      sheet || DB.solicitacoesAcesso(),
      "ID",
      4,
      deslocamento
    );
  }

  novoAcessoUnidade(sheet, deslocamento) {
    return this.gerarSequencial(
      sheet || DB.acessosUnidades(),
      "ID",
      4,
      deslocamento
    );
  }

  novaNotificacao(sheet, deslocamento) {
    return this.gerarSequencial(
      sheet || DB.notificacoes(),
      "N",
      4,
      deslocamento
    );
  }

  novoHistorico(sheet, deslocamento) {
    return this.gerarSequencial(
      sheet || DB.historico(),
      "HIS",
      4,
      deslocamento
    );
  }

  novoLog(sheet, deslocamento) {
    return this.gerarSequencial(
      sheet || DB.log(),
      "LOG",
      4,
      deslocamento
    );
  }

  gerarSequencial(sheet, prefixo, digitos, deslocamento) {
    if (!sheet) {
      throw new Error("Aba não informada para geração do ID.");
    }

    const prefixoExato = String(prefixo === null || prefixo === undefined ? "" : prefixo);
    const largura = Number(digitos);
    const adicional = Math.max(Math.floor(Number(deslocamento) || 0), 0);
    if (!prefixoExato.trim() || !Number.isInteger(largura) || largura <= 0) {
      throw new Error("Padrão inválido para geração do ID.");
    }

    const mapa = DB.map(sheet);
    const colunaId = mapa.ID;
    if (!colunaId) {
      throw new Error("A aba '" + sheet.getName() + "' não possui a coluna ID.");
    }

    const ultimaLinha = sheet.getLastRow();
    const valores = ultimaLinha > 1
      ? sheet.getRange(2, colunaId, ultimaLinha - 1, 1).getDisplayValues()
      : [];
    const prefixoRegex = prefixoExato.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const padrao = new RegExp("^" + prefixoRegex + "(\\d+)$");
    let maior = 0;

    valores.forEach(function(linha) {
      const correspondencia = String(linha[0] || "").trim().match(padrao);
      if (correspondencia) {
        maior = Math.max(maior, Number(correspondencia[1]) || 0);
      }
    });

    return prefixoExato + String(maior + adicional + 1).padStart(largura, "0");
  }

  gerarId(prefixo) {
    const valor =
      textoSeguro(prefixo)
        .toUpperCase();

    if (!valor) {
      throw new Error("Prefixo do ID não informado.");
    }

    return (valor + "-" + Utilities.getUuid());
  }
}
