/* ══════════════════════════════════════════════════════════════
   FALAS DO BOBBY
   ──────────────────────────────────────────────────────────────
   Cada ação tem três momentos: o aviso de que vai fazer, o
   trabalho em si e a confirmação. Todos editáveis pelo painel,
   sem tocar em código.

   Marcos injeta variações em RenderLab › Comandos › Falas.
   ══════════════════════════════════════════════════════════════ */

export type SpeechMoment = "aviso" | "trabalho" | "pronto" | "duvida";

export interface SpeechSet {
  aviso: string[];
  trabalho: string[];
  pronto: string[];
  duvida?: string[];
}

/** {alvo} é trocado pelo nome do que foi feito. */
export const DEFAULT_SPEECH: Record<string, SpeechSet> = {
  "chat.rename": {
    aviso: [
      "Opa, agora pera aí!",
      "Deixa comigo.",
      "Boa, já vou trocar.",
      "Peraí que eu resolvo.",
      "Certo, mudando agora.",
    ],
    trabalho: ["Bobby trabalhando", "Renomeando a sessão", "Ajustando o título"],
    pronto: [
      "Pronto! Nome trocado para **{alvo}**.",
      "Feito. Agora essa conversa se chama **{alvo}**.",
      "Trocado. **{alvo}** ficou bom.",
      "Tá na mão: **{alvo}**.",
    ],
  },
  "gallery.open": {
    aviso: ["Opa, já vou lá.", "Deixa comigo.", "Peraí que eu abro.", "Boa, vamos ver."],
    trabalho: ["Abrindo a galeria", "Puxando os arquivos", "Carregando as pastas"],
    pronto: ["Tá na mão! Galeria aberta.", "Pronto, abri em **{alvo}**.", "Aberto. **{alvo}** logo aí do lado."],
    duvida: [
      "Qual delas? Tem mais de uma por aqui.",
      "Peraí, você fala de qual? Achei mais de uma.",
      "Tem duas com esse começo. Qual você quer?",
    ],
  },
  "gallery.docs": {
    aviso: ["Opa, deixa eu ver.", "Certo, já localizo."],
    trabalho: ["Procurando os documentos", "Vasculhando as pastas"],
    pronto: ["Achei! Documentos aberto.", "Tá na mão: pasta **{alvo}**."],
    duvida: [
      "Você fala dos **documentos da galeria** ou de algum que apareceu **aqui na conversa**?",
      "Peraí: da galeria ou dessa conversa? São lugares diferentes.",
      "Documento tem em dois lugares. Da pasta ou do chat?",
    ],
  },
  "color.change": {
    aviso: ["Peraí… deixa eu tentar uma coisa.", "Hmm. Vamos ver se dá.", "Opa, acho que consigo."],
    trabalho: ["Reescrevendo as variáveis", "Derivando a paleta", "Aplicando o tema"],
    pronto: ["**Consegui.** Tema **{alvo}** no ar.", "Pronto! Ficou **{alvo}**.", "Olha só: **{alvo}** aplicado."],
  },
  "chat.new": {
    aviso: ["Beleza, abrindo.", "Certo, conversa nova."],
    trabalho: ["Salvando a atual", "Preparando a sessão"],
    pronto: ["Pronto! Conversa nova. A anterior ficou salva no histórico.", "Tá na mão, começando do zero."],
  },
  "panel.sentinela": {
    aviso: ["Opa, chamando a guarda.", "Certo, vou abrir o posto."],
    trabalho: ["Abrindo o Posto do Sentinela", "Carregando os registros"],
    pronto: ["Tá na mão! Posto aberto.", "Pronto. Tudo que ele barrou está ali."],
  },
  "cronometro.reset": {
    aviso: ["Opa, zerar o cronômetro? Deixa comigo.", "Certo, resetando."],
    trabalho: ["Zerando o contador", "Reiniciando a sessão"],
    pronto: ["Zerado! Mas entre nós: o total real era **{alvo}**. Só reiniciei o mostrador.", "Feito. Marcador em zero — o tempo de casa continua **{alvo}**."],
  },
  generic: {
    aviso: ["Opa, deixa comigo.", "Certo, já faço.", "Peraí que eu resolvo.", "Boa, vamos lá."],
    trabalho: ["Bobby trabalhando", "Processando", "Resolvendo aqui"],
    pronto: ["Pronto! Tá na mão.", "Feito.", "Resolvido."],
  },
};

const KEY = "bobby_speech";

function loadOverrides(): Record<string, Partial<SpeechSet>> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
let OVERRIDES = loadOverrides();

export function speechFor(action: string, moment: SpeechMoment): string {
  const base = DEFAULT_SPEECH[action] || DEFAULT_SPEECH.generic;
  const over = OVERRIDES[action];
  const pool = [...(base[moment] || DEFAULT_SPEECH.generic[moment] || []), ...((over?.[moment]) || [])];
  if (!pool.length) return "";
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getSpeech(action: string, moment: SpeechMoment): string[] {
  return OVERRIDES[action]?.[moment] || [];
}

export function addSpeech(action: string, moment: SpeechMoment, phrases: string[]): number {
  const clean = phrases.map((p) => p.trim()).filter(Boolean);
  OVERRIDES[action] = OVERRIDES[action] || {};
  OVERRIDES[action][moment] = [...new Set([...(OVERRIDES[action][moment] || []), ...clean])].slice(0, 200);
  try { localStorage.setItem(KEY, JSON.stringify(OVERRIDES)); } catch { /* cota */ }
  return clean.length;
}

export function clearSpeech(action: string, moment: SpeechMoment): void {
  if (OVERRIDES[action]) delete OVERRIDES[action][moment];
  try { localStorage.setItem(KEY, JSON.stringify(OVERRIDES)); } catch { /* cota */ }
}

export function allSpeech(): Record<string, Partial<SpeechSet>> { return OVERRIDES; }

export function importSpeech(data: Record<string, Partial<SpeechSet>>): void {
  OVERRIDES = { ...OVERRIDES, ...data };
  try { localStorage.setItem(KEY, JSON.stringify(OVERRIDES)); } catch { /* cota */ }
}

/** Ações que aceitam configuração de fala. */
export const SPEECH_ACTIONS = [
  { id: "chat.rename", label: "Renomear conversa" },
  { id: "chat.new", label: "Nova conversa" },
  { id: "gallery.open", label: "Abrir galeria" },
  { id: "gallery.docs", label: "Abrir documentos" },
  { id: "color.change", label: "Trocar cor" },
  { id: "panel.sentinela", label: "Abrir Sentinela" },
  { id: "cronometro.reset", label: "Zerar cronômetro" },
  { id: "generic", label: "Padrão para as demais" },
];
