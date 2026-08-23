/* ══════════════════════════════════════════════════════════════
   MOTOR DE INTENÇÕES
   ──────────────────────────────────────────────────────────────
   Não é lista de frases prontas: é combinação de VERBO + ALVO.
   Cada verbo carrega suas conjugações (presente, passado, futuro,
   infinitivo, gerúndio, imperativo) e cada alvo seus sinônimos.
   Isso multiplica a cobertura sem inchar o arquivo.

   Marcos injeta mais variações pelo painel do RenderLab, e elas
   entram aqui em runtime pela função addTraining().
   ══════════════════════════════════════════════════════════════ */

export type IntentId =
  | "color.change" | "color.revert" | "color.random"
  | "gallery.docs" | "gallery.protos" | "gallery.liked" | "gallery.trash" | "gallery.open"
  | "chat.new" | "chat.rename" | "chat.clear" | "chat.history"
  | "panel.rag" | "panel.skills" | "panel.apikey" | "panel.sentinela"
  | "view.expand" | "view.collapse" | "view.layout"
  | "doubt.error" | "doubt.capability"
  | "fun.game" | "fun.joke"
  | "font.change" | "confirm.yes" | "confirm.no";

const strip = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/* ── VERBOS: raiz + todas as flexões que importam ─────────────── */
const VERBS: Record<string, string[]> = {
  trocar: ["troca", "trocar", "trocou", "trocaria", "trocando", "troque", "trocamos", "trocarei", "trocava"],
  mudar: ["muda", "mudar", "mudou", "mudaria", "mudando", "mude", "mudamos", "mudarei", "mudava", "mudança"],
  alterar: ["altera", "alterar", "alterou", "alteraria", "alterando", "altere", "alteracao"],
  colocar: ["coloca", "colocar", "colocou", "colocaria", "colocando", "coloque", "poe", "por", "ponha", "botar", "bota"],
  deixar: ["deixa", "deixar", "deixou", "deixaria", "deixando", "deixe"],
  fazer: ["faz", "fazer", "fez", "faria", "fazendo", "faca", "façam"],
  querer: ["quero", "queria", "quer", "querer", "gostaria", "desejo", "queremos"],
  poder: ["pode", "poderia", "podes", "consegue", "conseguiria", "da pra", "da para", "sabe"],
  reverter: ["reverte", "reverter", "reverteu", "desfaz", "desfazer", "desfez", "volta", "voltar", "voltou",
    "retorna", "retornar", "restaura", "restaurar", "cancela", "cancelar", "tira", "tirar", "remove", "remover"],
  abrir: ["abre", "abrir", "abriu", "abriria", "abrindo", "abra", "acessa", "acessar", "acessou", "acesse",
    "mostra", "mostrar", "mostrou", "mostre", "exibe", "exibir", "ve", "ver", "vamos ver", "consulta", "consultar"],
  buscar: ["busca", "buscar", "buscou", "procura", "procurar", "procurou", "acha", "achar", "localiza", "localizar",
    "encontra", "encontrar", "pesquisa", "pesquisar"],
  criar: ["cria", "criar", "criou", "gera", "gerar", "gerou", "monta", "montar", "montou", "inicia", "iniciar", "comeca", "comecar", "novo", "nova"],
  apagar: ["apaga", "apagar", "apagou", "deleta", "deletar", "deletou", "exclui", "excluir", "excluiu", "limpa", "limpar", "limpou", "zera", "zerar"],
  renomear: ["renomeia", "renomear", "renomeou", "rebatiza", "chama de", "chamar de", "nomeia", "nomear"],
  expandir: ["expande", "expandir", "expandiu", "maximiza", "maximizar", "aumenta", "aumentar", "tela cheia", "fullscreen"],
  encolher: ["encolhe", "encolher", "minimiza", "minimizar", "diminui", "diminuir", "reduz", "reduzir", "widget"],
};

