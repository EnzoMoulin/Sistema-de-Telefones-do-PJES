/**
 * Importação idempotente dos catálogos do Palácio da Justiça (08/2026)
 * e dos contatos provisórios do Fórum Criminal de Vitória (SEI 2024).
 */

function catalogoPJES2026Dados_() {
  const obsPalacio = "Catálogo Ramais TJES - agosto/2026";
  const obsSei = "Contato provisório - Ofício 432/2024, SEI 7001802-03.2024.8.08.0024. Validar vigência.";
  const R = function(descricao) { return ["Ramal", descricao, Array.prototype.slice.call(arguments, 1)]; };
  const T = function(descricao) { return ["Telefone", descricao, Array.prototype.slice.call(arguments, 1)]; };
  const E = function(descricao) { return ["E-mail", descricao, Array.prototype.slice.call(arguments, 1)]; };
  const W = function(descricao) { return ["WhatsApp", descricao, Array.prototype.slice.call(arguments, 1)]; };
  const nos = [];
  const contatos = [];

  function adicionarNo(id, forumId, paiId, tipo, nome, ordem, observacao, selecionavel) {
    nos.push({
      id: id, forumId: forumId, paiId: paiId || "", tipo: tipo, nome: nome,
      endereco: "", cep: "", observacao: observacao || "",
      selecionavelAcesso: selecionavel !== false, ativo: true, ordem: ordem
    });
  }

  function adicionarLinhas(forumId, noId, linhas, observacao) {
    let ordem = 1;
    (linhas || []).forEach(function(linha) {
      const tipo = linha[0];
      const descricao = linha[1];
      (linha[2] || []).forEach(function(valor) {
        contatos.push({
          forumId: forumId, noId: noId || "", tipo: tipo, descricao: descricao,
          valor: valor, ordem: ordem++, observacao: observacao || ""
        });
      });
    });
  }

  const forumPalacio = {
    id: "FOR0073",
    municipioId: "MUN0001",
    nome: "Tribunal de Justiça do Estado do Espírito Santo - Palácio da Justiça",
    endereco: "",
    cep: "",
    email: "",
    ordem: 3,
    ativo: true,
    observacao: obsPalacio
  };

  adicionarLinhas("FOR0073", "", [
    T("Geral", "(27) 3334-2000"),
    R("Telefonista", "2000", "2001", "9"),
    R("Recepção", "2060")
  ], obsPalacio);

  adicionarNo("UNI0204", "FOR0073", "", "UNIDADE", "Presidência", 1, "Des. Janete Vargas Simões", true);
  adicionarLinhas("FOR0073", "UNI0204", [
    R("Chefia de Gabinete", "2021"), R("Gabinete da Presidência (Apoio)", "2030"),
    R("Recepção", "2006"), R("Copa", "2237")
  ], obsPalacio);

  adicionarNo("UNI0205", "FOR0073", "", "ASSESSORIA", "Assessorias da Presidência", 2, "", true);
  adicionarLinhas("FOR0073", "UNI0205", [
    R("Assessoria Especial CNJ", "2166"),
    R("Gabinete do Juiz Assessor Especial de Magistrados", "2011"),
    R("Assessoria Especial de Magistrados", "2011"), R("Secretaria de Precatório", "2760"),
    R("Cerimonial e Relações Públicas", "2211", "2248"),
    R("Imprensa e Comunicação Social", "2261", "2262"),
    R("Licitações e Contratos/Contencioso Judicial (Assessoria Jurídica)", "2030", "2122"),
    R("Planejamento, Orçamento e Gestão Estratégica", "2188", "2086"),
    R("Segurança Institucional", "2027", "2119"), R("Assessoria Militar", "2222"),
    R("Servidores/Magistrados (Assessoria Jurídica)", "2014"),
    R("Núcleo Gestor de Justiça Restaurativa", "2206", "2207"),
    R("Unidade de Coordenação de Programas (UCP)", "2756"),
    R("Comissão Especial de Licitação (BID)", "2759"),
    R("Núcleo de Cooperação Judiciária (NUCOOP)", "2229"),
    R("Núcleo Permanente de Gestão da Qualidade", "2208")
  ], obsPalacio);

  adicionarNo("UNI0206", "FOR0073", "", "UNIDADE", "Vice-Presidência", 3, "", true);
  adicionarLinhas("FOR0073", "UNI0206", [
    R("Chefia de Gabinete", "2225"), R("Núcleo de Processamento de Recursos Eletrônicos", "2039"),
    R("Núcleo de Precedentes e Ações Coletivas", "2283", "2284")
  ], obsPalacio);

  adicionarNo("UNI0207", "FOR0073", "", "UNIDADE", "Corregedoria-Geral de Justiça", 4, "", true);
  adicionarLinhas("FOR0073", "UNI0207", [
    T("Geral", "(27) 3145-3100"), R("Geral", "3101", "3102"),
    R("Chefia de Gabinete", "3111", "3112", "3113"),
    R("Núcleo de Juízes Corregedores", "3105", "3106", "3107", "3108"),
    R("Assessoria de Planejamento e Fiscalização das Serventias Judiciais e Extrajudiciais", "3122", "3123", "3124", "3125", "3126", "3127", "3128", "3129", "3148"),
    R("Assessoria Jurídica", "3114", "3115", "3116", "3117", "3118"),
    R("Comissão Estadual Judiciária de Adoção - CEJA/ES", "3170", "3171", "3172", "3173", "3174"),
    R("Protocolo (Corregedoria)", "3169", "3166", "3168", "3175"),
    R("Secretaria de Monitoramento Judicial (Coord. de Monitoramento de Foro Judicial e Extrajudicial)", "3144", "3136", "3139", "3142", "3143", "3140", "3138", "3137", "3141", "3146"),
    R("Monitoramento de Magistrados (Coordenadoria)", "3145", "3130", "3131", "3132", "3133", "3134")
  ], obsPalacio);

  adicionarNo("UNI0208", "FOR0073", "", "ESCOLA", "Escola da Magistratura", 5, "", true);
  adicionarLinhas("FOR0073", "UNI0208", [T("Geral", "(27) 3145-3153", "(27) 3145-3155")], obsPalacio);
  adicionarNo("UNI0209", "FOR0073", "", "OUVIDORIA", "Ouvidoria", 6, "", true);
  adicionarLinhas("FOR0073", "UNI0209", [T("Geral", "0800 970 2442")], obsPalacio);

  adicionarNo("UNI0210", "FOR0073", "", "COORDENADORIA", "Coordenadorias", 7, "", true);
  adicionarLinhas("FOR0073", "UNI0210", [
    R("Criminal e Execução Penal", "2724", "2725"), T("Infância e Juventude", "(27) 3134-7008"),
    R("Juizado Especial (Seção de Apoio)", "2751", "2838"),
    R("Violência Doméstica e Familiar contra a Mulher", "2709", "2174"),
    R("NUPEMEC - 1º CEJUSC", "2151", "2354")
  ], obsPalacio);

  adicionarNo("UNI0211", "FOR0073", "", "GABINETE", "Desembargadores", 8, "", true);
  adicionarLinhas("FOR0073", "UNI0211", [
    R("Alexandre Puppim", "2194"), R("Arthur José Neiva Almeida", "2168", "2167"),
    R("Aldary Nunes Júnior", "2219"), R("Dair José Bregunce de Oliveira", "2255"),
    R("Débora Maria Ambos C. da Silva", "2202", "2068"), R("Eder Pontes da Silva", "2215"),
    R("Eliana Junqueira M. Ferreira", "2046", "2296"), R("Ewerton Schwab Pinto Júnior", "2182"),
    R("Fábio Brasil Nery", "2287"), R("Fernando Estevam Bravin Ruy", "2203"),
    R("Fernando Zardini Antonio", "2189"), R("Helimar Pinto", "2233", "2234"),
    R("Heloisa Cariello", "2077"), R("Janete Vargas Simões", "2072"),
    R("Jorge Henrique Valle dos Santos", "2093"), R("José Paulo Calmon N. da Gama", "2105", "2108"),
    R("Júlio César Costa de Oliveira", "2224"), R("Luiz Guilherme Risso", "2236"),
    R("Marcos Valls Feu Rosa", "2290"), R("Marianne Judice de Mattos", "2177"),
    R("Namyr Carlos de Souza Filho", "2085"), R("Pedro Valls Feu Rosa", "2040"),
    R("Rachel Durão Correia Lima", "2100", "2285"), R("Raphael Americano Câmara", "2241"),
    R("Robson Luiz Albanez", "2066", "2245"), R("Samuel Meira Brasil Júnior", "2199"),
    R("Sérgio Ricardo de Souza", "2071"), R("Ubiratan Almeida Azevedo", "2227"),
    R("Walace Pandolpho Kiffer", "2267", "2268"), R("Willian Silva", "2256")
  ], obsPalacio);

  adicionarNo("UNI0212", "FOR0073", "", "UNIDADE", "Tribunal do Pleno", 9, "", true);
  adicionarLinhas("FOR0073", "UNI0212", [R("Geral", "2123", "2057", "2124"), R("Diretora", "2053")], obsPalacio);
  adicionarNo("UNI0213", "FOR0073", "", "UNIDADE", "Conselho Superior da Magistratura", 10, "", true);
  adicionarLinhas("FOR0073", "UNI0213", [R("Geral", "2120", "2121", "2031")], obsPalacio);

  adicionarNo("UNI0214", "FOR0073", "", "SECAO", "Seção Cível", 11, "", true);
  adicionarLinhas("FOR0073", "UNI0214", [
    R("1ª Cível", "2114", "2115"), R("2ª Cível", "2196", "2159", "2235"),
    R("2ª Cível - Diretoria", "2163"), R("3ª Cível", "2113", "2034"),
    R("3ª Cível - Diretoria", "2113"), R("4ª Cível", "2176", "2117", "2118"),
    R("4ª Cível - Diretoria", "2117"), R("Cíveis Reunidas", "2164", "2126"),
    R("Cíveis Reunidas - Diretoria", "2125")
  ], obsPalacio);

  adicionarNo("UNI0215", "FOR0073", "", "SECAO", "Seção Criminal", 12, "", true);
  adicionarLinhas("FOR0073", "UNI0215", [
    R("1ª Criminal", "2127", "2137"), R("1ª Criminal - Diretoria", "2037"),
    R("2ª Criminal", "2160", "2161", "2260", "2258"), R("Criminais Reunidas", "2112", "2250")
  ], obsPalacio);

  adicionarNo("UNI0216", "FOR0073", "", "SECRETARIA", "Secretaria de Controle Interno", 13, "", true);
  adicionarLinhas("FOR0073", "UNI0216", [R("Geral", "2707", "2708")], obsPalacio);
  adicionarNo("UNI0217", "FOR0073", "", "SECRETARIA", "Secretaria Geral", 14, "", true);
  adicionarLinhas("FOR0073", "UNI0217", [
    R("Geral", "2210"), R("Subsecretaria Geral", "2217"),
    R("Assessoria de Gestão de Processos Judiciais", "2158"),
    R("Assessoria Jurídica (Secretaria Geral)", "2270"),
    R("Núcleo de Planejamento das Contratações", "2216")
  ], obsPalacio);

  adicionarNo("UNI0218", "FOR0073", "", "SECRETARIA", "Secretaria Judiciária", 15, "", true);
  adicionarLinhas("FOR0073", "UNI0218", [
    R("Secretaria Judiciária", "2221", "2110"), R("Plantão e Mandados (Seção)", "2195"),
    R("Contadoria Judicial (Seção)", "2116"), R("Protocolo, Registro e Distribuição (Coord.)", "2186", "2197", "2087"),
    R("Protocolo (Seção)", "2094"), R("Gestão da Informação Documental (Coordenadoria)", "2099"),
    R("Publicação/Gráfica/Diário da Justiça (Seção)", "2099", "2098", "2146"),
    R("Biblioteca (Seção)", "2043"), T("Arquivo (Seção)", "(27) 3357-4893"),
    T("Arquivo Administrativo", "(27) 3145-3150"), T("Sala de Apoio (Arquivo)", "(27) 3442-8942"),
    R("Taquigrafia (Coordenadoria)", "2067"),
    T("Taquigrafia", "(27) 3334-2051", "(27) 3334-2276", "(27) 3334-2278")
  ], obsPalacio);

  adicionarNo("UNI0219", "FOR0073", "", "SECRETARIA", "Secretaria de Engenharia, Gestão Predial e Manutenção de Equipamentos", 16, "", true);
  adicionarLinhas("FOR0073", "UNI0219", [
    T("Secretário", "(27) 3334-2724"), T("Projetos (Coordenadora)", "(27) 3334-2845"),
    T("Projetos Arquitetônicos e outros (Seção)", "(27) 3334-2846"), R("Projetos Arquitetônicos e outros (Seção)", "2807"),
    T("Projetos - Custos (Seção)", "(27) 3334-2808"), R("Projetos - Custos (Seção)", "2848"),
    T("Fiscalização (Coordenador)", "(27) 3334-2840"), T("Fiscalização - Obras/Reformas", "(27) 3334-2844"),
    R("Fiscalização - Obras/Reformas", "2843"), T("Fiscalização - Locações", "(27) 3334-2728"),
    T("Fiscalização - Regularização de Imóveis", "(27) 3334-2841"), T("Manutenção Predial (Coord.)", "(27) 3334-2747"),
    T("Manutenção Predial", "(27) 3334-2748"), R("Manutenção Predial", "2741"),
    T("Elevadores e ar condicionado", "(27) 3334-2723"), R("Elevadores e ar condicionado", "2749"),
    T("Instalações Elétricas", "(27) 3334-2729"), R("Instalações Elétricas", "2750")
  ], obsPalacio);

  adicionarNo("UNI0220", "FOR0073", "", "SECRETARIA", "Secretaria de Infraestrutura", 17, "", true);
  adicionarLinhas("FOR0073", "UNI0220", [
    T("Secretária", "(27) 3334-2811"), T("Serviços Gerais (edifício-sede)", "(27) 3334-2045"),
    T("Zeladoria (Seção)", "(27) 3334-2796"), T("Reserva de sala", "(27) 3334-2796"),
    T("Coordenador", "(27) 3334-2861"), T("Suprimento e Controle Patrimonial (Coord.)", "(27) 3334-2868"),
    T("Patrimônio Administrativo", "(27) 3334-2791"), R("Patrimônio Administrativo", "2862"),
    T("Patrimônio Guarita (Serra)", "(27) 3442-8943"), T("Almoxarifado Administrativo", "(27) 3442-8933"),
    T("Almoxarifado Depósito", "(27) 3442-8939"), T("Compras, Licitação e Contratos (Coord.)", "(27) 3334-2717"),
    T("Compras (Seção)", "(27) 3334-2794"), R("Compras (Seção)", "2719", "2716", "2718", "2795"),
    T("Contratação (Seção)", "(27) 3334-2712"), R("Contratação (Seção)", "2720", "2860"),
    T("Controle de Contratos e Convênios (Seção)", "(27) 3334-2865"),
    T("Equipe de Pregão", "(27) 3334-2711"), R("Equipe de Pregão", "2715"),
    T("Transporte Administrativo (Seção)", "(27) 3334-2791"), T("Transporte Agentes", "(27) 3357-4318"),
    T("Transporte Agendamento", "(27) 3357-4313"), R("Transporte Agendamento", "4317"),
    T("Transporte Agendamento (Interior)", "(27) 3442-8937"), R("Transporte Agendamento (Interior)", "8938"),
    T("Logística", "(27) 3442-8937", "(27) 99903-5910")
  ], obsPalacio);

  adicionarNo("UNI0221", "FOR0073", "", "SECRETARIA", "Secretaria de Tecnologia da Informação", 18, "", true);
  adicionarLinhas("FOR0073", "UNI0221", [
    T("Atendimento - Help Desk", "(27) 3334-2201", "(27) 3441-5050"),
    R("Administrativo", "2818"), R("Suporte e Manutenção (Seção)", "2754")
  ], obsPalacio);

  adicionarNo("UNI0222", "FOR0073", "", "SECRETARIA", "Secretaria de Gestão de Pessoas", 19, "", true);
  adicionarLinhas("FOR0073", "UNI0222", [
    T("Secretária SGP", "(27) 3334-2883"), T("Assessoria Jurídica SGP", "(27) 3334-2776"),
    R("Suporte SIARHES", "2136"), T("Pagamento de Pessoal (Coord.)", "(27) 3334-2775"),
    T("Recursos Humanos (Coordenadoria)", "(27) 3334-2887"),
    T("Estágio Probatório e Movimento de Servidor (Seção)", "(27) 3134-7066"),
    T("Legislação e Benefícios (Seção)", "(27) 3134-7068"),
    T("Registro Funcional de Servidor (Seção)", "(27) 3134-7067"),
    T("Registro Funcional de Magistrados (Seção)", "(27) 3334-2772"), R("Registro Funcional de Magistrados (Seção)", "2773"),
    T("Seleção e Acompanhamento de Estágio (Seção)", "(27) 3134-7065"),
    R("Serviços Psicossociais e de Saúde (Coordenação)", "2143"), R("Recepção (CSPS)", "2048"),
    R("Administrativo (CSPS)", "2133", "2311"), R("Comunicação (CSPS)", "2139"),
    R("Enfermagem (CSPS)", "2368"), R("Serviço Psicossocial (CSPS)", "2129", "2783", "2130", "2165", "2138", "2089", "2016")
  ], obsPalacio);

  adicionarNo("UNI0223", "FOR0073", "", "SECRETARIA", "Secretaria de Finanças e Execução Orçamentária", 20, "", true);
  adicionarLinhas("FOR0073", "UNI0223", [
    T("Secretária", "(27) 3334-2857"), T("Contabilidade (Coordenadoria)", "(27) 3334-2786"),
    T("Escrituração, Análise Contábil e Acompanhamento Patrimonial (Seção)", "(27) 3334-2789"),
    R("Escrituração, Análise Contábil e Acompanhamento Patrimonial (Seção)", "2790"),
    T("Prestação e Tomadas de Contas (Seção)", "(27) 3334-2854"),
    T("Execução Orçamentária e Financeira (Coordenadoria)", "(27) 3334-2856"),
    T("Empenho e Classificação de Despesa (Seção)", "(27) 3334-2853"),
    R("Empenho e Classificação de Despesa (Seção)", "2858", "2859"),
    T("Tesouraria (Seção)", "(27) 3334-2852")
  ], obsPalacio);

  adicionarNo("UNI0224", "FOR0073", "", "COMISSAO", "Comissões", 21, "", true);
  adicionarLinhas("FOR0073", "UNI0224", [
    R("Núcleo de Comissões", "2350", "2712", "2713"), R("Segurança Institucional (Seção)", "2101"),
    R("Mensageria", "2351", "2352")
  ], obsPalacio);

  for (let numero = 1; numero <= 10; numero++) {
    const id = "UNI" + String(224 + numero).padStart(4, "0");
    adicionarNo(id, "FOR0002", "UNI0018", "VARA", numero + "ª Vara Criminal", numero, obsSei, false);
  }
  adicionarNo("UNI0235", "FOR0002", "UNI0020", "JUIZADO", "1º Juizado Especial Criminal", 1, obsSei, false);
  adicionarNo("UNI0236", "FOR0002", "UNI0020", "JUIZADO", "2º Juizado Especial Criminal", 2, obsSei, false);
  adicionarNo("UNI0237", "FOR0002", "UNI0020", "JUIZADO", "3º Juizado Especial Criminal", 3, obsSei, false);
  adicionarNo("UNI0238", "FOR0002", "", "UNIDADE", "Central de Mandados", 10, obsSei, true);
  adicionarNo("UNI0239", "FOR0002", "", "UNIDADE", "Contadorias", 11, obsSei, true);
  adicionarNo("SET0439", "FOR0002", "UNI0239", "SETOR", "1ª Contadoria", 1, obsSei, false);
  adicionarNo("SET0440", "FOR0002", "UNI0239", "SETOR", "2ª Contadoria", 2, obsSei, false);
  adicionarNo("UNI0240", "FOR0001", "UNI0011", "JUIZADO", "3º Juizado Especial Cível (Justiça Volante)", 4, obsSei, false);

  const varasSei = [
    ["UNI0225", "1criminal-vitoria@tjes.jus.br", "(27) 99820-4490"],
    ["UNI0226", "2criminal-vitoria@tjes.jus.br", "(27) 99886-2135"],
    ["UNI0227", "3criminal-vitoria@tjes.jus.br", "(27) 99780-1184"],
    ["UNI0228", "4criminal-vitoria@tjes.jus.br", "(27) 99579-8696"],
    ["UNI0229", "5criminal-vitoria@tjes.jus.br", "(27) 99741-1219"],
    ["UNI0230", "6criminal-vitoria@tjes.jus.br", "(27) 99615-5199"],
    ["UNI0231", "7criminal-vitoria@tjes.jus.br", "(27) 3357-4592"],
    ["UNI0232", "8criminal-vitoria@tjes.jus.br", "(27) 99795-5174"],
    ["UNI0233", "9criminal-vitoria@tjes.jus.br", "(27) 99788-6571"],
    ["UNI0234", "10criminal-vitoria@tjes.jus.br", "(27) 99661-9046"]
  ];
  varasSei.forEach(function(item) {
    adicionarLinhas("FOR0002", item[0], [E("Institucional", item[1]), T("Provisório", item[2])], obsSei);
  });

  adicionarLinhas("FOR0002", "UNI0021", [E("Institucional", "1militar-vitoria@tjes.jus.br"), W("Provisório", "(27) 99523-6596")], obsSei);
  adicionarLinhas("FOR0002", "UNI0022", [E("Institucional", "1vara-violenciadomestica@tjes.jus.br"), T("Provisório", "(27) 99658-3947")], obsSei);
  adicionarLinhas("FOR0002", "UNI0017", [W("Provisório", "(27) 99984-2959")], obsSei);
  adicionarLinhas("FOR0002", "", [E("Institucional", "vitoria@tjes.jus.br")], obsSei);
  adicionarLinhas("FOR0002", "SET0439", [E("Institucional", "1contadoria-vitoria@tjes.jus.br")], obsSei);
  adicionarLinhas("FOR0002", "SET0440", [E("Institucional", "mblima@tjes.jus.br")], obsSei);
  contatos.push({
    forumId: "FOR0002", noId: "SET0440", tipo: "WhatsApp", descricao: "Provisório",
    valor: "(27) 99834-5954", ordem: 2, observacao: obsSei,
    reconciliarPorValor: true
  });
  adicionarLinhas("FOR0002", "UNI0016", [E("Institucional", "distribuicaocriminal-vitoria@tjes.jus.br"), T("Provisório", "(27) 99991-4402")], obsSei);
  adicionarLinhas("FOR0002", "UNI0238", [E("Institucional", "centralmandados-vitoria@tjes.jus.br"), T("Provisório", "(27) 99925-8765")], obsSei);
  adicionarLinhas("FOR0002", "UNI0235", [E("Institucional", "1jecriminal-vitoria@tjes.jus.br"), T("Provisório", "(27) 99524-7572")], obsSei);
  adicionarLinhas("FOR0002", "UNI0236", [
    E("Gabinete", "2jecrimvix@gmail.com"), E("Cartório", "2jecriminal-vitoria@tjes.jus.br"), T("Provisório", "(27) 99509-9319")
  ], obsSei);
  adicionarLinhas("FOR0002", "UNI0237", [
    E("Gabinete", "gabinete3jecrimdevitoria@tjes.jus.br"), E("Cartório", "3jecriminal-vitoria@tjes.jus.br"), T("Provisório", "(27) 99715-3444")
  ], obsSei);
  adicionarLinhas("FOR0001", "UNI0240", [E("Institucional", "3jecivel-vitoria@tjes.jus.br"), T("Provisório", "(27) 99860-4719")], obsSei);

  ["vitoria@tjes.jus.br", "distribuicaocriminal-vitoria@tjes.jus.br", "1militar-vitoria@tjes.jus.br", "1vara-violenciadomestica@tjes.jus.br"].forEach(function(valor) {
    contatos.forEach(function(contato) {
      if (contato.valor === valor) contato.reconciliarPorValor = true;
    });
  });

  return { forum: forumPalacio, nos: nos, contatos: contatos, observacaoPalacio: obsPalacio, observacaoSei: obsSei };
}

