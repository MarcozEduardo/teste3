/* ══════════════════════════════════════════════════════════════
   REGISTRO DO SENTINELA
   ──────────────────────────────────────────────────────────────
   Diário de bordo do perímetro. Toda decisão do firewall vira
   entrada aqui: o que passou, o que foi retido e por quê.

   Consumido por: components/SentinelaPanel.tsx
   Alimentado por: lib/store.tsx (pipeline send) e lib/quarantine.ts
   ══════════════════════════════════════════════════════════════ */

export type LogKind =
  | "pass"        // mensagem liberada
  | "block"       // mensagem barrada
  | "hold"        // código retido em quarentena
  | "release"     // usuário liberou o código
  | "deny"        // usuário negou definitivamente
  | "vision"      // imagem enviada ao provedor de visão
  | "web"         // leitura de página externa
  | "config";     // mudança na configuração do próprio Sentinela

export interface LogEntry {
  id: string;
  ts: number;
  kind: LogKind;
  reason: string;
  detail: string;
  /** Amostra curta do conteúdo, sem guardar a mensagem inteira. */
  sample?: string;
  severity: "info" | "aviso" | "grave";
}

const KEY = "bobby_sentinela_log";
const MAX = 400;

let cache: LogEntry[] | null = null;
const listeners = new Set<() => void>();

function read(): LogEntry[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = Array.isArray(raw) ? raw : [];
  } catch { cache = []; }
  return cache!;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify((cache || []).slice(-MAX))); }
  catch { /* cota cheia: o log é descartável por definição */ }
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function log(
  kind: LogKind,
  reason: string,
  detail: string,
  opts: { sample?: string; severity?: LogEntry["severity"] } = {}
): void {
  const entry: LogEntry = {
    id: Math.random().toString(36).slice(2, 10),
    ts: Date.now(),
    kind, reason, detail,
    sample: opts.sample?.slice(0, 120),
    severity: opts.severity || (kind === "block" || kind === "deny" ? "grave" : kind === "hold" ? "aviso" : "info"),
  };
  cache = [...read(), entry].slice(-MAX);
  persist();
}

export function entries(): LogEntry[] { return [...read()].reverse(); }

export function clearLog(): void { cache = []; persist(); }

export function exportLog(): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), entries: read() }, null, 2);
}

export interface LogStats {
  total: number; pass: number; block: number; hold: number;
  release: number; deny: number; vision: number; web: number;
  byReason: Record<string, number>;
  last24h: number;
}

export function stats(): LogStats {
  const all = read();
  const dayAgo = Date.now() - 86_400_000;
  const byReason: Record<string, number> = {};
  for (const e of all) {
    if (e.kind === "block" || e.kind === "hold") byReason[e.reason] = (byReason[e.reason] || 0) + 1;
  }
  const count = (k: LogKind) => all.filter((e) => e.kind === k).length;
  return {
    total: all.length,
    pass: count("pass"), block: count("block"), hold: count("hold"),
    release: count("release"), deny: count("deny"),
    vision: count("vision"), web: count("web"),
    byReason,
    last24h: all.filter((e) => e.ts > dayAgo).length,
  };
}

/* ── Configuração do firewall, editável pelo painel ───────────── */

export interface SentinelaConfig {
  /** Interruptores por classe de ameaça. */
  rules: Record<string, boolean>;
  /** Sensibilidade do detector de ruído: 0 a 100. */
  noiseThreshold: number;
  /** Repetições da mesma mensagem antes de barrar. */
  floodLimit: number;
  /** Toda entrada gera registro. */
  logEverything: boolean;
  /** Retém código mesmo sem assinatura de risco. */
  holdAllCode: boolean;
  /** Termos extras banidos, um por linha. */
  customBlocked: string[];
  /** Termos que nunca são barrados. */
  allowlist: string[];
}

export const DEFAULT_CONFIG: SentinelaConfig = {
  rules: {
    impróprio: true, injection: true, ruído: true,
    arrogância: true, flood: true, código: true,
  },
  noiseThreshold: 18,
  floodLimit: 2,
  logEverything: true,
  holdAllCode: true,
  customBlocked: [],
  allowlist: [],
};

const CFG_KEY = "bobby_sentinela_cfg";

export function loadConfig(): SentinelaConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(CFG_KEY) || "null");
    if (raw && typeof raw === "object") {
      return { ...DEFAULT_CONFIG, ...raw, rules: { ...DEFAULT_CONFIG.rules, ...(raw.rules || {}) } };
    }
  } catch { /* corrompido */ }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(cfg: SentinelaConfig): boolean {
  try {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    log("config", "ajuste", "Configuração do perímetro atualizada.", { severity: "info" });
    return true;
  } catch { return false; }
}
