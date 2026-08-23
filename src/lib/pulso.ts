/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO
   ──────────────────────────────────────────────────────────────
   Depois de uma ação, o assunto não morre: vira uma bolha que
   fica orbitando em segundo plano, esperando o próximo gatilho.

   Enquanto a bolha está viva, palavras soltas ganham significado.
   "prototipos" sozinho não diz nada — mas com a galeria orbitando,
   é a pasta. Passando N turnos sem menção, a bolha estoura.

   Cada decisão da bolha vira log, para memória futura.
   ══════════════════════════════════════════════════════════════ */

import { log as slog } from "./sentinelaLog";

export type OrbitId =
  | "galeria" | "cor" | "conversa" | "sentinela" | "base"
  | "bobby" | "input" | "contexto" | "cronometro" | "skills";

export interface OrbitDef {
  id: OrbitId;
  label: string;
  /** Termos que mantêm a bolha viva e disparam ações dentro dela. */
  keeps: string[];
  /** Itens navegáveis quando esta bolha está ativa. */
  items?: { key: string; aliases: string[]; label: string }[];
  /** Turnos sem menção até estourar. */
  ttl: number;
}

export const ORBITS: Record<OrbitId, OrbitDef> = {
  galeria: {
    id: "galeria", label: "Galeria", ttl: 5,
    keeps: ["pasta", "arquivo", "documento", "abre", "abrir", "mostra", "quantos", "conta",
      "primeiro", "segundo", "terceiro", "ultimo", "lista", "categoria", "dentro", "la", "ali"],
    items: [
      { key: "doc", aliases: ["documento", "documentos", "doc", "docs", "arquivo", "arquivos"], label: "Documentos" },
      { key: "proto", aliases: ["prototipo", "prototipos", "proto", "protot", "dev proto", "experimento"], label: "DEV Protótipos" },
      { key: "final", aliases: ["confirmado", "confirmados", "final", "finais", "aprovado", "dev conf"], label: "DEV Confirmados" },
      { key: "liked", aliases: ["curtida", "curtidas", "favorito", "favoritos", "coracao", "salvo"], label: "Mensagens Curtidas" },
      { key: "chats", aliases: ["chat", "chats", "conversa", "conversas", "sessao"], label: "Chats" },
      { key: "trash", aliases: ["lixeira", "lixo", "deletado", "deletados", "apagado"], label: "Lixeira do Chat" },
    ],
  },
  cor: {
    id: "cor", label: "Aparência", ttl: 4,
    keeps: ["cor", "tom", "tema", "balao", "bolha", "fundo", "botao", "botoes", "letra", "fonte",
      "css", "visual", "escuro", "claro", "muda", "troca", "volta", "borda", "sombra"],
  },
  conversa: {
    id: "conversa", label: "Conversa", ttl: 4,
    keeps: ["chat", "conversa", "nome", "titulo", "renomeia", "apaga", "limpa", "historico",
      "primeiro", "segundo", "terceiro", "ultimo", "novo", "sessao"],
  },
  sentinela: {
    id: "sentinela", label: "Sentinela", ttl: 4,
    keeps: ["sentinela", "guarda", "log", "logs", "registro", "bloqueio", "barrado", "regra",
      "firewall", "seguranca", "quarentena", "codigo retido", "libera"],
  },
  base: {
    id: "base", label: "Base de conhecimento", ttl: 4,
    keeps: ["rag", "base", "embedding", "vetor", "chunk", "indexa", "injeta", "memoria",
      "fonte", "similaridade", "documento"],
  },
  bobby: {
    id: "bobby", label: "Bobby", ttl: 5,
    keeps: ["bobby", "voce", "tu", "card", "identidade", "quem", "erra", "sabe", "consegue",
      "avatar", "foto", "nome", "persona", "humor"],
  },
  input: {
    id: "input", label: "Caixa de mensagem", ttl: 4,
    keeps: ["clip", "clipe", "anexo", "botao", "enviar", "envio", "link", "colar", "arquivo",
      "foto", "imagem", "documento", "algoritmo", "turbo", "msgs", "contador"],
  },
  contexto: {
    id: "contexto", label: "Contexto", ttl: 4,
    keeps: ["contexto", "marcador", "carimbo", "filtro", "tag", "categoria", "assunto", "trilho"],
  },
  cronometro: {
    id: "cronometro", label: "Cronômetro", ttl: 3,
    keeps: ["cronometro", "tempo", "relogio", "sessao", "zera", "zerar", "quanto tempo", "minuto", "hora"],
  },
  skills: {
    id: "skills", label: "Skills", ttl: 4,
    keeps: ["skill", "skills", "renderlab", "plugin", "liga", "desliga", "ativa", "desativa",
      "motor", "capacidade", "turbo", "visao", "pdf"],
  },
};

