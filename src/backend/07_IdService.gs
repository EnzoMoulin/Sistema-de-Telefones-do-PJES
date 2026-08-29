/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 07_IdService.gs
 * ==========================================================
 */

class IdService {
  novoTelefone() {
    return this.gerarId("TEL");
  }

  novoHistorico() {
    return this.gerarId("HIS");
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