/* ── ALVOS: sinônimos do objeto da ação ───────────────────────── */
const TARGETS: Record<string, string[]> = {
  cor: ["cor", "cores", "tom", "tons", "tonalidade", "coloracao", "paleta", "tema", "visual", "aparencia", "estilo", "skin", "fundo", "cor de fundo"],
  chat: ["chat", "conversa", "janela", "tela", "sistema", "interface", "app", "aqui", "isso", "tudo", "layout", "pagina"],
  documento: ["documento", "documentos", "doc", "docs", "arquivo", "arquivos", "pasta", "pastas", "material", "materiais", "anexo", "anexos"],
  galeria: ["galeria", "gallery", "gallerybob", "explorador", "acervo", "biblioteca"],
  prototipo: ["prototipo", "prototipos", "protótipo", "protótipos", "codigo gerado", "dev", "experimento"],
  curtida: ["curtida", "curtidas", "favorito", "favoritos", "salvo", "salvos", "coracao", "like", "likes"],
  lixeira: ["lixeira", "lixo", "deletado", "deletados", "excluido", "excluidos", "removido", "removidos"],
  historico: ["historico", "conversas", "chats", "sessoes", "lista de chat"],
  base: ["base", "rag", "conhecimento", "embedding", "embeddings", "memoria", "vetor", "vetores", "indice"],
  skill: ["skill", "skills", "habilidade", "habilidades", "renderlab", "render lab", "motor", "plugin", "plugins", "capacidade"],
  chave: ["api", "api key", "chave", "token", "credencial"],
  sentinela: ["sentinela", "guarda", "firewall", "seguranca", "perimetro", "vigilancia", "posto", "protecao", "log", "logs", "registro", "registros", "auditoria"],
  fonte: ["fonte", "fontes", "tipografia", "letra", "letras", "typeface", "font"],
  jogo: ["jogo", "jogos", "game", "games", "brincadeira", "joguinho", "dama", "damas", "xadrez", "velha", "jogar"],
};

/* ── CORES reconhecidas em linguagem natural ──────────────────── */
export const COLOR_WORDS: Record<string, string> = {
  vermelho: "vermelho", vermelha: "vermelho", rubro: "vermelho", rubi: "vermelho", carmim: "vermelho", sangue: "vermelho", escarlate: "vermelho",
  azul: "azul", azulado: "azul", azulada: "azul", cobalto: "azul", marinho: "azul", safira: "azul", anil: "azul",
  verde: "verde", esmeralda: "verde", musgo: "verde", oliva: "verde", jade: "verde", limao: "verde",
  rosa: "rosa", rosado: "rosa", pink: "rosa", magenta: "rosa", fucsia: "rosa",
  laranja: "laranja", alaranjado: "laranja", ambar: "laranja", tangerina: "laranja", coral: "laranja",
  amarelo: "amarelo", amarela: "amarelo", dourado: "amarelo", ouro: "amarelo", mostarda: "amarelo", sol: "amarelo",
  roxo: "roxo", roxa: "roxo", violeta: "roxo", lilas: "roxo", ametista: "roxo", purpura: "roxo", lavanda: "roxo",
  ciano: "ciano", turquesa: "ciano", agua: "ciano", celeste: "ciano",
  cinza: "cinza", grafite: "cinza", chumbo: "cinza", prata: "cinza", prateado: "cinza",
  preto: "preto", preta: "preto", escuro: "preto", escura: "preto", dark: "preto", onix: "preto", noturno: "preto", noite: "preto",
  branco: "branco", branca: "branco", claro: "branco", clara: "branco", light: "branco", neve: "branco", gelo: "branco",
  marrom: "marrom", cafe: "marrom", chocolate: "marrom", terra: "marrom", madeira: "marrom", bronze: "marrom",
  uva: "uva", creme: "creme", bege: "creme", papel: "creme",
};

/* ── Treinamento injetado pelo painel ─────────────────────────── */
const TRAINING_KEY = "bobby_intent_training";
type Training = Record<string, string[]>;

function loadTraining(): Training {
  try { return JSON.parse(localStorage.getItem(TRAINING_KEY) || "{}"); } catch { return {}; }
}
let TRAINING: Training = loadTraining();

export function addTraining(intent: IntentId, phrases: string[]): number {
  const clean = phrases.map(strip).filter((p) => p.length > 1);
  TRAINING[intent] = [...new Set([...(TRAINING[intent] || []), ...clean])].slice(0, 400);
  try { localStorage.setItem(TRAINING_KEY, JSON.stringify(TRAINING)); } catch { /* cota */ }
  return clean.length;
}
export function getTraining(intent: IntentId): string[] { return TRAINING[intent] || []; }
export function allTraining(): Training { return TRAINING; }
export function clearTraining(intent: IntentId): void {
  delete TRAINING[intent];
  try { localStorage.setItem(TRAINING_KEY, JSON.stringify(TRAINING)); } catch { /* cota */ }
}
export function importTraining(data: Training): void {
  TRAINING = { ...TRAINING, ...data };
  try { localStorage.setItem(TRAINING_KEY, JSON.stringify(TRAINING)); } catch { /* cota */ }
}

/* ── Detecção ─────────────────────────────────────────────────── */
const hasVerb = (s: string, group: string) =>
  (VERBS[group] || []).some((v) => new RegExp(`(^|\\s)${v}(\\s|$|r|\\b)`).test(s) || s.includes(v));

const hasTarget = (s: string, group: string) =>
  (TARGETS[group] || []).some((t) => s.includes(t));

