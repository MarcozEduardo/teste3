/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · SCANNER
   ──────────────────────────────────────────────────────────────
   Descobre o que é clicável. Duas frentes:

   1. DOM vivo — varre a tela e devolve tudo que responde a clique
   2. Código  — parser leve de TSX/JSX para listar handlers

   Para varredura profunda no código-fonte, use o script Python
   em `tools/scan_actions.py`. Ele lê o projeto inteiro e cospe
   um JSON pronto para importar aqui.
   ══════════════════════════════════════════════════════════════ */

import type { OrbitKind } from "./core";

export interface Found {
  label: string;
  selector: string;
  kind: OrbitKind;
  /** Onde foi encontrado: seletor no DOM ou linha no arquivo. */
  origin: string;
  /** Palavras derivadas automaticamente, prontas para virar gatilho. */
  suggested: string[];
}

const CLICKABLE = [
  "button", "[role=button]", "a[href]", "input[type=checkbox]",
  "input[type=radio]", "select", "summary", "[onclick]", "[data-tip]",
];

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Nome legível de um elemento, na ordem do que é mais descritivo. */
function labelOf(el: Element): string {
  const tip = el.getAttribute("data-tip");
  const aria = el.getAttribute("aria-label");
  const title = el.getAttribute("title");
  const text = clean(el.textContent || "");
  return clean(tip || aria || title || text || el.className.toString().split(" ")[0] || el.tagName.toLowerCase()).slice(0, 60);
}

/** Seletor curto e estável o suficiente para reencontrar o elemento. */
export function selectorOf(el: Element): string {
  if (el.id) return `#${el.id}`;
  const cls = Array.from(el.classList).filter((c) => !/^(css|sc)-/.test(c)).slice(0, 2);
  const base = el.tagName.toLowerCase() + (cls.length ? "." + cls.join(".") : "");
  const parent = el.parentElement;
  if (!parent) return base;
  const same = Array.from(parent.children).filter((c) => c.matches(base));
  return same.length > 1 ? `${base}:nth-of-type(${same.indexOf(el) + 1})` : base;
}

/** Deriva gatilhos a partir do rótulo, sem palavra vazia. */
export function suggestTriggers(label: string): string[] {
  const stop = new Set(["de", "da", "do", "em", "no", "na", "para", "com", "o", "a", "e", "um", "uma", "que"]);
  const words = label.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
  return [...new Set(words)].slice(0, 6);
}

function kindFor(label: string): OrbitKind {
  const s = label.toLowerCase();
  if (/(abrir|abre|fechar|painel|janela|galeria|modal|expandir)/.test(s)) return "janela";
  // Pessoa cabe em Texto: os dois são assunto citado, não ação.
  if (/(marcos|bobby|autor|perfil|quem)/.test(s)) return "texto";
  if (/(projeto|case|documento|arquivo|pdf|protótipo)/.test(s)) return "produto";
  return "acao";
}

