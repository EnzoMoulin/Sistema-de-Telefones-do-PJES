/**
 * ==========================================================
 * SISTEMA DE TELEFONES TJES
 * Arquivo: 02_Utils.gs
 * ==========================================================
 */

/**
 * Remove acentos, espaços e caracteres especiais.
 * Utilizado para comparação de textos e cabeçalhos.
 */
function limparTexto(texto) {
  if (texto === null || texto === undefined) {
    return "";
  }

  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

/**
 * Normaliza nomes de campos e cabeçalhos.
 *
 * Exemplos:
 * "DATA_CRIACAO" -> "DATACRIACAO"
 * "CriadoEm" -> "CRIADOEM"
 * "Microrregião" -> "MICRORREGIAO"
 */
function normalizarChave(valor) {
  return limparTexto(valor).toUpperCase();
}

/**
 * Retorna texto sem espaços externos.
 */
function textoSeguro(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).trim();
}

/**
 * Normaliza e-mail.
 */
function normalizarEmail(email) {
  return textoSeguro(email).toLowerCase();
}

/**
 * Converte um valor em lista de comarcas permitidas.
 *
 * Aceita "TODAS" (ou vazio) = sem restrição;
 * separadores: vírgula, ponto e vírgula, barra ou nova linha.
 */
function parseComarcas(valor) {
  const texto = textoSeguro(valor);

  if (!texto) {
    return [];
  }

  if (/^todas?$/i.test(texto)) {
    return [];
  }

  const lista =
    texto
      .split(/[,;\n|]+/)
      .map(item => textoSeguro(item))
      .filter(Boolean);

  const unicas = [];
  const vistos = {};

  lista.forEach(item => {
    const chave = normalizarChave(item);

    if (!vistos[chave]) {
      vistos[chave] = true;
      unicas.push(item);
    }
  });

  return unicas;
}

/**
 * Serializa uma lista de comarcas para a planilha.
 */
function serializarComarcas(lista) {
  const valores = Array.isArray(lista) ? lista : [];

  if (valores.length === 0) {
    return "";
  }

  return valores
    .map(item => textoSeguro(item))
    .filter(Boolean)
    .join(", ");
}

/**
 * Verifica se o e-mail pertence ao domínio institucional.
 */
function emailInstitucional(email) {
  const valor = normalizarEmail(email);
  const dominio = String(
    CONFIG.AUTH.DOMINIO_INSTITUCIONAL || ""
  )
    .trim()
    .toLowerCase();

  if (!valor || !dominio) {
    return false;
  }

  return valor.endsWith("@" + dominio);
}

/**
 * Verifica se o valor é um objeto simples.
 */
function ehObjeto(valor) {
  return (valor !== null && typeof valor === "object" && !Array.isArray(valor));
}

/**
 * Verifica se o objeto possui algum dos campos informados.
 */
function possuiCampo(objeto, ...nomes) {
  if (!objeto || typeof objeto !== "object") {
    return false;
  }

  const chaves = Object.keys(objeto);

  return nomes.some(nome => {
    if (Object.prototype.hasOwnProperty.call(objeto, nome)
    ) {
      return true;
    }

    const chaveNormalizada = normalizarChave(nome);

    return chaves.some(chave => {
      return (normalizarChave(chave) === chaveNormalizada);
    });
  });
}

/**
 * Obtém um valor de objeto aceitando diferenças de caixa,
 * acentos, espaços e sublinhados.
 */
function valorObjeto(objeto, ...nomes) {
  if (!objeto || typeof objeto !== "object") {
    return "";
  }

  const chaves = Object.keys(objeto);

  for (const nome of nomes) {
    if (Object.prototype.hasOwnProperty.call(objeto, nome)) {
      const valor = objeto[nome];

      return valor === null || valor === undefined ? "" : valor;
    }

    const chaveNormalizada = normalizarChave(nome);

    const chaveEncontrada = chaves.find(chave => {
      return (normalizarChave(chave) === chaveNormalizada);
    });

    if (chaveEncontrada !== undefined) {
      const valor = objeto[chaveEncontrada];

      return valor === null || valor === undefined ? "" : valor;
    }
  }

  return "";
}

/**
 * Converte uma linha em objeto usando os cabeçalhos.
 */
function rowToObject(headers, row) {
  const objeto = {};

  headers.forEach((header, index) => {
    objeto[header] = row[index] === undefined ? "" : row[index];
  });

  return objeto;
}

/**
 * Converte objeto em linha usando os cabeçalhos.
 */
function objectToRow(headers, objeto) {
  return headers.map(header => {
    const valor = valorObjeto(objeto, header);

    return valor === null || valor === undefined ? "" : valor;
  });
}

/**
 * Retorna a data atual.
 */
function agora() {
  return new Date();
}

/**
 * Converte uma data para objeto Date válido.
 */
