/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 01_Config.gs
 * ==========================================================
 */

const CONFIG = {
  SISTEMA: {
    NOME: "Sistema Inteligente de Gestão de Telefones do Poder Judiciário do Estado do Espírito Santo",
    VERSAO: "4.2"
  },

  WEB_APP: {
    URL_PUBLICA: "",
    URL_ADMIN: "",
    PERMITIR_IFRAME: false
  },

  AUTH: {
    DOMINIO_INSTITUCIONAL: "tjes.jus.br",
    PROPRIEDADE_MODO: "APP_MODE",
    MODO_PUBLICO: "PUBLIC",
    MODO_PRIVADO: "PRIVATE",
    PROPRIEDADE_EMAILS_TESTE: "EMAILS_TESTE_PRIVADO",
    PROPRIEDADE_SEGREDO_CONFIGURACAO: "SETUP_SECRET",
    PROPRIEDADE_OPERADORES_INSTALACAO: "OPERADORES_INSTALACAO"
  },

  PUBLICACAO: {
    PROPRIEDADE_PLANILHA_PUBLICA: "PLANILHA_PUBLICA_ID",
    PROPRIEDADE_FONTE_MIGRACAO: "PLANILHA_FONTE_MIGRACAO_ID",
    ABAS_PUBLICAS: [
      "MUNICIPIOS",
      "FORUM",
      "UNIDADES",
      "SETORES",
      "CONTATOS",
      "TELEFONES_UTEIS"
    ],
    ABAS_RESTRITAS: [
      "USUARIOS",
      "ACESSOS_UNIDADES",
      "SOLICITACOES_ACESSO",
      "NOTIFICACOES",
      "HISTORICO",
      "CONFIGURACAO",
      "LOG"
    ]
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
    SOLICITACOES_ACESSO: "SOLICITACOES_ACESSO",
    SOLICITACOES_ACESSO_LEGADO: "Solicitações de Acesso do sistema",
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
    GESTOR_CONTEUDO: 1,
    GESTOR_SISTEMA: 2,
    POR_PERFIL: {
      "GESTOR_CONTEUDO": 1,
      "GESTOR_SISTEMA": 2
    },
    POR_NIVEL: {
      "1": "GESTOR_CONTEUDO",
      "2": "GESTOR_SISTEMA"
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
