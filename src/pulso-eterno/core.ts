/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · NÚCLEO
   ──────────────────────────────────────────────────────────────
   Lógica pura. Zero React, zero DOM obrigatório.

   Três níveis, propositalmente separados:

   ÓRBITA    o objeto vigiado. Camada 0.
   SATÉLITE  a palavra que chama a órbita. Camada 1.
   BOLHA     o limite do assunto. Agrupa órbitas e resolve
             ambiguidade: "fecha" dentro da bolha da galeria
             significa fechar a galeria, não outra coisa.
   ══════════════════════════════════════════════════════════════ */

export type OrbitKind = "acao" | "texto" | "produto" | "janela";

export const KIND_META: Record<OrbitKind, { label: string; color: string; hint: string }> = {
  acao:    { label: "Ação",    color: "#7c3aed", hint: "Algo que o sistema executa quando chamado" },
  texto:   { label: "Texto",   color: "#0891b2", hint: "Assunto, conceito ou pessoa citada na conversa" },
  produto: { label: "Produto", color: "#16a34a", hint: "Projeto, case, arquivo ou entrega" },
  janela:  { label: "Janela",  color: "#ec4899", hint: "Painel ou região da tela que abre e fecha" },
};

/** O que acontece quando a órbita reconhece o gatilho. */
export interface Reaction {
  id: string;
  messages: string[];
  /** Até duas ações por reação. */
  actions: string[];
  /** Posição na sequência. Vira a camada 2, 3, 4… */
  step: number;
}

export interface OrbitNode {
  id: string;
  kind: OrbitKind;
  label: string;
  selector?: string;
  /** Satélites: palavras que acordam e renovam esta órbita. */
  triggers: string[];
  /** Mensagens típicas do usuário sobre este assunto. */
  questions: string[];
  ttl: number;
  explains: boolean;
  reactions: Reaction[];
  x: number;
  y: number;
  source: "scan" | "manual";
  /** Bolha à qual pertence. Vazio significa solto no mapa. */
  bubbleId?: string;
  /** Ordem dentro da bolha. Define quem responde primeiro. */
  order: number;
}

export interface OrbitEdge {
  id: string;
  from: string;
  to: string;
  reason: string;
}

/**
 * BOLHA — o limite do assunto.
 * Enquanto está aberta, tudo dentro dela é contexto ativo.
 * Lacrada, vira uma unidade fechada que pode ligar a outras.
 */
export interface Bubble {
  id: string;
  name: string;
  /** Resumo curto, lido quando o zoom afasta e os nós somem. */
  summary: string;
  color: string;
  sealed: boolean;
  /** Palavras que mantêm a bolha inteira viva. */
  keeps: string[];
  x: number;
  y: number;
}

/** Duas órbitas disputando a mesma palavra. */
export interface Conflict {
  term: string;
  nodeIds: string[];
  /** ask devolve pergunta; guess deixa o sistema escolher. */
  policy: "ask" | "guess";
}

export interface PulsoMap {
  version: 3;
  nodes: OrbitNode[];
  edges: OrbitEdge[];
  bubbles: Bubble[];
  conflicts: Conflict[];
  updatedAt: number;
}

const KEY = "pulso_eterno_map";
const uid = () => Math.random().toString(36).slice(2, 9);

export const emptyMap = (): PulsoMap => ({
  version: 3, nodes: [], edges: [], bubbles: [], conflicts: [], updatedAt: Date.now(),
});

export function loadMap(): PulsoMap {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw?.nodes) return { ...emptyMap(), ...raw };
  } catch { /* corrompido */ }
  return emptyMap();
}

export function saveMap(map: PulsoMap): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...map, updatedAt: Date.now() }));
    return true;
  } catch { return false; }
}

export function makeNode(partial: Partial<OrbitNode> = {}): OrbitNode {
  return {
    id: uid(), kind: "acao", label: "Nova órbita",
    triggers: [], questions: [], ttl: 4, explains: false,
    reactions: [], x: 140 + Math.random() * 240, y: 110 + Math.random() * 160,
    source: "manual", order: 0, ...partial,
  };
}

export function makeReaction(step = 0): Reaction {
  return { id: uid(), messages: [""], actions: [], step };
}

export function makeEdge(from: string, to: string, reason = "leva a"): OrbitEdge {
  return { id: uid(), from, to, reason };
}

export function makeBubble(partial: Partial<Bubble> = {}): Bubble {
  return {
    id: uid(), name: "Nova bolha", summary: "", color: "#7c3aed",
    sealed: false, keeps: [], x: 60, y: 60, ...partial,
  };
}