function dataValida(valor, fallback) {
  if (!valor) {
    return fallback || new Date();
  }

  const data = valor instanceof Date ? valor : new Date(valor);

  if (isNaN(data.getTime())) {
    return fallback || new Date();
  }

  return data;
}

/**
 * Formata uma data.
 */
function formatarData(data) {
  if (!data) {
    return "";
  }

  const dataConvertida = dataValida(data, null);

  if (!dataConvertida) {
    return "";
  }

  return Utilities.formatDate(dataConvertida, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
}

/**
 * Converte valor para booleano.
 */
function paraBoolean(valor) {
  if (valor === true) {
    return true;
  }

  const texto = String(valor || "")
    .trim()
    .toUpperCase();

  return ["SIM", "TRUE", "1", "ATIVO", "YES", "S"].includes(texto);
}

/**
 * Garante que o valor seja um array.
 */
function arraySeguro(valor) {
  return Array.isArray(valor) ? valor : [];
}

/**
 * Pausa controlada.
 */

/**
 * Gera senha aleatória de exatamente 20 caracteres.
 *
 * O alfabeto evita símbolos que costumam ser alterados ao copiar/colar
 * e mantém compatibilidade com a tela de login.
 */
function gerarSenha20() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let senha = "";
  let entropia = "";

  while (senha.length < 20) {
    if (entropia.length < 2) {
      entropia += Utilities.getUuid().replace(/-/g, "");
    }

    const byte = parseInt(entropia.slice(0, 2), 16);
    entropia = entropia.slice(2);

    // Rejeita a faixa excedente para não introduzir viés de módulo.
    const limite = Math.floor(256 / caracteres.length) * caracteres.length;
    if (byte < limite) {
      senha += caracteres.charAt(byte % caracteres.length);
    }
  }

  return senha;
}

function nivelPorPerfil(perfil) {
  const chave = String(perfil || "").trim().toUpperCase();
  const mapa = CONFIG.NIVEIS && CONFIG.NIVEIS.POR_PERFIL;
  return Number((mapa && mapa[chave]) || 1);
}

function perfilPorNivel(nivel) {
  const mapa = CONFIG.NIVEIS && CONFIG.NIVEIS.POR_NIVEL;
  return (mapa && mapa[String(Number(nivel) || 1)]) || CONFIG.PERFIS.USUARIO_CONSULTA;
}

/**
 * Resolve o perfil de uma linha de USUARIOS nos dois schemas suportados:
 * V4 (NIVEL 1/2/3) e legado (PERFIL textual).
 */
function perfilUsuarioPorLinha(mapa, linha) {
  if (mapa && mapa.NIVEL !== undefined) {
    return perfilPorNivel(linha[mapa.NIVEL - 1]);
  }

  if (mapa && mapa.PERFIL !== undefined) {
    const perfil = String(linha[mapa.PERFIL - 1] || "").trim().toUpperCase();
    return perfil || CONFIG.PERFIS.USUARIO_CONSULTA;
  }

  return CONFIG.PERFIS.USUARIO_CONSULTA;
}

function senhasIguaisConstante(a, b) {
  const esquerda = String(a || "");
  const direita = String(b || "");
  let diferenca = esquerda.length ^ direita.length;
  const tamanho = Math.max(esquerda.length, direita.length);

  for (let i = 0; i < tamanho; i++) {
    diferenca |= (esquerda.charCodeAt(i) || 0) ^ (direita.charCodeAt(i) || 0);
  }

  return diferenca === 0;
}

function hashSenha(senha){
  // SHA-256 hex — suficiente para comparação; não armazena plain em log
  try{
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(senha||""), Utilities.Charset.UTF_8);
    var hex="";
    for(var i=0;i<digest.length;i++){ var b=digest[i]; if(b<0) b+=256; hex += ("0"+b.toString(16)).slice(-2); }
    return hex;
  }catch(e){ return String(senha||""); }
}

function esperar(milissegundos) {
  Utilities.sleep(Number(milissegundos) || 0);
}

/**
 * Verifica objeto vazio.
 */
function objetoVazio(objeto) {
  return (!objeto || Object.keys(objeto).length === 0);
}

/**
 * Clona objeto por JSON.
 */
function clonarObjeto(objeto) {
  if (objeto === null || objeto === undefined) {
    return objeto;
  }

  return JSON.parse(JSON.stringify(objeto));
}

/**
 * Serializa valores para o cliente.
 *
 * Datas são convertidas para strings ISO,
 * que podem ser enviadas pelo google.script.run.
 */
function serializarParaCliente(valor) {
  if (valor === undefined) {
    return null;
  }

  if (valor === null) {
    return null;
  }

  return JSON.parse(JSON.stringify(valor));
}

/**
 * Retorna erro padronizado.
 */
function criarErro(mensagem) {
  throw new Error(textoSeguro(mensagem) || "Erro desconhecido.");
}
