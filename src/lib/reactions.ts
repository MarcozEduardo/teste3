/* ══════════════════════════════════════════════════════════════
   REAÇÕES — a camada que faz o Bobby parecer vivo
   Enrolação antes de agir, memes, cores secretas e metadados
   de digitação escritos como fala humana.
   ══════════════════════════════════════════════════════════════ */

/* ── 40 frases de "deixa eu procurar" antes de abrir algo ── */
export const STALL = [
  "Calma aí que eu tô procurando isso…",
  "Peraí, deixa eu achar onde guardei…",
  "Só um segundo, tô vasculhando as pastas…",
  "Opa, já vou abrir. Deixa eu localizar primeiro…",
  "Espera, isso tá em algum lugar por aqui…",
  "Tô indo lá pegar, dois segundos…",
  "Deixa comigo, já acho…",
  "Um instante, conferindo o que tem lá dentro…",
  "Buscando… é rapidinho, prometo.",
  "Achei o caminho, abrindo agora…",
  "Segura aí que eu já trago…",
  "Rodando a busca nas pastas…",
  "Só localizar e eu te mostro…",
  "Peraí, tem bastante coisa arquivada aqui…",
  "Consultando o índice, um momento…",
  "Já tô com a mão na maçaneta…",
  "Deixa eu confirmar que é esse mesmo…",
  "Quase lá, carregando…",
  "Um segundinho, organizando o que achei…",
  "Puxando da galeria agora…",
  "Espera só um tiquinho…",
  "Tô abrindo a gaveta certa…",
  "Localizei. Preparando pra exibir…",
  "Isso aqui tava bem guardado, hein…",
  "Dois toques e eu te mostro…",
  "Verificando se ainda tá salvo…",
  "Carregando o conteúdo, aguenta aí…",
  "Peraí que eu não quero abrir o errado…",
  "Rodando o retrieval na galeria…",
  "Encontrei algo, deixa eu conferir…",
  "Já já aparece na sua tela…",
  "Tô montando a visualização…",
  "Um momento, confirmando o formato…",
  "Separando o arquivo certo pra você…",
  "Isso demora uns segundos, sem pressa…",
  "Abrindo em instantes, só ajustando…",
  "Peraí, deixa eu ver se tá tudo certo aqui…",
  "Recuperando da memória local…",
  "Pronto, achei. Trazendo pra cá…",
  "Última conferida e eu abro…",
];

/* ── Reações a risada (meme estilo figurinha) ── */
export const LAUGH = [
  { art: "( ͡° ͜ʖ ͡°)", say: "Tá rindo do quê? Fala que eu rio junto." },
  { art: "¯\\_(ツ)_/¯", say: "Eu não fiz nada, foi o Sentinela." },
  { art: "(╯°□°)╯", say: "Essa risada foi de nervoso ou de aprovação?" },
  { art: "(•_•) ( •_•)>⌐■-■", say: "Já que tá rindo… (⌐■_■)" },
  { art: "ʕ•ᴥ•ʔ", say: "Risada registrada no meu banco de emoções." },
  { art: "(￣▽￣)ノ", say: "Kkkk contagia até quem é feito de JavaScript." },
  { art: "＼(^o^)／", say: "Boa! Anotei que você tem bom humor." },
  { art: "( ˘ ³˘)♥", say: "Gostei de você. Isso é raro num robô." },
  { art: "(☞ﾟヮﾟ)☞", say: "Continua que a conversa tá boa." },
  { art: "(¬‿¬)", say: "Sei… tá rindo de mim, né?" },
];

/* ── Cores secretas: o "easter egg" que o Bobby finge não saber ── */
export interface Palette {
  name: string; gold: string; goldLight: string; navy: string;
  bg: string; surface: string; solid: string; text: string; muted: string; border: string;
}

