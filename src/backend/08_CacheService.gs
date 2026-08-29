/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 08_CacheService.gs
 * ==========================================================
 */

class CacheServiceTJES {
  constructor() {
    this.cache = null;
  }

  obterCache() {
    if (!this.cache) {
      this.cache = CacheService.getScriptCache();
    }

    return this.cache;
  }

  chaveTelefones() {
    return CONFIG.CACHE.CHAVE_TELEFONES;
  }

  salvar(chave, dados, segundos) {
    const texto = JSON.stringify(dados);

    /**
     * O limite documentado do CacheService
     * é aproximadamente 100 KB por entrada.
     * Mantemos margem de segurança.
     */
    if (texto.length > 95000) {
      return false;
    }

    const tempo = Math.min(Math.max(Number(segundos || CONFIG.CACHE.TEMPO_PADRAO),1),21600);

    try {
      this.obterCache().put(String(chave), texto, tempo);

      return true;
    } catch (erro) {
      console.warn("Falha ao salvar cache:", erro);

      return false;
    }
  }

  obter(chave) {
    try {
      const valor = this.obterCache().get(String(chave));

      if (!valor) {
        return null;
      }

      return JSON.parse(valor);
    } catch (erro) {
      this.remover(chave);
      return null;
    }
  }

  remover(chave) {
    try {
      this.obterCache().remove(String(chave));
    } catch (erro) {
      console.warn("Falha ao remover cache:", erro);
    }
  }

  limparTelefones() {
    this.remover(this.chaveTelefones());
  }

  limparTudo() {
    this.limparTelefones();
  }
}

const CACHE =
  new CacheServiceTJES();