const strip = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/* ── Estado da órbita ─────────────────────────────────────────── */

export interface OrbitState {
  id: OrbitId;
  /** Turnos restantes antes de estourar. */
  life: number;
  /** Sub-alvo dentro da bolha, ex.: pasta aberta na galeria. */
  focus?: string;
  since: number;
  /** Quantas vezes o usuário insistiu no mesmo pedido. */
  repeats: Record<string, number>;
}

let orbit: OrbitState | null = null;
const listeners = new Set<(o: OrbitState | null) => void>();

export function subscribeOrbit(fn: (o: OrbitState | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = () => listeners.forEach((fn) => fn(orbit));

export function current(): OrbitState | null { return orbit; }

/** Entra em órbita ou renova a que já existe. */
export function enter(id: OrbitId, focus?: string): void {
  return enterOrbit(id, focus);
}

function enterOrbit(id: OrbitId, focus?: string): void {
  const def = ORBITS[id];
  if (orbit?.id === id) {
    orbit = { ...orbit, life: def.ttl, focus: focus ?? orbit.focus };
  } else {
    orbit = { id, life: def.ttl, focus, since: Date.now(), repeats: {} };
    slog("config", "órbita", `Pulso Eterno entrou em órbita: ${def.label}.`, { severity: "info" });
  }
  emit();
}

/** Consome um turno. Se a mensagem menciona a bolha, ela se renova. */
export function pulse(text: string): OrbitState | null {
  if (!orbit) return null;
  const def = ORBITS[orbit.id];
  const s = strip(text);
  const mentioned = def.keeps.some((k) => s.includes(strip(k)));

  if (mentioned) {
    orbit = { ...orbit, life: def.ttl };
  } else {
    orbit = { ...orbit, life: orbit.life - 1 };
    if (orbit.life <= 0) {
      slog("config", "órbita", `Bolha ${def.label} estourou por inatividade.`, { severity: "info" });
      orbit = null;
    }
  }
  emit();
  return orbit;
}

export function burst(): void {
  if (!orbit) return;
  slog("config", "órbita", `Bolha ${ORBITS[orbit.id].label} encerrada.`, { severity: "info" });
  orbit = null;
  emit();
}

/** Conta insistência para evitar repetir a mesma resposta. */
export function noteRepeat(key: string): number {
  if (!orbit) return 0;
  const n = (orbit.repeats[key] || 0) + 1;
  orbit = { ...orbit, repeats: { ...orbit.repeats, [key]: n } };
  return n;
}

/* ── Resolução por prefixo ────────────────────────────────────
   "prot" já basta para protótipos. "de" é ambíguo entre
   Documentos e os dois DEV — nesse caso devolve a lista.
   ──────────────────────────────────────────────────────────── */

export interface PrefixResult {
  exact?: string;
  ambiguous?: { key: string; label: string }[];
}

export function resolveItem(id: OrbitId, text: string): PrefixResult | null {
  const def = ORBITS[id];
  if (!def.items) return null;
  const s = strip(text);
  const words = s.split(/[\s,.:;!?]+/).filter((w) => w.length >= 2);

  const hits = new Map<string, string>();
  for (const item of def.items) {
    for (const alias of item.aliases) {
      const a = strip(alias);
      for (const w of words) {
        // Palavra inteira, ou prefixo de pelo menos 3 letras.
        if (w === a || (w.length >= 3 && a.startsWith(w)) || (a.length >= 3 && w.startsWith(a))) {
          hits.set(item.key, item.label);
        }
      }
    }
  }
  if (hits.size === 0) return null;
  if (hits.size === 1) return { exact: [...hits.keys()][0] };
  return { ambiguous: [...hits].map(([key, label]) => ({ key, label })) };
}

/** A bolha reconhece um pedido de contagem. */
export function isCountRequest(text: string): boolean {
  const s = strip(text);
  return /\b(quantos|quantas|quantidade|conta|contar|numero de|total)\b/.test(s);
}

/** Referência ordinal dentro da bolha: "o terceiro", "o último". */
export function ordinalIn(text: string): number | null {
  const s = strip(text);
  const words: Record<string, number> = {
    primeiro: 0, primeira: 0, segundo: 1, segunda: 1, terceiro: 2, terceira: 2,
    quarto: 3, quarta: 3, quinto: 4, quinta: 4, ultimo: -1, ultima: -1,
  };
  for (const [w, i] of Object.entries(words)) if (s.includes(w)) return i;
  const n = s.match(/\b(\d+)[ºª°]?\b/);
  return n ? Math.max(0, Number(n[1]) - 1) : null;
}