function _cat2026Campo_(mapa, linha, nome) {
  const indice = mapa[normalizarChave(nome)];
  return indice ? linha[indice - 1] : "";
}

function _cat2026Definir_(mapa, linha, nome, valor) {
  const indice = mapa[normalizarChave(nome)];
  if (indice) linha[indice - 1] = valor;
}

function _cat2026ValorNormalizado_(tipo, valor) {
  const texto = textoSeguro(valor).trim().toLocaleLowerCase("pt-BR");
  if (normalizarChave(tipo) === "EMAIL") return texto;
  const digitos = texto.replace(/\D/g, "");
  return digitos || limparTexto(texto);
}

function _cat2026ChaveContato_(contato) {
  return [
    textoSeguro(contato.forumId), textoSeguro(contato.noId), normalizarChave(contato.tipo),
    _cat2026ValorNormalizado_(contato.tipo, contato.valor), limparTexto(contato.descricao)
  ].join("|");
}

function _cat2026Planejar_(dadosAtuais) {
  const manifesto = catalogoPJES2026Dados_();
  const forums = dadosAtuais.forums;
  const nos = dadosAtuais.nos;
  const contatos = dadosAtuais.contatos;
  const mapaForum = dadosAtuais.mapaForum;
  const mapaNos = dadosAtuais.mapaNos;
  const mapaContatos = dadosAtuais.mapaContatos;
  const idsForum = new Set();
  const nosPorId = {};
  const contatosPorChave = {};
  const contatosPorValor = {};

  forums.forEach(function(linha) { idsForum.add(textoSeguro(_cat2026Campo_(mapaForum, linha, "ID"))); });
  nos.forEach(function(linha) {
    const id = textoSeguro(_cat2026Campo_(mapaNos, linha, "ID"));
    if (id) nosPorId[id] = linha;
  });
  contatos.forEach(function(linha, indice) {
    const item = {
      forumId: textoSeguro(_cat2026Campo_(mapaContatos, linha, "FORUM_ID")),
      noId: textoSeguro(_cat2026Campo_(mapaContatos, linha, "UNIDADE_ORGANIZACIONAL_ID")) ||
        textoSeguro(_cat2026Campo_(mapaContatos, linha, "SETOR_ID")) || textoSeguro(_cat2026Campo_(mapaContatos, linha, "UNIDADE_ID")),
      tipo: textoSeguro(_cat2026Campo_(mapaContatos, linha, "TIPO")),
      descricao: textoSeguro(_cat2026Campo_(mapaContatos, linha, "DESCRICAO")),
      valor: textoSeguro(_cat2026Campo_(mapaContatos, linha, "VALOR"))
    };
    contatosPorChave[_cat2026ChaveContato_(item)] = indice;
    const chaveValor = _cat2026ValorNormalizado_(item.tipo, item.valor);
    if (chaveValor) {
      if (!contatosPorValor[chaveValor]) contatosPorValor[chaveValor] = [];
      contatosPorValor[chaveValor].push(indice);
    }
  });

  const novosForums = idsForum.has(manifesto.forum.id) ? [] : [manifesto.forum];
  const novosNos = manifesto.nos.filter(function(no) { return !nosPorId[no.id]; });
  const conflitosNos = manifesto.nos.filter(function(no) {
    const atual = nosPorId[no.id];
    return atual && (
      textoSeguro(_cat2026Campo_(mapaNos, atual, "FORUM_ID")) !== no.forumId ||
      textoSeguro(_cat2026Campo_(mapaNos, atual, "PAI_ID")) !== no.paiId ||
      limparTexto(_cat2026Campo_(mapaNos, atual, "NOME")) !== limparTexto(no.nome)
    );
  });
  const novosContatos = [];
  const reutilizados = [];
  const atualizacoes = [];

  manifesto.contatos.forEach(function(contato) {
    const chave = _cat2026ChaveContato_(contato);
    if (contatosPorChave[chave] !== undefined) {
      const indiceExistente = contatosPorChave[chave];
      const observacaoAtual = textoSeguro(_cat2026Campo_(mapaContatos, contatos[indiceExistente], "OBSERVACAO"));
      if (contato.observacao && observacaoAtual !== contato.observacao) {
        atualizacoes.push({ indice: indiceExistente, contato: contato });
      } else {
        reutilizados.push({ indice: indiceExistente, contato: contato, motivo: "chave" });
      }
      return;
    }
    if (contato.reconciliarPorValor) {
      const chaveValor = _cat2026ValorNormalizado_(contato.tipo, contato.valor);
      let candidatos = contatosPorValor[chaveValor] || [];
      if (!candidatos.length && contato.preservarTipoExistente) {
        const soDigitos = textoSeguro(contato.valor).replace(/\D/g, "");
        candidatos = Object.keys(contatosPorValor).filter(function(k) { return k === soDigitos; })
          .reduce(function(lista, k) { return lista.concat(contatosPorValor[k]); }, []);
      }
      if (candidatos.length === 1) {
        atualizacoes.push({ indice: candidatos[0], contato: contato });
        return;
      }
    }
    novosContatos.push(contato);
  });

  return {
    manifesto: manifesto, novosForums: novosForums, novosNos: novosNos,
    novosContatos: novosContatos, reutilizados: reutilizados,
    atualizacoes: atualizacoes, conflitosNos: conflitosNos
  };
}