export function findColor(text: string): string | null {
  const s = strip(text);
  for (const [word, key] of Object.entries(COLOR_WORDS)) {
    if (new RegExp(`(^|\\s)${word}(\\s|$)`).test(s)) return key;
  }
  return null;
}

export interface IntentMatch {
  id: IntentId;
  color?: string;
  confidence: "alta" | "média";
}

/**
 * Reconhece a intenção. Combina verbo + alvo; se o treinamento
 * do Marcos tiver a frase, a confiança sobe para alta.
 */
export function detectIntent(text: string): IntentMatch | null {
  const s = strip(text);
  if (!s || s.length > 220) return null;

  // 1. Treinamento manual tem prioridade absoluta
  for (const [intent, phrases] of Object.entries(TRAINING)) {
    if (phrases.some((p) => s === p || (p.length > 6 && s.includes(p))))
      return { id: intent as IntentId, color: findColor(s) || undefined, confidence: "alta" };
  }

  const color = findColor(s);
  const isQuestion = /^(o que|oque|quais|qual|quando|quem|onde|por que|porque|como funciona)\b/.test(s);

  /* ── CORES ── */
  const colorTarget = hasTarget(s, "cor");
  const chatTarget = hasTarget(s, "chat");

  if (hasVerb(s, "reverter") && (colorTarget || color)) {
    return { id: "color.revert", confidence: "alta" };
  }
  if ((colorTarget || color) && (chatTarget || colorTarget) &&
      (hasVerb(s, "trocar") || hasVerb(s, "mudar") || hasVerb(s, "alterar") ||
       hasVerb(s, "colocar") || hasVerb(s, "deixar") || hasVerb(s, "fazer") ||
       hasVerb(s, "querer") || hasVerb(s, "poder"))) {
    return color
      ? { id: "color.change", color, confidence: "alta" }
      : { id: "color.random", confidence: "alta" };
  }
  // "quero azul", "deixa ele roxo" — cor sem a palavra "cor"
  if (color && (hasVerb(s, "deixar") || hasVerb(s, "querer") || hasVerb(s, "colocar") || hasVerb(s, "trocar") || hasVerb(s, "mudar"))) {
    return { id: "color.change", color, confidence: "média" };
  }

  /* ── FONTE (função oculta) ── */
  if (hasTarget(s, "fonte") && (hasVerb(s, "trocar") || hasVerb(s, "mudar") || hasVerb(s, "alterar") || hasVerb(s, "colocar"))) {
    return { id: "font.change", confidence: "alta" };
  }

  /* ── GALERIA ── */
  const openish = hasVerb(s, "abrir") || hasVerb(s, "buscar");
  if (openish && !isQuestion) {
    if (hasTarget(s, "curtida")) return { id: "gallery.liked", confidence: "alta" };
    if (hasTarget(s, "lixeira")) return { id: "gallery.trash", confidence: "alta" };
    if (hasTarget(s, "prototipo")) return { id: "gallery.protos", confidence: "alta" };
    if (hasTarget(s, "galeria")) return { id: "gallery.open", confidence: "alta" };
    if (hasTarget(s, "documento")) return { id: "gallery.docs", confidence: "alta" };
    if (hasTarget(s, "base")) return { id: "panel.rag", confidence: "alta" };
    if (hasTarget(s, "skill")) return { id: "panel.skills", confidence: "alta" };
    if (hasTarget(s, "sentinela")) return { id: "panel.sentinela", confidence: "alta" };
    if (hasTarget(s, "chave")) return { id: "panel.apikey", confidence: "alta" };
    if (hasTarget(s, "historico")) return { id: "chat.history", confidence: "alta" };
  }

  /* ── CHAT ── */
  if (hasVerb(s, "criar") && hasTarget(s, "chat")) return { id: "chat.new", confidence: "alta" };
  if (/(nov[ao])\s+(chat|conversa|sessao)/.test(s)) return { id: "chat.new", confidence: "alta" };
  if (hasVerb(s, "renomear") && hasTarget(s, "chat")) return { id: "chat.rename", confidence: "alta" };
  if (hasVerb(s, "apagar") && (hasTarget(s, "chat") || s.includes("mensagens"))) return { id: "chat.clear", confidence: "média" };

  /* ── VISTA ── */
  if (hasVerb(s, "expandir") && !isQuestion) return { id: "view.expand", confidence: "alta" };
  if (hasVerb(s, "encolher") && !isQuestion) return { id: "view.collapse", confidence: "alta" };

  /* ── DÚVIDA SOBRE ERRO (gatilho do easter egg) ── */
  if (/(erra|errar|erro|erros|burr|falha|mente|mentir|inventa|inventar|confia|confiavel|alucina)/.test(s) &&
      /(voce|tu|bobby|ia|ai|isso|sistema)/.test(s)) {
    return { id: "doubt.error", confidence: "alta" };
  }

  /* ── JOGO (oculto) ── */
  if (hasTarget(s, "jogo")) return { id: "fun.game", confidence: "média" };

  /* ── CONFIRMAÇÃO ── */
  if (/^(sim|isso|claro|manda|bora|quero|pode|confirma|confirmo|vai|mostra|show|beleza|blz|ok|uhum|aham|com certeza|fala logo|quero ver|to curioso)\b/.test(s))
    return { id: "confirm.yes", confidence: "alta" };
  if (/^(nao|nem|deixa|para|pare|cancela|esquece|melhor nao|depois|agora nao)\b/.test(s))
    return { id: "confirm.no", confidence: "alta" };

  return null;
}