/* ── Normalização e casamento ─────────────────────────────────── */

export const strip = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/** Dentro de uma órbita viva, três letras já resolvem. */
export function matchTrigger(text: string, triggers: string[]): boolean {
  const words = strip(text).split(/[\s,.:;!?]+/).filter((w) => w.length >= 2);
  return triggers.some((t) => {
    const a = strip(t);
    return words.some((w) => w === a || (w.length >= 3 && a.startsWith(w)) || (a.length >= 3 && w.startsWith(a)));
  });
}

export function findNodes(text: string, nodes: OrbitNode[]): OrbitNode[] {
  return nodes.filter((n) => matchTrigger(text, [...n.triggers, n.label]));
}

/* ── Detecção de divergência ──────────────────────────────────
   Toda palavra registrada em duas órbitas é ambiguidade. O
   sistema encontra sozinho e devolve a lista para o usuário
   decidir: perguntar ou chutar.
   ──────────────────────────────────────────────────────────── */

export function detectConflicts(map: PulsoMap): Conflict[] {
  const index = new Map<string, Set<string>>();

  for (const n of map.nodes) {
    for (const raw of [...n.triggers, n.label]) {
      const t = strip(raw);
      if (t.length < 3) continue;
      if (!index.has(t)) index.set(t, new Set());
      index.get(t)!.add(n.id);
    }
  }

  const out: Conflict[] = [];
  index.forEach((ids, term) => {
    if (ids.size < 2) return;
    const already = map.conflicts.find((c) => c.term === term);
    out.push({ term, nodeIds: [...ids], policy: already?.policy || "ask" });
  });

  // Bolhas diferentes disputando a mesma palavra pesam mais.
  return out.sort((a, b) => b.nodeIds.length - a.nodeIds.length);
}

/** Onde uma palavra já aparece hoje. Usado no aviso de criação. */
export function whereUsed(term: string, map: PulsoMap): OrbitNode[] {
  const t = strip(term);
  if (t.length < 2) return [];
  return map.nodes.filter((n) =>
    [...n.triggers, n.label].some((x) => strip(x) === t)
  );
}

/* ── Histórico: desfazer e refazer ────────────────────────────── */

export class History {
  private past: PulsoMap[] = [];
  private future: PulsoMap[] = [];
  private limit = 40;

  push(snapshot: PulsoMap) {
    this.past.push(JSON.parse(JSON.stringify(snapshot)));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(currentState: PulsoMap): PulsoMap | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(JSON.parse(JSON.stringify(currentState)));
    return prev;
  }
  redo(currentState: PulsoMap): PulsoMap | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(JSON.parse(JSON.stringify(currentState)));
    return next;
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}

/* ── Runtime: a bolha viva ────────────────────────────────────── */

export interface LiveOrbit {
  nodeId: string;
  bubbleId?: string;
  life: number;
  since: number;
  step: number;
  repeats: Record<string, number>;
  /** Última ação executada. Permite entender "fecha" sem repetir o alvo. */
  lastAction?: string;
}

export interface RuntimeHooks {
  say: (text: string) => void;
  run?: (action: string) => void;
  onChange?: (live: LiveOrbit | null, node: OrbitNode | null) => void;
}

export class PulsoRuntime {
  private map: PulsoMap;
  private live: LiveOrbit | null = null;
  private hooks: RuntimeHooks;

  constructor(map: PulsoMap, hooks: RuntimeHooks) {
    this.map = map;
    this.hooks = hooks;
  }

  setMap(map: PulsoMap) { this.map = map; }
  current(): LiveOrbit | null { return this.live; }
  node(): OrbitNode | null {
    return this.live ? this.map.nodes.find((n) => n.id === this.live!.nodeId) || null : null;
  }
  bubble(): Bubble | null {
    const id = this.live?.bubbleId;
    return id ? this.map.bubbles.find((b) => b.id === id) || null : null;
  }

  enter(nodeId: string) {
    const n = this.map.nodes.find((x) => x.id === nodeId);
    if (!n) return;
    this.live = {
      nodeId, bubbleId: n.bubbleId, life: n.ttl,
      since: Date.now(), step: 0, repeats: {},
    };
    this.hooks.onChange?.(this.live, n);
  }

  burst() {
    this.live = null;
    this.hooks.onChange?.(null, null);
  }

