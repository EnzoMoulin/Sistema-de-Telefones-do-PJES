/**
 * Endurecimento da camada de compatibilidade.
 *
 * Os endpoints v4* continuam públicos para compatibilidade com telas antigas do
 * Apps Script. A função de autorização usada por eles é substituída pela mesma
 * política estrita do serviço novo, evitando um caminho alternativo que permita
 * ao Gestor de Conteúdo atuar fora do Fórum ou da Unidade explicitamente autorizados.
 */
(function aplicarEscopoEstritoNosEndpointsLegados() {
  _v4EscopoPermitido = function(usuario, forumId, noId) {
    return _cgPodeGerenciar(usuario, forumId, noId);
  };
})();