export const PALETTES: Record<string, Palette> = {
  vermelho: { name: "Rubi", gold: "#dc2626", goldLight: "#f87171", navy: "#450a0a", bg: "#f6e6e4", surface: "#faf0ee", solid: "#fffaf9", text: "#3b1414", muted: "#8a5d5d", border: "rgba(120,20,20,.12)" },
  azul:     { name: "Cobalto", gold: "#2563eb", goldLight: "#60a5fa", navy: "#0c1e4a", bg: "#e3ecf8", surface: "#eff5fc", solid: "#fafcff", text: "#101f38", muted: "#5b7095", border: "rgba(20,50,120,.12)" },
  verde:    { name: "Musgo", gold: "#15803d", goldLight: "#4ade80", navy: "#052e16", bg: "#e4f0e6", surface: "#eff7f0", solid: "#fafdfa", text: "#12291a", muted: "#5c7d66", border: "rgba(15,80,40,.12)" },
  rosa:     { name: "Quartzo", gold: "#db2777", goldLight: "#f9a8d4", navy: "#500724", bg: "#f8e6f0", surface: "#fcf0f6", solid: "#fffafc", text: "#3d0f26", muted: "#96637d", border: "rgba(140,20,80,.12)" },
  laranja:  { name: "Âmbar", gold: "#ea580c", goldLight: "#fb923c", navy: "#431407", bg: "#f8e9df", surface: "#fcf3ec", solid: "#fffbf8", text: "#3a1c0c", muted: "#8d6448", border: "rgba(140,60,10,.12)" },
  amarelo:  { name: "Sol", gold: "#ca8a04", goldLight: "#fcd34d", navy: "#422006", bg: "#f7f0dc", surface: "#fbf6e8", solid: "#fffdf7", text: "#362b0d", muted: "#8a7742", border: "rgba(120,90,10,.12)" },
  roxo:     { name: "Ametista", gold: "#9333ea", goldLight: "#c084fc", navy: "#3b0764", bg: "#efe4f8", surface: "#f6eefc", solid: "#fdfaff", text: "#2b1240", muted: "#755b93", border: "rgba(90,30,150,.12)" },
  ciano:    { name: "Turquesa", gold: "#0891b2", goldLight: "#22d3ee", navy: "#083344", bg: "#dff0f4", surface: "#edf7fa", solid: "#f9fdfe", text: "#0d2b33", muted: "#4f7a86", border: "rgba(10,90,110,.12)" },
  cinza:    { name: "Grafite", gold: "#475569", goldLight: "#94a3b8", navy: "#0f172a", bg: "#e8eaee", surface: "#f2f4f7", solid: "#fbfcfd", text: "#1c2430", muted: "#697586", border: "rgba(30,40,60,.12)" },
  preto:    { name: "Ônix", gold: "#a1a1aa", goldLight: "#d4d4d8", navy: "#09090b", bg: "#1c1c1f", surface: "#242428", solid: "#2c2c31", text: "#f4f4f5", muted: "#a1a1aa", border: "rgba(255,255,255,.1)" },
  branco:   { name: "Alvo", gold: "#525252", goldLight: "#a3a3a3", navy: "#171717", bg: "#f5f5f5", surface: "#fafafa", solid: "#ffffff", text: "#1c1c1c", muted: "#737373", border: "rgba(0,0,0,.09)" },
  marrom:   { name: "Café", gold: "#92400e", goldLight: "#d97706", navy: "#2b1a0d", bg: "#eee3d8", surface: "#f6efe7", solid: "#fdfaf6", text: "#2f2118", muted: "#856a55", border: "rgba(90,50,20,.13)" },
};

const COLOR_ALIASES: Record<string, string> = {
  vermelha: "vermelho", vermelho: "vermelho", rubi: "vermelho", carmim: "vermelho",
  azul: "azul", azulada: "azul", cobalto: "azul", "azul escuro": "azul",
  verde: "verde", esmeralda: "verde", musgo: "verde",
  rosa: "rosa", pink: "rosa", "rosa choque": "rosa",
  laranja: "laranja", ambar: "laranja", "âmbar": "laranja",
  amarelo: "amarelo", amarela: "amarelo", dourado: "amarelo",
  roxo: "roxo", roxa: "roxo", ametista: "roxo", violeta: "roxo", lilas: "roxo",
  ciano: "ciano", turquesa: "ciano", azulclaro: "ciano",
  cinza: "cinza", grafite: "cinza", chumbo: "cinza",
  preto: "preto", preta: "preto", escuro: "preto", dark: "preto", onix: "preto",
  branco: "branco", branca: "branco", claro: "branco", light: "branco",
  marrom: "marrom", cafe: "marrom", "café": "marrom",
};

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Detecta pedido de troca de cor. Devolve a chave da paleta. */
export function detectColor(text: string): string | null {
  const s = strip(text);
  const wantsColor = /(cor|tema|deixa|muda|troca|pinta|fica|coloca|quero|consegue|poe|põe|transforma)/.test(s);
  if (!wantsColor) return null;
  for (const [alias, key] of Object.entries(COLOR_ALIASES)) {
    if (new RegExp(`\\b${strip(alias)}\\b`).test(s)) return key;
  }
  return null;
}

/** O Bobby "descobrindo" que consegue — a malandragem combinada. */
export function colorReveal(key: string): string {
  const p = PALETTES[key];
  const openers = [
    `Peraí… deixa eu tentar uma coisa.`,
    `Hmm. Nunca tinha testado isso, mas vamos ver.`,
    `Boa pergunta. Deixa eu fuçar aqui nos meus comandos.`,
    `Opa. Acho que tem algo escondido aqui.`,
  ];
  const o = openers[Math.floor(Math.random() * openers.length)];
  return `${o}

**Consegui.** Tema **${p.name}** aplicado.

Olha, sinceramente? Eu não sabia que dava pra fazer isso. O Marcos deixou as variáveis de cor abertas no runtime e eu acabei de descobrir que consigo reescrever elas na hora. Você achou uma porta que nem eu conhecia.

Se quiser voltar, é só pedir o **uva** ou o **creme**. E se quiser testar outra cor, manda — agora eu sei que funciona.`;
}