/** Catálogo exibido no painel do RenderLab. */
export interface CommandDef {
  id: IntentId;
  label: string;
  group: string;
  hidden: boolean;
  example: string;
  note: string;
}

export const COMMANDS: CommandDef[] = [
  { id: "color.change", label: "Trocar a cor", group: "Aparência", hidden: false, example: "deixa o chat vermelho", note: "12 paletas prontas; aceita tom aproximado." },
  { id: "color.revert", label: "Reverter a cor", group: "Aparência", hidden: false, example: "volta a cor de antes", note: "Desfaz a última troca." },
  { id: "color.random", label: "Sugerir cores", group: "Aparência", hidden: false, example: "muda a cor do chat", note: "Sem cor definida, o Bobby sugere três." },
  { id: "font.change", label: "Trocar a fonte", group: "Aparência", hidden: true, example: "muda a fonte do chat", note: "Só a IA alcança. O usuário não tem botão." },
  { id: "gallery.open", label: "Abrir a galeria", group: "Galeria", hidden: false, example: "abre a galeria", note: "Janela grande, lado direito." },
  { id: "gallery.docs", label: "Abrir documentos", group: "Galeria", hidden: false, example: "acessa os documentos", note: "Desambigua entre galeria e conversa." },
  { id: "gallery.protos", label: "Abrir protótipos", group: "Galeria", hidden: false, example: "mostra os protótipos", note: "Filtra a pasta DEV." },
  { id: "gallery.liked", label: "Abrir curtidas", group: "Galeria", hidden: false, example: "ver meus favoritos", note: "Cópias soberanas das mensagens." },
  { id: "gallery.trash", label: "Abrir lixeira", group: "Galeria", hidden: false, example: "abre a lixeira", note: "Chats apagados e seus anexos." },
  { id: "chat.new", label: "Nova conversa", group: "Conversa", hidden: false, example: "começa outro chat", note: "Salva a anterior no histórico." },
  { id: "chat.rename", label: "Renomear conversa", group: "Conversa", hidden: false, example: "renomeia para Projeto X", note: "Aceita ordinal e data." },
  { id: "chat.clear", label: "Limpar mensagens", group: "Conversa", hidden: false, example: "limpa o chat", note: "Mantém a conversa no histórico." },
  { id: "chat.history", label: "Abrir histórico", group: "Conversa", hidden: false, example: "mostra minhas conversas", note: "Painel esquerdo." },
  { id: "panel.rag", label: "Base de conhecimento", group: "Sistema", hidden: false, example: "abre a base", note: "Injeção, provedor e JSON." },
  { id: "panel.skills", label: "RenderLab", group: "Sistema", hidden: false, example: "abre as skills", note: "Liga e desliga capacidades." },
  { id: "panel.apikey", label: "Chave de API", group: "Sistema", hidden: false, example: "quero testar minha chave", note: "Gemini e Google Search." },
  { id: "panel.sentinela", label: "Posto do Sentinela", group: "Sistema", hidden: false, example: "abre o sentinela", note: "Registros, regras do firewall e cofre de auditoria." },
  { id: "view.expand", label: "Expandir", group: "Sistema", hidden: false, example: "abre em tela cheia", note: "Sai do modo widget." },
  { id: "view.collapse", label: "Encolher", group: "Sistema", hidden: false, example: "minimiza aí", note: "Volta ao balão." },
  { id: "doubt.error", label: "Provocação sobre erro", group: "Oculto", hidden: true, example: "então você erra?", note: "Abre o aviso do rodapé e brinca com o tempo de leitura." },
  { id: "fun.game", label: "Jogo escondido", group: "Oculto", hidden: true, example: "tem jogo aqui?", note: "Só a IA abre. Damas simplificado." },
  { id: "confirm.yes", label: "Confirmação positiva", group: "Fluxo", hidden: true, example: "manda / bora / quero ver", note: "Avança fluxos de várias etapas." },
  { id: "confirm.no", label: "Confirmação negativa", group: "Fluxo", hidden: true, example: "deixa / agora não", note: "Encerra o fluxo em aberto." },
];
