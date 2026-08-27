
MUDANÇAS NA NAVEGAÇÃO DO SISTEMA ADOTANDO VITÓRIA COMO EXEMPLO:


1. Tela inicial da aba Telefones:

Terá somente o mapa (opcionalmente adicionar um menu suspenso de Município para auxiliar na seleção do município). Do lado ou embaixo do mapa, ao clicar em Vitória, por exemplo, apareceria:

Vitória

2 fóruns • X unidades • X contatos

E um campo:

🔎 Buscar unidade, setor, telefone ou e-mail

Isso permite que o usuário encontre algo sem percorrer toda a árvore.


2. Mostrar os FÓRUNS

Para Vitória, apareceria dois cartões:

Fórum Cível
Endereço
E-mail
Quantidade de unidades
Quantidade de contatos

Fórum Criminal
Endereço
E-mail
Quantidade de unidades
Quantidade de contatos


3. Ao clicar no Fórum:

A tela passa a mostrar primeiro os contatos próprios do Fórum. Mostraria:

Fórum Cível

Contatos gerais

Descrição	 Tipo	     Valor
Geral	     Telefone	 (27) 3134-4700
Geral	     Ramal	     4700
Sala ADM	 Telefone	 (27) 3134-4704
Recepção	 Telefone	 (27) 3134-4701
Recepção	 Ramal	     4701
Segurança	 Telefone	 (27) 3134-4702

E, logo abaixo:

Unidades

┌─────────────────────────────────────────┐
│ Protocolo • Distribuição                │
│ 1ª Secretaria Inteligente Regional...   │
│ 1ª Secretaria Inteligente – Família     │
│ ...                                     │
└─────────────────────────────────────────┘


4. Ao clicar em uma unidade

Por exemplo,

1ª Secretaria Inteligente – Família

A tela mostra:

Fórum Cível
   > 1ª Secretaria Inteligente – Família

Primeiro o endereço/contatos próprios da unidade, como: 

E-mail: 1secunificada-vitoria@tjes.jus.br

Depois, se houver:

Setores

Nesse caso:

Atendimento

E também indicar os contatos herdados:

Telefone geral do Fórum Cível
(27) 3134-4700
Contato do Fórum

Isso deixa explícito que o usuário está vendo um contato herdado, não um contato cadastrado diretamente naquela unidade.


5. Ao clicar no setor

Por exemplo:

Atendimento

A navegação fica:

Vitória
 > Fórum Cível
 > 1ª Secretaria Inteligente – Família
 > Atendimento

E então aparecem os contatos daquele setor:

Telefone
(27) 3134-4707

WhatsApp
(27) 99827-4085

Além dos contatos e endereços herdados, caso existam.

_________________________________________________________________________________________________________________________________________________________________________

SUGESTÃO DE TELA

Para desktop:

┌──────────────────────────────────────────────────────────┐
│ SISTEMA INTELIGENTE DE GESTÃO DE CONTATOS DO PJES        │
├───────────────────┬──────────────────────────────────────┤
│                   │ VITÓRIA                              │
│  MAPA RESPONSIVO  │ ● Fórum Cível                        │
│                   │ ○ Fórum Criminal                     │
│ DO ESPÍRITO SANTO │ ──────────────────────────────────── │ 
│                   │ Endereço                             │ 
│                   │ Rua Leocádia Pedra dos Santos, 80... │
│ ┌──────────────┐  │ CEP 29050-370 – Vitória/ES           │
│ │              │  │                                      │
│ │              │  │ E-mail                               │
│ │              │  │ editais-civel-vitoria@tjes.jus.br    │
│ │ [municípios  │  │                                      │
│ │ destacados]  │  │ Contatos Gerais                      │
│ │              │  │ ┌────────────────────────────────┐   │
│ │              │  │ │ Geral       (27) 3134-4700     │   │
│ │              │  │ │ Recepção    (27) 3134-4701     │   │
│ │              │  │ │ Segurança   (27) 3134-4702     │   │
│ └──────────────┘  │ └────────────────────────────────┘   │
│                   │                                      │
│     Vitória       │ UNIDADES                             │
│        ←          │                                      │
│    Selecionado    │ Protocolo • Distribuição             │
│                   │ 1a Secretaria Inteligente Regional...│
│                   │ 1ª Secretaria Inteligente – Família  │
│                   │ ...                                  │
└───────────────────┴──────────────────────────────────────┘

Para celular, vira uma sequência de cartões/listas:

← Vitória

Fóruns
────────────────────
Fórum Cível       >
Fórum Criminal    >

Fórum Cível
────────────────────
Contatos gerais
────────────────────
Geral
(27) 3134-4700 • ramal 4700 • (9#)

Sala ADM
(27) 3134-4704

Recepção
(27) 3134-4701 • ramal 4701

Segurança
(27) 3134-4702 • ramal 4702

Unidades
────────────────────
Protocolo • Distribuição >
1a Secretaria Inteligente Regional – Órfãos e Sucessões da Capital >
1a Secretaria Inteligente – Família>
Secretaria Inteligente – Cíveis >
Vara de Recuperação Judicial e Falência >
...
(Seguindo a ordem do catálogo)


A melhor parte: o usuário não precisa seguir a árvore inteira

Esse é o ponto que considero mais importante para o site.

Exemplo:

Mapa
 ↓
Vitória
 ↓
[ 🔎 buscar "3134-4701" ]
 ↓
Recepção — Fórum Cível

Ou:

Mapa
 ↓
Vitória
 ↓
Fórum Criminal
 ↓
[ 🔎 buscar "7ª Secretaria" ]
 ↓
7ª Secretaria Unificada

Ou seja, a estrutura hierárquica organiza os dados, mas a interface não precisa obrigar o usuário a navegar hierarquicamente.


NAVEGAÇÃO PRINCIPAL:

MAPA
 ↓
MUNICÍPIO
 ↓
FÓRUNS
 ↓
FÓRUM
 ├── Endereço
 ├── E-mail
 ├── Contatos gerais
 │     ├── Telefone
 │     ├── Ramal
 │     └── WhatsApp
 │
 └── UNIDADES
       └── UNIDADE
            ├── Endereço próprio
            ├── E-mail próprio
            │
            └── SETORES
                  ├── Telefone próprio
                  ├── Ramal próprio
                  ├── WhatsApp próprio
                  ├── E-mail herdado da Unidade ou Fórum
                  └── Endereço herdado da Unidade ou Fórum

E, quando o município tiver somente um Fórum, aplicamos a seguinte simplificação:

MAPA
 ↓
MUNICÍPIO
 ↓
FÓRUM DIRETO

sem mostrar uma tela intermediária para escolha do Fórum.

