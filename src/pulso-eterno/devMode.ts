/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · MODO DESENVOLVEDOR
   ──────────────────────────────────────────────────────────────
   Inspeção com trava múltipla. Diferente da mira: aqui o alvo
   fica preso, numerado, e o clique direito abre o dossiê.

   O que copiamos é a verdade do que está na tela: markup vivo,
   CSS computado, cadeia de classes e o arquivo provável. Não
   inventamos caminho de código-fonte que não podemos ler.

   Toda alteração aplicada entra no diário e pode ser revertida.
   ══════════════════════════════════════════════════════════════ */

export interface Locked {
  id: number;
  selector: string;
  label: string;
  tag: string;
  classes: string[];
  rect: { x: number; y: number; w: number; h: number };
}

export interface Dossier {
  markup: string;
  css: string;
  classes: string;
  origin: string;
  prompt: string;
  full: string;
}

/* ── Identificação ────────────────────────────────────────────── */

export function selectorFor(el: Element): string {
  if (el.id) return `#${el.id}`;
  const path: string[] = [];
  let node: Element | null = el;
  let depth = 0;

  while (node && depth < 4 && node !== document.body) {
    const cls = Array.from(node.classList)
      .filter((c) => !/^(css|sc|pe)-[a-z0-9]{4,}$/i.test(c))
      .slice(0, 2);
    let part = node.tagName.toLowerCase() + (cls.length ? "." + cls.join(".") : "");
    const parent: Element | null = node.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter((c) => {
        try { return c.matches(part); } catch { return false; }
      });
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    }
    path.unshift(part);
    if (node.id) { path[0] = `#${node.id}`; break; }
    node = parent;
    depth++;
  }
  return path.join(" > ");
}

export function labelFor(el: Element): string {
  const tip = el.getAttribute("data-tip") || el.getAttribute("aria-label") || el.getAttribute("title");
  const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
  return (tip || txt || el.className.toString().split(" ")[0] || el.tagName.toLowerCase()).slice(0, 48);
}

/** Propriedades que interessam num dossiê. O resto é ruído. */
const RELEVANT = [
  "display", "position", "top", "right", "bottom", "left", "z-index",
  "width", "height", "min-width", "max-width", "padding", "margin",
  "flex", "flex-direction", "align-items", "justify-content", "gap",
  "grid-template-columns", "font-family", "font-size", "font-weight",
  "line-height", "letter-spacing", "text-align", "color", "background",
  "background-color", "border", "border-radius", "box-shadow", "opacity",
  "transform", "transition", "cursor", "overflow",
];

const DEFAULTS = new Set([
  "auto", "none", "normal", "0px", "0", "static", "visible", "rgba(0, 0, 0, 0)",
  "0px none rgb(0, 0, 0)", "none 0s ease 0s",
]);

function computedCss(el: Element): string {
  const cs = getComputedStyle(el);
  const out: string[] = [];
  for (const prop of RELEVANT) {
    const v = cs.getPropertyValue(prop).trim();
    if (!v || DEFAULTS.has(v)) continue;
    out.push(`  ${prop}: ${v};`);
  }
  return out.join("\n");
}

/** Regras de folha de estilo que citam as classes do elemento. */
function authoredRules(el: Element): string {
  const classes = Array.from(el.classList);
  if (!classes.length) return "";
  const found: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; } // folha de outro domínio
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      if (classes.some((c) => rule.selectorText.includes("." + c))) {
        found.push(rule.cssText);
        if (found.length >= 14) break;
      }
    }
    if (found.length >= 14) break;
  }
  return found.join("\n\n");
}

/** Onde esse elemento provavelmente foi escrito. */
function guessOrigin(el: Element): string {
  const classes = Array.from(el.classList);
  const prefixos: Record<string, string> = {
    "pe-": "src/pulso-eterno/PulsoStudio.tsx",
    "stl-": "src/components/SentinelaPanel.tsx",
    "gw-": "src/components/GalleryWindow.tsx",
    "dv-": "src/components/DocViewer.tsx",
    "ctx-": "src/components/ContextTag.tsx",
    "chat-": "src/components/Chat.tsx",
    "msg-": "src/components/Chat.tsx",
    "doc-": "src/components/Chat.tsx",
    "rag-": "src/components/Modals.tsx",
    "panel-": "src/components/Panels.tsx",
    "think-": "src/components/Thinking.tsx",
    "qt-": "src/components/Quarantine.tsx",
    "laudo-": "src/components/Quarantine.tsx",
  };
  for (const c of classes) {
    for (const [p, arquivo] of Object.entries(prefixos)) {
      if (c.startsWith(p)) return arquivo;
    }
  }
  const nearId = el.closest("[id]")?.id;
  return nearId ? `elemento dentro de #${nearId}` : "arquivo não identificado pelo prefixo";
}

