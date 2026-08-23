/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · TUTORIAL POR CLIQUE
   ──────────────────────────────────────────────────────────────
   Todo rótulo com ajuda ganha marca pontilhada. Duplo clique
   abre a explicação. Nada de hover: precisa ser deliberado.
   ══════════════════════════════════════════════════════════════ */

export interface HelpEntry {
  title: string;
  body: string[];
  /** Exemplo pronto, copiável. */
  example?: string;
  /** Conselho de quem já errou isso antes. */
  tip?: string;
}

export const HELP: Record<string, HelpEntry> = {
  orbita: {
    title: "O que é uma órbita",
    body: [
      "É o objeto que o sistema passa a vigiar. A camada 0 de tudo.",
      "Criou a órbita, o sistema está de olho: qualquer mensagem que contenha um dos satélites acorda ela e o assunto entra em contexto ativo.",
      "Órbita pode ser um botão, uma palavra, um projeto ou uma janela. O que muda é o tipo.",
    ],
    tip: "Comece pelo que a pessoa mais pergunta. Órbita sem gatilho nunca acorda.",
  },
  satelite: {
    title: "Satélites · os gatilhos",
    body: [
      "São as palavras que chamam a órbita. Camada 1.",
      "O casamento é por prefixo de três letras: escrevendo prot, o sistema já resolve protótipos. Erro de digitação não atrapalha.",
      "Cada satélite aparece ligado à órbita no mapa, com linha. É como você enxerga o que já cadastrou.",
    ],
    example: "prototipo\nproto\ndev\nexperimento",
    tip: "Evite palavra genérica solta. Registrar aqui uma palavra que já é satélite de outra órbita gera divergência — e o sistema vai avisar.",
  },
  perguntas: {
    title: "Mensagens do usuário",
    body: [
      "Não precisa ser pergunta. É qualquer coisa que a pessoa escreveria sobre esse assunto.",
      "Serve de referência para você mesmo e alimenta o reconhecimento quando o texto não bate exato nos satélites.",
    ],
    example: "pra que serve esse botão?\no que é isso aqui\nnão entendi essa parte",
    tip: "Escreva do jeito torto que as pessoas escrevem, com erro e abreviação. É assim que chega.",
  },
  ttl: {
    title: "Tempo de órbita",
    body: [
      "Quantos turnos o assunto continua vivo sem ser mencionado.",
      "Cada mensagem que não menciona nada da órbita consome um turno. Chegando a zero, a bolha estoura e o contexto volta ao normal.",
      "Mencionou de novo, o contador reinicia.",
    ],
    tip: "Assunto central pede 5 ou 6. Detalhe passageiro, 2 ou 3. Valor alto demais faz o sistema interpretar coisa que não tem relação.",
  },
  explica: {
    title: "Bobby explica em sequência",
    body: [
      "Desligado, ele sorteia uma das respostas cadastradas. Bom para variar o jeito de dizer a mesma coisa.",
      "Ligado, ele percorre as respostas em ordem: primeira menção mostra o passo 1, segunda mostra o passo 2, e assim por diante.",
      "Serve para ensinar algo em etapas, sem despejar tudo de uma vez.",
    ],
    tip: "Use ligado quando estiver ensinando a usar alguma coisa. Desligado para respostas soltas.",
  },
  reacoes: {
    title: "Respostas e ações",
    body: [
      "Cada bloco tem as falas e até duas ações que disparam junto.",
      "Uma fala por linha: o Bobby escolhe entre elas. Cabem 10 mil caracteres por bloco.",
      "As ações são as funções reais do sistema. Executam no mesmo instante da fala.",
    ],
    example: "Opa, esse é o clipe de anexo.\nAquele ali? É pra mandar arquivo.\nBoa, esse abre o menu de anexo.",
    tip: "Duas ações por bloco é o teto de propósito. Mais que isso a pessoa não acompanha o que aconteceu na tela.",
  },
  bolha: {
    title: "Bolha · o limite do assunto",
    body: [
      "Agrupa órbitas que pertencem ao mesmo tema. Enquanto uma órbita da bolha está viva, o resto da bolha responde primeiro que o mapa inteiro.",
      "É isso que resolve palavra ambígua. Fecha dentro da bolha da galeria significa fechar a galeria — não outra coisa qualquer.",
      "Lacrar a bolha fecha o assunto. Ela vira uma unidade que pode ligar a outras bolhas.",
    ],
    tip: "Escreva o resumo. Quando o zoom afasta e os nós somem, é o resumo que te situa.",
  },
  ordem: {
    title: "Ordem das camadas",
    body: [
      "Camada 0 é a órbita, o objeto vigiado.",
      "Camada 1 são os satélites, as mensagens que chamam.",
      "Camada 2 em diante são as reações, na sequência que você definir.",
      "Dentro de uma bolha, a ordem também decide quem responde primeiro quando duas órbitas reconhecem a mesma coisa.",
    ],
    tip: "Ordem baixa vence a disputa. Coloque o assunto principal em 0 e os detalhes depois.",
  },
  conflito: {
    title: "Divergências",
    body: [
      "Quando a mesma palavra está registrada em duas órbitas, o sistema não sabe qual você quer. Ele detecta sozinho e lista aqui.",
      "Perguntar faz o Bobby devolver a dúvida: tem duas coisas com esse nome, qual delas?",
      "Chutar faz ele escolher a de ordem menor e seguir sem perguntar.",
    ],
    tip: "Perguntar é mais honesto e costuma render conversa melhor. Chutar serve quando uma das opções é claramente mais comum.",
  },
  tipos: {
    title: "Tipos de órbita",
    body: [
      "Ação é algo que o sistema executa. Abrir, fechar, trocar, apagar.",
      "Texto é assunto ou conceito, incluindo pessoas citadas na conversa.",
      "Produto é projeto, case, arquivo ou entrega.",
      "Janela é painel ou região da tela que abre e fecha.",
    ],
    tip: "O tipo muda a cor no mapa e ajuda a bater o olho. Não muda o comportamento.",
  },
  mira: {
    title: "Mira",
    body: [
      "Aponta e captura. O cursor vira alvo, o elemento sob o mouse ganha contorno com o nome, e o clique traz ele para o mapa.",
      "Elemento que já tem órbita aparece com contorno verde e aviso: você não cria duplicata sem querer.",
      "Esc cancela.",
    ],
    tip: "É o jeito mais rápido de mapear uma tela inteira. Vá clicando em tudo que é clicável.",
  },
  achados: {
    title: "Achados",
    body: [
      "Resultado das varreduras, agrupado por categoria.",
      "A varredura de tela encontra tudo que responde a clique na página atual.",
      "Abrindo um arquivo tsx, o parser procura os handlers e extrai o rótulo mais próximo.",
      "Para o projeto inteiro de uma vez, use o script Python em tools.",
    ],
    tip: "O que já virou órbita fica marcado. Clique no que falta para adicionar.",
  },
  dev: {
    title: "Modo desenvolvedor",
    body: [
      "Zona permanente. O que você aplica aqui não pertence à sessão do chat: fica registrado e só sai revertendo.",
      "Inspecione e clique para travar. Cada alvo ganha um número. Clicar de novo destrava. O botão direito abre o menu, que não fecha ao clicar fora — você escolhe entre manter travado ou soltar.",
      "Copiar traz o dossiê completo: markup vivo, regras autorais, estilo computado, cadeia de classes, arquivo provável e o prompt que proíbe a outra IA de inventar função.",
      "Colar aceita apenas declarações de estilo. Markup e script são recusados, porque aplicar código arbitrário numa página viva é abrir porta para injeção.",
    ],
    example: "background: #7c3aed;\nborder-radius: 14px;\npadding: 10px 18px;",
    tip: "Trave vários antes de copiar. O dossiê sai numerado e a outra IA entende que são partes do mesmo conjunto.",
  },
  ocultas: {
    title: "Ações ocultas",
    body: [
      "Não existem na interface. Só saem daqui, pela conversa, quando alguém descobre como pedir.",
      "Na primeira vez o Bobby responde surpreso, como se tivesse acabado de descobrir que consegue. Depois vira resposta comum.",
      "Toda ação grava o estado anterior. Nada é irreversível.",
    ],
    tip: "As de sacanagem voltam sozinhas. As de posição ficam até você mandar restaurar.",
  },
  tesoura: {
    title: "Tesoura",
    body: [
      "Modo de corte. Com ele ligado, clicar numa linha corta a ligação entre duas órbitas.",
      "Clique de novo no ícone, ou Esc, para sair do modo.",
    ],
    tip: "Botão direito num nó também abre o menu com excluir e desligar tudo.",
  },
};

export function helpFor(key: string): HelpEntry | null {
  return HELP[key] || null;
}