  handle(text: string): boolean {
    // Sem bolha viva: procura quem reconhece.
    if (!this.live) {
      const hits = findNodes(text, this.map.nodes);
      if (!hits.length) return false;
      if (hits.length > 1) return this.resolveAmbiguity(text, hits);
      this.enter(hits[0].id);
      return this.react(hits[0], text);
    }

    const n = this.node();
    if (!n) { this.burst(); return false; }

    if (matchTrigger(text, [...n.triggers, n.label])) {
      this.live.life = n.ttl;
      return this.react(n, text);
    }

    // Dentro da bolha, a busca é local antes de global.
    const inBubble = this.live.bubbleId
      ? this.map.nodes.filter((x) => x.bubbleId === this.live!.bubbleId)
      : [];
    const local = findNodes(text, inBubble);
    if (local.length === 1) { this.enter(local[0].id); return this.react(local[0], text); }
    if (local.length > 1) return this.resolveAmbiguity(text, local);

    // Depois, os vizinhos ligados no grafo.
    const near = this.map.edges
      .filter((e) => e.from === n.id)
      .map((e) => this.map.nodes.find((x) => x.id === e.to))
      .filter(Boolean) as OrbitNode[];
    const jump = findNodes(text, near)[0] || findNodes(text, this.map.nodes)[0];
    if (jump) { this.enter(jump.id); return this.react(jump, text); }

    // A bolha mantém o assunto vivo mesmo sem menção direta.
    const b = this.bubble();
    if (b && matchTrigger(text, b.keeps)) { this.live.life = n.ttl; return false; }

    this.live.life -= 1;
    if (this.live.life <= 0) this.burst();
    else this.hooks.onChange?.(this.live, n);
    return false;
  }

  /** Duas órbitas para a mesma palavra: pergunta ou chuta. */
  private resolveAmbiguity(text: string, hits: OrbitNode[]): boolean {
    const term = strip(text).split(/\s+/).find((w) =>
      hits.every((h) => matchTrigger(w, [...h.triggers, h.label]))
    ) || strip(text);

    const rule = this.map.conflicts.find((c) => c.term === term);

    if (rule?.policy === "guess") {
      // Menor ordem vence: quem foi definido primeiro tem prioridade.
      const winner = [...hits].sort((a, b) => a.order - b.order)[0];
      this.enter(winner.id);
      return this.react(winner, text);
    }

    const nomes = hits.map((h) => h.label).join(" ou ");
    this.hooks.say(`Peraí, tem ${hits.length} coisas com esse nome aqui: ${nomes}. Qual delas?`);
    return true;
  }

  private react(node: OrbitNode, text: string): boolean {
    if (!node.reactions.length) return false;

    const key = strip(text).slice(0, 40);
    const times = (this.live!.repeats[key] || 0) + 1;
    this.live!.repeats[key] = times;

    if (times > 3) {
      this.hooks.say("Isso eu já mostrei. Se quiser, clica direto que é mais rápido.");
      return true;
    }

    const ordered = [...node.reactions].sort((a, b) => a.step - b.step);
    const r = node.explains
      ? ordered[Math.min(this.live!.step, ordered.length - 1)]
      : ordered[Math.floor(Math.random() * ordered.length)];

    if (node.explains) this.live!.step += 1;

    const msg = r.messages.filter(Boolean);
    if (msg.length) this.hooks.say(msg[Math.floor(Math.random() * msg.length)]);
    r.actions.slice(0, 2).forEach((a) => {
      this.live!.lastAction = a;
      this.hooks.run?.(a);
    });
    return true;
  }
}

/* ── Exportação e importação ──────────────────────────────────── */

export function exportMap(map: PulsoMap): string {
  return JSON.stringify(map, null, 2);
}

export function importMap(text: string): PulsoMap {
  const raw = JSON.parse(text);
  if (!raw?.nodes || !Array.isArray(raw.nodes)) throw new Error("JSON sem o array de nós.");
  return {
    version: 3,
    nodes: raw.nodes.map((n: Partial<OrbitNode>) => makeNode(n)),
    edges: Array.isArray(raw.edges) ? raw.edges : [],
    bubbles: Array.isArray(raw.bubbles) ? raw.bubbles : [],
    conflicts: Array.isArray(raw.conflicts) ? raw.conflicts : [],
    updatedAt: Date.now(),
  };
}

/* ══════════════════════════════════════════════════════════════
   AGRUPAMENTO AUTOMÁTICO
   Tudo que está ligado pertence à mesma bolha. A bolha não é
   desenhada à mão: ela é a consequência das ligações.
   ══════════════════════════════════════════════════════════════ */