/** Detecta o que está em uso na página. */
function stack(): string {
  const found: string[] = [];
  if (document.querySelector("[data-reactroot],#root")) found.push("React");
  if (document.querySelector("canvas")) found.push("Canvas");
  const cls = document.body.className + " " + (document.querySelector("#root")?.className || "");
  if (/\b(flex|grid|p-\d|text-\w+|bg-\w+)\b/.test(cls)) found.push("Tailwind (indício)");
  if (Array.from(document.styleSheets).some((s) => { try { return !!s.cssRules.length; } catch { return false; } }))
    found.push("CSS próprio");
  return found.join(" · ") || "não identificado";
}

/* ── Montagem do dossiê ───────────────────────────────────────── */

export function buildDossier(locked: Locked[]): Dossier {
  const blocos: string[] = [];
  let markupAll = "", cssAll = "", classesAll = "", originAll = "";

  locked.forEach((l, i) => {
    const el = document.querySelector(l.selector);
    if (!el) return;

    const markup = el.outerHTML.length > 3000
      ? el.outerHTML.slice(0, 3000) + "\n<!-- markup truncado -->"
      : el.outerHTML;
    const computed = computedCss(el);
    const autoral = authoredRules(el);
    const origem = guessOrigin(el);

    markupAll += markup + "\n\n";
    cssAll += autoral + "\n\n";
    classesAll += l.classes.join(" ") + "\n";
    originAll += origem + "\n";

    blocos.push(
`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALVO ${i + 1} · ${l.label}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELETOR
${l.selector}

ARQUIVO PROVÁVEL
${origem}

CLASSES
${l.classes.join(" ") || "sem classe"}

MARKUP RENDERIZADO
\`\`\`html
${markup}
\`\`\`

REGRAS DE ESTILO AUTORAIS
\`\`\`css
${autoral || "/* nenhuma regra autoral encontrada para estas classes */"}
\`\`\`

ESTILO COMPUTADO NO MOMENTO DA CÓPIA
\`\`\`css
${l.selector} {
${computed}
}
\`\`\`
`);
  });

  const prompt =
`INSTRUÇÕES PARA A IA QUE VAI EDITAR

Você recebeu ${locked.length} elemento(s) extraído(s) de uma interface em produção.

REGRAS INEGOCIÁVEIS
1. Mantenha exatamente a mesma estrutura de resposta deste documento.
2. Não altere nomes de classe, ids ou seletores.
3. Não adicione bibliotecas, dependências ou funções novas.
4. Não invente comportamento que não foi pedido.
5. Devolva apenas o CSS modificado, no mesmo formato de bloco.
6. Se precisar mudar markup, avise antes e explique o motivo.
7. Preserve a ordem e a hierarquia dos elementos.

CONTEXTO TÉCNICO
Stack detectada: ${stack()}
Capturado em: ${new Date().toLocaleString("pt-BR")}
Viewport: ${window.innerWidth} × ${window.innerHeight}

O QUE EU QUERO
[descreva aqui a mudança desejada]
`;

  const full = prompt + "\n\n" + blocos.join("\n");

  return {
    markup: markupAll.trim(),
    css: cssAll.trim(),
    classes: classesAll.trim(),
    origin: originAll.trim(),
    prompt,
    full,
  };
}

/* ── Diário de alterações ─────────────────────────────────────── */

export interface DevEdit {
  id: string;
  selector: string;
  label: string;
  css: string;
  previous: string;
  at: number;
}

const KEY = "pulso_dev_edits";

function read(): DevEdit[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: DevEdit[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-80))); } catch { /* cota */ }
}

export function edits(): DevEdit[] { return read().reverse(); }

/**
 * Aplica CSS ao elemento. Só declarações: nada de seletor, nada
 * de execução. Guarda o estilo anterior para poder reverter.
 */