function _cat2026LerBase_() {
  const shForum = DB.forum();
  const shNos = DB.unidadesOrganizacionais();
  const shContatos = DB.contatos();
  return {
    shForum: shForum, shNos: shNos, shContatos: shContatos,
    headersForum: DB.headers(shForum), headersNos: DB.headers(shNos), headersContatos: DB.headers(shContatos),
    mapaForum: DB.map(shForum), mapaNos: DB.map(shNos), mapaContatos: DB.map(shContatos),
    forums: DB.read(shForum), nos: DB.read(shNos), contatos: DB.read(shContatos)
  };
}

function _cat2026Resumo_(plano) {
  return {
    novosForums: plano.novosForums.length,
    novosNos: plano.novosNos.length,
    novosContatos: plano.novosContatos.length,
    contatosReutilizados: plano.reutilizados.length,
    contatosAtualizados: plano.atualizacoes.length,
    conflitosNos: plano.conflitosNos.map(function(no) { return no.id; }),
    totalNosManifesto: plano.manifesto.nos.length,
    totalContatosManifesto: plano.manifesto.contatos.length
  };
}

function simularImportacaoCatalogosPJES2026() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  return respostaSucesso(_cat2026Resumo_(_cat2026Planejar_(_cat2026LerBase_())));
}