/** Percorre as ligações e devolve os grupos conectados. */
export function connectedGroups(map: PulsoMap): string[][] {
  const vizinhos = new Map<string, Set<string>>();
  map.nodes.forEach((n) => vizinhos.set(n.id, new Set()));
  map.edges.forEach((e) => {
    vizinhos.get(e.from)?.add(e.to);
    vizinhos.get(e.to)?.add(e.from);
  });

  const visto = new Set<string>();
  const grupos: string[][] = [];

  map.nodes.forEach((n) => {
    if (visto.has(n.id)) return;
    const grupo: string[] = [];
    const fila = [n.id];
    while (fila.length) {
      const atual = fila.pop()!;
      if (visto.has(atual)) continue;
      visto.add(atual);
      grupo.push(atual);
      vizinhos.get(atual)?.forEach((v) => { if (!visto.has(v)) fila.push(v); });
    }
    grupos.push(grupo);
  });

  return grupos;
}

/**
 * Sincroniza as bolhas com as ligações reais.
 * Ligou dois nós, viram uma bolha. Cortou a linha, se separam.
 */
export function syncBubbles(map: PulsoMap): PulsoMap {
  const grupos = connectedGroups(map);
  const bolhas: Bubble[] = [];
  const nodes = [...map.nodes];

  grupos.forEach((grupo, i) => {
    // Nó sozinho não vira bolha nomeada: fica com o halo dele.
    if (grupo.length < 2) {
      grupo.forEach((id) => {
        const idx = nodes.findIndex((n) => n.id === id);
        if (idx >= 0) nodes[idx] = { ...nodes[idx], bubbleId: undefined };
      });
      return;
    }

    // Reaproveita a bolha existente do grupo, se houver.
    const antiga = map.bubbles.find((b) => grupo.some((id) =>
      map.nodes.find((n) => n.id === id)?.bubbleId === b.id
    ));

    const principal = nodes.find((n) => n.id === grupo[0]);
    const bolha: Bubble = antiga || makeBubble({
      name: principal ? `Bolha de ${principal.label}` : `Bolha ${i + 1}`,
      color: principal ? KIND_META[principal.kind].color : "#2563eb",
    });

    grupo.forEach((id) => {
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx >= 0) nodes[idx] = { ...nodes[idx], bubbleId: bolha.id };
    });

    bolhas.push(bolha);
  });

  return { ...map, nodes, bubbles: bolhas };
}

/** Retrato de uma bolha, para o painel de informação. */
export interface BubbleInfo {
  bubble: Bubble;
  nodes: OrbitNode[];
  edges: number;
  triggers: number;
  reactions: number;
  actions: string[];
  ttlMedio: number;
  kinds: Record<string, number>;
}

export function bubbleInfo(map: PulsoMap, bubbleId: string): BubbleInfo | null {
  const bubble = map.bubbles.find((b) => b.id === bubbleId);
  if (!bubble) return null;

  const nodes = map.nodes.filter((n) => n.bubbleId === bubbleId);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = map.edges.filter((e) => ids.has(e.from) && ids.has(e.to)).length;

  const kinds: Record<string, number> = {};
  const actions = new Set<string>();
  let triggers = 0, reactions = 0, ttl = 0;

  nodes.forEach((n) => {
    kinds[n.kind] = (kinds[n.kind] || 0) + 1;
    triggers += n.triggers.length;
    reactions += n.reactions.length;
    ttl += n.ttl;
    n.reactions.forEach((r) => r.actions.forEach((a) => actions.add(a)));
  });

  return {
    bubble, nodes, edges, triggers, reactions,
    actions: [...actions],
    ttlMedio: nodes.length ? Math.round(ttl / nodes.length) : 0,
    kinds,
  };
}

export function mapStats(map: PulsoMap) {
  const byKind = {} as Record<OrbitKind, number>;
  (Object.keys(KIND_META) as OrbitKind[]).forEach((k) => { byKind[k] = 0; });
  map.nodes.forEach((n) => { byKind[n.kind] = (byKind[n.kind] || 0) + 1; });
  return {
    nodes: map.nodes.length,
    edges: map.edges.length,
    bubbles: map.bubbles.length,
    sealed: map.bubbles.filter((b) => b.sealed).length,
    triggers: map.nodes.reduce((n, x) => n + x.triggers.length, 0),
    reactions: map.nodes.reduce((n, x) => n + x.reactions.length, 0),
    conflicts: map.conflicts.length,
    byKind,
  };
}