export function applyCss(selector: string, label: string, css: string): { ok: boolean; msg: string } {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return { ok: false, msg: "Elemento não está mais na tela." };

  // Aceita bloco com chaves ou lista solta de declarações.
  const body = css.includes("{") ? css.slice(css.indexOf("{") + 1, css.lastIndexOf("}")) : css;

  // Barra qualquer coisa que não seja declaração simples.
  if (/@import|javascript:|expression\(|<script/i.test(body))
    return { ok: false, msg: "Recusado: o trecho contém instrução não permitida." };

  const previous = el.getAttribute("style") || "";
  let count = 0;

  body.split(";").forEach((decl) => {
    const [rawProp, ...rest] = decl.split(":");
    const prop = rawProp?.trim();
    const value = rest.join(":").trim();
    if (!prop || !value) return;
    if (!/^[a-z-]+$/.test(prop)) return;
    el.style.setProperty(prop, value.replace(/!important/gi, "").trim(), "important");
    count++;
  });

  if (!count) return { ok: false, msg: "Nenhuma declaração válida encontrada." };

  const list = read();
  list.push({
    id: Math.random().toString(36).slice(2, 9),
    selector, label, css: body.trim(), previous, at: Date.now(),
  });
  write(list);

  return { ok: true, msg: `${count} propriedade(s) aplicada(s).` };
}

export function revert(id: string): boolean {
  const list = read();
  const item = list.find((e) => e.id === id);
  if (!item) return false;
  const el = document.querySelector<HTMLElement>(item.selector);
  if (el) {
    if (item.previous) el.setAttribute("style", item.previous);
    else el.removeAttribute("style");
  }
  write(list.filter((e) => e.id !== id));
  return true;
}

export function revertAll(): number {
  const list = read();
  [...list].reverse().forEach((item) => {
    const el = document.querySelector<HTMLElement>(item.selector);
    if (!el) return;
    if (item.previous) el.setAttribute("style", item.previous);
    else el.removeAttribute("style");
  });
  write([]);
  return list.length;
}

/* ── Inspetor com trava múltipla ──────────────────────────────── */

export interface InspectorHandle { stop: () => void }

export function startInspector(
  onLock: (list: Locked[]) => void,
  onMenu: (x: number, y: number, target: Locked) => void,
  initial: Locked[] = []
): InspectorHandle {
  const locked: Locked[] = [...initial];
  let counter = locked.length;

  const hover = document.createElement("div");
  hover.className = "pe-inspect-hover";
  document.body.appendChild(hover);
  document.body.classList.add("pe-inspecting");

  const badges: HTMLElement[] = [];

  const paint = () => {
    badges.forEach((b) => b.remove());
    badges.length = 0;
    locked.forEach((l) => {
      const el = document.querySelector(l.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const box = document.createElement("div");
      box.className = "pe-inspect-lock";
      box.style.cssText = `left:${r.left - 2}px;top:${r.top - 2}px;width:${r.width + 4}px;height:${r.height + 4}px`;
      box.innerHTML = `<span>${l.id}</span>`;
      document.body.appendChild(box);
      badges.push(box);
    });
    onLock([...locked]);
  };

  const capture = (el: Element): Locked => {
    const r = el.getBoundingClientRect();
    return {
      id: ++counter,
      selector: selectorFor(el),
      label: labelFor(el),
      tag: el.tagName.toLowerCase(),
      classes: Array.from(el.classList),
      rect: { x: r.left, y: r.top, w: r.width, h: r.height },
    };
  };

  const move = (e: MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.closest(".pe-studio,.pe-inspect-lock,.pe-devmenu")) { hover.style.opacity = "0"; return; }
    const r = el.getBoundingClientRect();
    hover.style.cssText =
      `left:${r.left - 2}px;top:${r.top - 2}px;width:${r.width + 4}px;height:${r.height + 4}px;opacity:1`;
    hover.dataset.info = `${el.tagName.toLowerCase()} · ${Math.round(r.width)}×${Math.round(r.height)}`;
  };

  const click = (e: MouseEvent) => {
    if ((e.target as Element).closest(".pe-devmenu")) return;
    e.preventDefault(); e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.closest(".pe-studio")) return;

    const sel = selectorFor(el);
    const idx = locked.findIndex((l) => l.selector === sel);
    if (idx >= 0) locked.splice(idx, 1);   // clicar de novo destrava
    else locked.push(capture(el));
    paint();
  };

  const context = (e: MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const sel = selectorFor(el);
    const hit = locked.find((l) => l.selector === sel) || locked[locked.length - 1];
    if (!hit) return;
    onMenu(e.clientX, e.clientY, hit);
  };

  const scroll = () => paint();

  const stop = () => {
    hover.remove();
    badges.forEach((b) => b.remove());
    document.body.classList.remove("pe-inspecting");
    window.removeEventListener("mousemove", move, true);
    window.removeEventListener("click", click, true);
    window.removeEventListener("contextmenu", context, true);
    window.removeEventListener("scroll", scroll, true);
  };

  window.addEventListener("mousemove", move, true);
  window.addEventListener("click", click, true);
  window.addEventListener("contextmenu", context, true);
  window.addEventListener("scroll", scroll, true);
  paint();

  return { stop };
}