function importarCatalogosPJES2026() {
  new AuthService().exigirPerfil(CONFIG.PERFIS.GESTOR_SISTEMA);
  AuthService.exigirContextoPrivado();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const base = _cat2026LerBase_();
    const plano = _cat2026Planejar_(base);
    if (plano.conflitosNos.length) {
      throw new Error("Conflito de IDs organizacionais: " + plano.conflitosNos.map(function(no) { return no.id; }).join(", "));
    }

    const agora = new Date();
    const proximoId = { T: 0, EML: 0 };
    base.contatos.forEach(function(linha) {
      const id = textoSeguro(_cat2026Campo_(base.mapaContatos, linha, "ID"));
      const match = id.match(/^(T|EML)(\d+)$/);
      if (match) proximoId[match[1]] = Math.max(proximoId[match[1]], Number(match[2]));
    });

    plano.novosForums.forEach(function(item) {
      const linha = base.headersForum.map(function() { return ""; });
      _cat2026Definir_(base.mapaForum, linha, "ID", item.id);
      _cat2026Definir_(base.mapaForum, linha, "MUNICIPIO_ID", item.municipioId);
      _cat2026Definir_(base.mapaForum, linha, "NOME", item.nome);
      _cat2026Definir_(base.mapaForum, linha, "ENDERECO", item.endereco);
      _cat2026Definir_(base.mapaForum, linha, "CEP", item.cep);
      _cat2026Definir_(base.mapaForum, linha, "EMAIL", item.email);
      _cat2026Definir_(base.mapaForum, linha, "ORDEM", item.ordem);
      _cat2026Definir_(base.mapaForum, linha, "ATIVO", true);
      _cat2026Definir_(base.mapaForum, linha, "OBSERVACAO", item.observacao);
      base.forums.push(linha);
    });

    plano.novosNos.forEach(function(item) {
      const linha = base.headersNos.map(function() { return ""; });
      _cat2026Definir_(base.mapaNos, linha, "ID", item.id);
      _cat2026Definir_(base.mapaNos, linha, "FORUM_ID", item.forumId);
      _cat2026Definir_(base.mapaNos, linha, "PAI_ID", item.paiId);
      _cat2026Definir_(base.mapaNos, linha, "TIPO", item.tipo);
      _cat2026Definir_(base.mapaNos, linha, "NOME", item.nome);
      _cat2026Definir_(base.mapaNos, linha, "ENDERECO", item.endereco);
      _cat2026Definir_(base.mapaNos, linha, "CEP", item.cep);
      _cat2026Definir_(base.mapaNos, linha, "OBSERVACAO", item.observacao);
      _cat2026Definir_(base.mapaNos, linha, "SELECIONAVEL_ACESSO", item.selecionavelAcesso);
      _cat2026Definir_(base.mapaNos, linha, "ATIVO", true);
      _cat2026Definir_(base.mapaNos, linha, "ORDEM", item.ordem);
      base.nos.push(linha);
    });

    const historico = [];
    plano.atualizacoes.forEach(function(item) {
      const linha = base.contatos[item.indice];
      const antes = {};
      base.headersContatos.forEach(function(header, indice) { antes[header] = linha[indice]; });
      _cat2026Definir_(base.mapaContatos, linha, "FORUM_ID", item.contato.forumId);
      _cat2026Definir_(base.mapaContatos, linha, "UNIDADE_ORGANIZACIONAL_ID", item.contato.noId);
      _cat2026Definir_(base.mapaContatos, linha, "UNIDADE_ID", "");
      _cat2026Definir_(base.mapaContatos, linha, "SETOR_ID", "");
      if (!item.contato.preservarTipoExistente) _cat2026Definir_(base.mapaContatos, linha, "TIPO", item.contato.tipo);
      _cat2026Definir_(base.mapaContatos, linha, "DESCRICAO", item.contato.descricao);
      _cat2026Definir_(base.mapaContatos, linha, "ORDEM", item.contato.ordem);
      _cat2026Definir_(base.mapaContatos, linha, "DATA_ATUALIZACAO", agora);
      _cat2026Definir_(base.mapaContatos, linha, "ATIVO", true);
      _cat2026Definir_(base.mapaContatos, linha, "OBSERVACAO", item.contato.observacao);
      historico.push({ id: textoSeguro(_cat2026Campo_(base.mapaContatos, linha, "ID")), antes: antes });
    });

    plano.novosContatos.forEach(function(item) {
      const prefixo = normalizarChave(item.tipo) === "EMAIL" ? "EML" : "T";
      const id = prefixo + String(++proximoId[prefixo]).padStart(6, "0");
      const linha = base.headersContatos.map(function() { return ""; });
      _cat2026Definir_(base.mapaContatos, linha, "ID", id);
      _cat2026Definir_(base.mapaContatos, linha, "FORUM_ID", item.forumId);
      _cat2026Definir_(base.mapaContatos, linha, "UNIDADE_ORGANIZACIONAL_ID", item.noId);
      _cat2026Definir_(base.mapaContatos, linha, "TIPO", item.tipo);
      _cat2026Definir_(base.mapaContatos, linha, "DESCRICAO", item.descricao);
      _cat2026Definir_(base.mapaContatos, linha, "VALOR", item.valor);
      _cat2026Definir_(base.mapaContatos, linha, "ORDEM", item.ordem);
      _cat2026Definir_(base.mapaContatos, linha, "DATA_CRIACAO", agora);
      _cat2026Definir_(base.mapaContatos, linha, "DATA_ATUALIZACAO", agora);
      _cat2026Definir_(base.mapaContatos, linha, "ATIVO", true);
      _cat2026Definir_(base.mapaContatos, linha, "OBSERVACAO", item.observacao);
      base.contatos.push(linha);
    });

    if (plano.novosForums.length) base.shForum.getRange(2, 1, base.forums.length, base.headersForum.length).setValues(base.forums);
    if (plano.novosNos.length) base.shNos.getRange(2, 1, base.nos.length, base.headersNos.length).setValues(base.nos);
    if (plano.novosContatos.length || plano.atualizacoes.length) {
      base.shContatos.getRange(2, 1, base.contatos.length, base.headersContatos.length).setValues(base.contatos);
    }

    if (historico.length) {
      const shHistorico = DB.historico();
      const headers = DB.headers(shHistorico);
      const usuario = new AuthService().usuarioAtual();
      const linhas = historico.map(function(item) {
        return headers.map(function(header) {
          const chave = normalizarChave(header);
          if (chave === "ID") return Utilities.getUuid();
          if (chave === "CONTATOID") return item.id;
          if (chave === "ACAO") return "MIGRACAO_CATALOGOS_2026";
          if (chave === "ANTES") return JSON.stringify(item.antes);
          if (chave === "DEPOIS") return JSON.stringify({ fonte: "CATALOGOS_PJES_2026" });
          if (chave === "USUARIO") return usuario.email || "SISTEMA";
          if (chave === "DATA") return agora;
          return "";
        });
      });
      shHistorico.getRange(shHistorico.getLastRow() + 1, 1, linhas.length, headers.length).setValues(linhas);
    }

    SpreadsheetApp.flush();
    try { CACHE.limparTudo(); } catch (e) {}
    const resumo = _cat2026Resumo_(plano);
    try { registrarInfoAPI("MIGRACAO_CATALOGOS_2026", JSON.stringify(resumo)); } catch (e) {}
    return respostaSucesso(resumo);
  } finally {
    lock.releaseLock();
  }
}

/** Wrapper de editor: exige operador real e contexto privado. */
function importarCatalogosPJES2026Editor() {
  exigirOperadorInstalacaoReal_();
  return importarCatalogosPJES2026();
}