/* ── Metadados de digitação, escritos como gente ── */
export function typingBanter(m: { seconds: number; backspaces: number; chars: number; erased: number }): string {
  const min = Math.max(1, Math.round(m.seconds / 60));
  const pool: string[] = [];

  if (m.backspaces > 20) {
    pool.push(
      `Rapaz, ${min} minuto${min > 1 ? "s" : ""} digitando, já foram ${m.backspaces} backspaces e uns ${m.erased} caracteres apagados. Se quiser mandar um pedaço logo pra eu ir conferindo enquanto você termina o resto, é só soltar.`,
      `Cara, você escreveu, apagou, escreveu de novo… ${m.backspaces} correções até agora. Tá difícil achar as palavras ou tá caprichando mesmo?`,
      `${m.backspaces} backspaces. Ou você é perfeccionista, ou essa pergunta é mais complicada do que parece. Manda meia bomba que eu ajudo a formular.`,
      `Já apagou ${m.erased} caracteres nesse texto. Sabe que eu aceito rascunho, né? Pode mandar torto que eu endireito.`,
    );
  }
  if (m.seconds > 120 && m.chars > 150) {
    pool.push(
      `E esse textão, precisa mesmo disso tudo? ${m.chars} caracteres e contando. Se der pra resumir em duas linhas eu respondo mais rápido.`,
      `${min} minutos nesse parágrafo. Tô ansioso aqui, hein. Deve ser coisa boa.`,
      `Olha o tamanho disso. Se for descrição de projeto, capricha mesmo. Se for pergunta simples, pode cortar 80%.`,
    );
  }
  if (m.seconds > 90 && m.chars > 0 && m.backspaces < 6) {
    pool.push(
      `Você tá escrevendo direto, sem apagar quase nada. Isso é gente que sabe o que quer. Respeito.`,
      `${min} minutos de digitação limpa. Vem coisa estruturada por aí.`,
    );
  }
  if (!pool.length) {
    pool.push(`Tô vendo movimento no teclado. Fica à vontade, eu espero.`);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Texto parado, sem movimento nenhum: o Bobby cutuca. */
export const IDLE_NUDGE = [
  "Esse texto parado aí… acho que você saiu e me deixou sozinho.",
  "Tem mensagem escrita e não enviada. Desistiu no meio?",
  "Acho que você se ocupou aí, né? Largou a mensagem pela metade.",
  "Cadê você? O cursor tá parado faz um tempo.",
  "A frase ficou pendurada. Se quiser, manda do jeito que está.",
  "Sumiu? Tá tudo salvo, pode voltar quando quiser.",
  "Esse texto tá esfriando aí. Quer mandar assim mesmo?",
  "Escreveu e travou. Acontece — posso sugerir um caminho?",
  "Mensagem em suspenso. Eu continuo aqui, sem pressa.",
  "Parou tudo. Café ou dúvida existencial?",
];

/* ── Idade da mensagem: o RAG marca, a IA comenta ── */
export function ageLabel(ts: number): string | null {
  const diff = Date.now() - ts;
  const h = diff / 3600000;
  if (h < 0.5) return null;
  if (h < 1) return "de uns 30 minutos atrás";
  if (h < 3) return `de ${Math.round(h)}h atrás`;
  if (h < 24) return `de hoje mais cedo, ${Math.round(h)}h atrás`;
  const d = Math.round(h / 24);
  return d === 1 ? "de ontem" : `de ${d} dias atrás`;
}

export const AGE_OPENERS = [
  "Eita, essa já tem um tempinho, mas bora lá.",
  "Essa é antiga, hein. Deixa eu recuperar o fio.",
  "Voltando num assunto de um tempo atrás:",
  "Essa ficou marinando. Retomando:",
];

/* ── Sessão longa: sugerir descanso ── */
export function restNudge(minutes: number): string | null {
  if (minutes < 45) return null;
  if (minutes < 90)
    return `A gente já tá nessa conversa faz ${minutes} minutos. Tá rendendo, mas se quiser esticar as pernas eu guardo tudo aqui.`;
  return `${Math.round(minutes / 60)} horas de chat aberto. Sério, vai tomar uma água. Eu não vou a lugar nenhum e o histórico fica salvo.`;
}

/* ── Confirmação destrutiva ── */
export const CONFIRM_STALL = [
  "Opa, calma. Isso aqui não tem volta.",
  "Peraí. Antes de eu apagar, me confirma.",
  "Essa ação é definitiva. Tem certeza mesmo?",
  "Deixa eu perguntar de novo, porque depois não dá pra desfazer.",
];

export function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
