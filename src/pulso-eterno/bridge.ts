/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · PONTE PARA ALVO EXTERNO
   ──────────────────────────────────────────────────────────────
   O Studio roda num servidor, o projeto alvo roda em outro. Ou
   o alvo é um HTML solto no disco, sem servidor nenhum.

   Três modos de conexão, do mais capaz ao mais limitado:

   MESMA ORIGEM   iframe com acesso total ao documento
   AGENTE         postMessage com o script agent.js no alvo
   LEITURA        arquivo aberto do disco, análise estática

   Nenhum deles finge poder o que não tem. Quando a origem é
   diferente e o agente não responde, o Studio diz isso.
   ══════════════════════════════════════════════════════════════ */

export type BridgeMode = "local" | "same-origin" | "agent" | "static" | "offline";

export interface Target {
  mode: BridgeMode;
  url: string;
  label: string;
  /** Documento acessível, quando houver. */
  doc?: Document;
  /** Janela do alvo, para postMessage. */
  win?: Window;
  /** Conteúdo bruto, no modo leitura. */
  source?: string;
  error?: string;
}

const KEY = "pulso_targets";

export interface SavedTarget { url: string; label: string; at: number }

export function recentTargets(): SavedTarget[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function remember(url: string, label: string) {
  const list = recentTargets().filter((t) => t.url !== url);
  list.unshift({ url, label, at: Date.now() });
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8))); } catch { /* cota */ }
}

/** Sugestões comuns de endereço, para não digitar tudo. */
export const SUGGESTIONS = [
  { url: "http://localhost:5173", label: "Vite" },
  { url: "http://localhost:3000", label: "Next ou CRA" },
  { url: "http://localhost:8080", label: "Servidor genérico" },
  { url: "http://127.0.0.1:5500", label: "Live Server" },
  { url: "http://localhost:4200", label: "Angular" },
  { url: "http://localhost:1313", label: "Hugo" },
];

/**
 * Descobre o que dá para fazer com este alvo.
 * Não assume: testa o acesso de verdade e devolve o veredito.
 */
export function probe(frame: HTMLIFrameElement, url: string): Target {
  const label = url.replace(/^https?:\/\//, "").slice(0, 40);

  try {
    const doc = frame.contentDocument;
    if (doc && doc.body) {
      return { mode: "same-origin", url, label, doc, win: frame.contentWindow || undefined };
    }
  } catch {
    // Bloqueado pela política de origem: o agente é o caminho.
  }

  return {
    mode: "agent", url, label, win: frame.contentWindow || undefined,
    error: "Origem diferente. Instale o agente no projeto alvo para inspecionar.",
  };
}

/* ── Protocolo do agente ──────────────────────────────────────── */

export type AgentMessage =
  | { type: "pulso:ping" }
  | { type: "pulso:scan" }
  | { type: "pulso:inspect"; on: boolean }
  | { type: "pulso:apply"; selector: string; css: string }
  | { type: "pulso:inject"; html: string; css: string; js: string; selector: string; position: string }
  | { type: "pulso:dossier"; selector: string };

export type AgentReply =
  | { type: "pulso:pong"; href: string; title: string; elements: number }
  | { type: "pulso:found"; items: { label: string; selector: string; tag: string }[] }
  | { type: "pulso:picked"; selector: string; label: string; tag: string; classes: string[] }
  | { type: "pulso:dossier"; markup: string; css: string; selector: string }
  | { type: "pulso:ok"; action: string; detail?: string }
  | { type: "pulso:error"; message: string };

export function send(target: Target, msg: AgentMessage): boolean {
  if (!target.win) return false;
  try { target.win.postMessage(msg, "*"); return true; }
  catch { return false; }
}

export function listen(handler: (reply: AgentReply) => void): () => void {
  const fn = (e: MessageEvent) => {
    const d = e.data;
    if (d && typeof d === "object" && typeof d.type === "string" && d.type.startsWith("pulso:")) {
      handler(d as AgentReply);
    }
  };
  window.addEventListener("message", fn);
  return () => window.removeEventListener("message", fn);
}

/* ── Análise estática, para HTML solto ────────────────────────── */

export interface StaticElement {
  label: string;
  tag: string;
  classes: string[];
  line: number;
  snippet: string;
}

/**
 * Lê o HTML como texto e encontra os elementos interativos.
 * Sem DOM, sem execução: só leitura.
 */
export function analyseStatic(source: string): StaticElement[] {
  const out: StaticElement[] = [];
  const lines = source.split("\n");
  const TAG = /<(button|a|input|select|textarea|summary|label)\b([^>]*)>/gi;

  lines.forEach((line, i) => {
    let m: RegExpExecArray | null;
    TAG.lastIndex = 0;
    while ((m = TAG.exec(line))) {
      const [full, tag, attrs] = m;
      const cls = attrs.match(/class=["']([^"']+)/)?.[1] || "";
      const id = attrs.match(/id=["']([^"']+)/)?.[1] || "";
      const aria = attrs.match(/aria-label=["']([^"']+)/)?.[1] || "";
      const title = attrs.match(/title=["']([^"']+)/)?.[1] || "";
      const after = line.slice(m.index + full.length);
      const inner = after.match(/^([^<]{1,40})/)?.[1]?.trim() || "";

      const label = (aria || title || inner || id || cls.split(" ")[0] || tag).slice(0, 44);
      if (!label) continue;

      out.push({
        label, tag: tag.toLowerCase(),
        classes: cls.split(/\s+/).filter(Boolean),
        line: i + 1,
        snippet: line.trim().slice(0, 160),
      });
    }
  });

  return out;
}

/** Conta o que existe no arquivo, para o cabeçalho. */
export function staticSummary(source: string) {
  const count = (re: RegExp) => (source.match(re) || []).length;
  return {
    linhas: source.split("\n").length,
    tags: count(/<[a-z][^>]*>/gi),
    estilos: count(/<style|\.css/gi),
    scripts: count(/<script/gi),
    interativos: analyseStatic(source).length,
  };
}