/** Varre a tela atual. Ignora o que está escondido. */
export function scanDom(root: ParentNode = document): Found[] {
  const seen = new Set<string>();
  const out: Found[] = [];

  root.querySelectorAll(CLICKABLE.join(",")).forEach((el) => {
    // Fora da árvore visível ou dentro do próprio Studio: ignora.
    if (el.closest(".pe-studio")) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;

    const label = labelOf(el);
    if (!label || label.length < 2) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    out.push({
      label,
      selector: selectorOf(el),
      kind: kindFor(label),
      origin: "tela",
      suggested: suggestTriggers(label),
    });
  });

  return out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

/**
 * Parser leve de TSX/JSX. Procura handlers e extrai o rótulo
 * mais próximo. Não substitui um AST, mas resolve o caso comum
 * sem trazer dependência nenhuma.
 */
export function scanSource(code: string, fileName = "arquivo.tsx"): Found[] {
  const out: Found[] = [];
  const seen = new Set<string>();
  const lines = code.split("\n");

  const HANDLERS = /\bon(Click|Change|Submit|Toggle|Select|Input)\s*=/;

  lines.forEach((line, i) => {
    if (!HANDLERS.test(line)) return;

    // Procura rótulo na própria linha ou nas cinco seguintes.
    const window = lines.slice(i, i + 6).join(" ");
    const tip = window.match(/data-tip=["'{`]([^"'}`]+)/);
    const title = window.match(/title=["'{`]([^"'}`]+)/);
    const aria = window.match(/aria-label=["'{`]([^"'}`]+)/);
    const inner = window.match(/>\s*([A-Za-zÀ-ÿ][^<>{}\n]{2,40}?)\s*</);
    const fn = line.match(/on\w+\s*=\s*\{?\s*\(?\)?\s*=>\s*(\w+)/);
    const cls = window.match(/className=["'`]([\w-]+)/);

    const label = clean(tip?.[1] || aria?.[1] || title?.[1] || inner?.[1] || fn?.[1] || cls?.[1] || "");
    if (!label || label.length < 2) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    out.push({
      label,
      selector: cls?.[1] ? `.${cls[1]}` : "",
      kind: kindFor(label),
      origin: `${fileName}:${i + 1}`,
      suggested: suggestTriggers(label),
    });
  });

  return out;
}

/* ── Mira: apontar e capturar ─────────────────────────────────── */

export interface PickerHandle { cancel: () => void }

export interface PickerOptions {
  /** Rótulos que já viraram órbita. */
  known?: string[];
  /** Modo fila: captura vários antes de devolver. */
  queue?: boolean;
  /** Chamado a cada captura no modo fila. */
  onQueue?: (items: Found[]) => void;
}

/**
 * Ativa o modo mira. O cursor vira alvo, o elemento sob o mouse
 * ganha contorno e o clique devolve o achado.
 */
export function startPicker(
  onPick: (f: Found | Found[]) => void,
  options: PickerOptions = {}
): PickerHandle {
  const { known = [], queue = false, onQueue } = options;
  const taken = new Set(known.map((k) => k.toLowerCase()));

  const box = document.createElement("div");
  box.className = "pe-crosshair";
  document.body.appendChild(box);

  // Some com o Studio inteiro, botão incluso: a tela precisa ficar livre.
  document.body.classList.add("pe-picking");
  if (queue) document.body.classList.add("pe-queueing");

  const hud = document.createElement("div");
  hud.className = "pe-hud";
  hud.innerHTML = queue
    ? `<b>Modo fila</b><span>Clique em vários · <em>0</em> na fila</span><i>Enter conclui · Esc cancela</i>`
    : `<b>Mira</b><span>Clique no elemento que quer vigiar</span><i>Esc cancela</i>`;
  document.body.appendChild(hud);

  const collected: Found[] = [];
  let target: Element | null = null;

  const move = (e: MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.closest(".pe-studio") || el === box) { box.style.opacity = "0"; target = null; return; }
    const hit = el.closest(CLICKABLE.join(",")) || el;
    target = hit;
    const r = hit.getBoundingClientRect();
    const nome = labelOf(hit);
    const dup = taken.has(nome.toLowerCase());
    box.style.cssText =
      `position:fixed;left:${r.left - 3}px;top:${r.top - 3}px;` +
      `width:${r.width + 6}px;height:${r.height + 6}px;opacity:1`;
    box.classList.toggle("taken", dup);
    box.dataset.label = (dup ? "já é órbita · " : "") + nome.slice(0, 30);
  };

  const capture = (el: Element): Found => {
    const label = labelOf(el);
    return {
      label, selector: selectorOf(el), kind: kindFor(label),
      origin: "mira", suggested: suggestTriggers(label),
    };
  };

  const click = (e: MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!target) return;
    const found = capture(target);

    if (!queue) { onPick(found); cancel(); return; }

    // Fila: acumula e segue capturando.
    if (!collected.some((c) => c.selector === found.selector)) {
      collected.push(found);
      taken.add(found.label.toLowerCase());
      onQueue?.([...collected]);
      const counter = hud.querySelector("em");
      if (counter) counter.textContent = String(collected.length);
      hud.classList.add("bump");
      setTimeout(() => hud.classList.remove("bump"), 220);
    }
  };

  const key = (e: KeyboardEvent) => {
    if (e.key === "Escape") { cancel(); return; }
    if (e.key === "Enter" && queue) { e.preventDefault(); finish(); }
  };

  const finish = () => {
    const items = [...collected];
    cancel();
    if (items.length) onPick(items);
  };

  const cancel = () => {
    box.remove();
    hud.remove();
    document.body.classList.remove("pe-picking", "pe-queueing");
    window.removeEventListener("mousemove", move, true);
    window.removeEventListener("click", click, true);
    window.removeEventListener("keydown", key, true);
  };

  window.addEventListener("mousemove", move, true);
  window.addEventListener("click", click, true);
  window.addEventListener("keydown", key, true);

  return { cancel };
}
