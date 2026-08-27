/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 01_Config.gs
 * ==========================================================
 */

const CONFIG = {
  SISTEMA: {
    NOME: "Sistema Inteligente de Gestão de Telefones do Poder Judiciário do Estado do Espírito Santo",
    VERSAO: "4.4"
  },

  WEB_APP: {
    URL_PUBLICA: "https://script.google.com/macros/s/AKfycbxvv83bMKSzHkZN_aDvzHdiI1z7KMB4DM-lynPVJOLDAtFaqYQhPJ3_BNuWo9ed2uoO/exec",
    URL_ADMIN: "https://script.google.com/macros/s/AKfycbxvv83bMKSzHkZN_aDvzHdiI1z7KMB4DM-lynPVJOLDAtFaqYQhPJ3_BNuWo9ed2uoO/exec",
    PERMITIR_IFRAME: false
  },

  AUTH: {
    DOMINIO_INSTITUCIONAL: "tjes.jus.br",
    DURACAO_SESSAO_SEGUNDOS: 3600
  },

  SHEETS: {
    // Modelo definitivo: MUNICIPIOS -> FORUM -> UNIDADES -> SETORES -> CONTATOS
    MUNICIPIOS: "MUNICIPIOS",
    FORUM: "FORUM",
    UNIDADES: "UNIDADES",
    SETORES: "SETORES",
    CONTATOS: "CONTATOS",
    TELEFONES_UTEIS: "TELEFONES_UTEIS",
    ACESSOS_UNIDADES: "ACESSOS_UNIDADES",
    USUARIOS: "USUARIOS",
    CONFIGURACAO: "CONFIGURACAO",
    HISTORICO: "HISTORICO",
    LOG: "LOG",
    SOLICITACOES_ACESSO: "Solicitações de Acesso do sistema",
    SOLICITACOES_ACESSO_LEGADO: "SOLICITACOES_ACESSO",
    EMAILS_PENDENTES: "EMAILS_PENDENTES",
    NOTIFICACOES: "NOTIFICACOES",

    // Identificador legado mantido somente para compatibilidade de código antigo.
    // A arquitetura V4 não cria, lê nem usa a aba TELEFONES como fonte operacional.
    TELEFONES: "TELEFONES",
    TELEFONES_LEGADO: "TELEFONES"
  },

  PERFIS: {
    GESTOR_SISTEMA: "GESTOR_SISTEMA",
    GESTOR_CONTEUDO: "GESTOR_CONTEUDO",
    USUARIO_CONSULTA: "USUARIO_CONSULTA"
  },

  NIVEIS: {
    NIVEL_1: 1,
    NIVEL_2: 2,
    NIVEL_3: 3,
    POR_PERFIL: {
      "USUARIO_CONSULTA": 1,
      "GESTOR_CONTEUDO": 2,
      "GESTOR_SISTEMA": 3
    },
    POR_NIVEL: {
      "1": "USUARIO_CONSULTA",
      "2": "GESTOR_CONTEUDO",
      "3": "GESTOR_SISTEMA"
    }
  },

  PERMISSOES: {
    VISUALIZAR: "VISUALIZAR",
    PESQUISAR: "PESQUISAR",
    EDITAR: "EDITAR",
    EXCLUIR: "EXCLUIR",
    HISTORICO: "HISTORICO"
  },

  CONTATOS: {
    ID: "ID",
    FORUM_ID: "FORUM_ID",
    UNIDADE_ID: "UNIDADE_ID",
    SETOR_ID: "SETOR_ID",
    TIPO: "TIPO",
    DESCRICAO: "DESCRICAO",
    VALOR: "VALOR",
    ORDEM: "ORDEM",
    DATA_CRIACAO: "DATA_CRIACAO",
    DATA_ATUALIZACAO: "DATA_ATUALIZACAO",
    ATIVO: "ATIVO",
    OBSERVACAO: "OBSERVACAO"
  },

  CACHE: {
    TEMPO_PADRAO: 300,
    CHAVE_TELEFONES: "CONTATOS_HIERARQUIA_V4"
  },

  LIMITES: {
    TAMANHO_PESQUISA: 2,
    TAMANHO_MAXIMO_NOME: 150,
    TAMANHO_MAXIMO_OBSERVACAO: 2000
  }
};

function teste() {
  Logger.log("OK");
}
