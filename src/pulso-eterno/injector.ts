/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · INJETOR DE ELEMENTOS
   ──────────────────────────────────────────────────────────────
   Cole um bloco misto — HTML, CSS e JavaScript juntos — e o
   sistema separa cada parte, avisa dos conflitos e insere onde
   você soltar.

   O CSS vai para uma folha própria. O script vai para o fim do
   corpo. Ambos marcados com o comentário de origem, para quem
   ler depois saber de onde veio.
   ══════════════════════════════════════════════════════════════ */

export interface Parsed {
  html: string;
  css: string;
  js: string;
  /** O que foi identificado, para mostrar antes de aplicar. */
  found: { html: boolean; css: boolean; js: boolean };
}

const MARK = "elemento adicionado pelo Dev PulsoEterno";

/**
 * Separa as três linguagens de um bloco colado.
 * Aceita fragmento solto, com ou sem as tags de marcação.
 */
export function parseBlock(raw: string): Parsed {
  let rest = raw.trim();
  let css = "", js = "", html = "";

  // Blocos explicitamente marcados.
  const styles = [...rest.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  styles.forEach((m) => { css += m[1] + "\n"; rest = rest.replace(m[0], ""); });

  const scripts = [...rest.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((m) => { js += m[1] + "\n"; rest = rest.replace(m[0], ""); });

  // Cercas de markdown com a linguagem declarada.
  const fences = [...rest.matchAll(/```(\w+)?\n([\s\S]*?)```/g)];
  fences.forEach((m) => {
    const lang = (m[1] || "").toLowerCase();
    const code = m[2];
    if (/^(css|scss|less)$/.test(lang)) css += code + "\n";
    else if (/^(js|javascript|ts|typescript)$/.test(lang)) js += code + "\n";
    else html += code + "\n";
    rest = rest.replace(m[0], "");
  });

  rest = rest.trim();

  // O que sobrou: decide pela forma.
  if (rest) {
    const temTag = /<[a-z][\s\S]*>/i.test(rest);
    const temRegra = /[.#@:a-z-]+\s*\{[^}]*:[^}]*\}/i.test(rest);
    const temCodigo = /\b(function|const|let|var|=>|document\.|addEventListener|querySelector)\b/.test(rest);

    if (temTag) html += rest;
    else if (temRegra && !temCodigo) css += rest;
    else if (temCodigo) js += rest;
    else html += rest;
  }

  return {
    html: html.trim(),
    css: css.trim(),
    js: js.trim(),
    found: { html: !!html.trim(), css: !!css.trim(), js: !!js.trim() },
  };
}

/* ── Conflitos ────────────────────────────────────────────────── */

export interface Clash {
  kind: "id" | "classe" | "seletor" | "global" | "funcao" | "risco";
  term: string;
  detail: string;
  severity: "alta" | "media" | "baixa";
}

/** Confere o que o trecho colado vai atropelar na página atual. */
export function findClashes(p: Parsed): Clash[] {
  const out: Clash[] = [];

  // Ids repetidos quebram a página de verdade.
  [...p.html.matchAll(/id=["']([^"']+)["']/g)].forEach((m) => {
    if (document.getElementById(m[1])) {
      out.push({
        kind: "id", term: m[1], severity: "alta",
        detail: "Já existe um elemento com este id. Dois ids iguais quebram seletores e rótulos.",
      });
    }
  });

  // Classes que já existem: pode ser intencional, pode ser acidente.
  const classes = new Set<string>();
  [...p.html.matchAll(/class=["']([^"']+)["']/g)]
    .forEach((m) => m[1].split(/\s+/).forEach((c) => c && classes.add(c)));
  classes.forEach((c) => {
    if (document.getElementsByClassName(c).length) {
      out.push({
        kind: "classe", term: c, severity: "baixa",
        detail: "A classe já é usada na página. O estilo novo pode afetar elementos existentes.",
      });
    }
  });

  // Seletores do CSS que atingem coisa que já está na tela.
  [...p.css.matchAll(/(^|\})\s*([^{}@]+)\{/g)].forEach((m) => {
    const sel = m[2].trim();
    if (!sel || sel.startsWith("@")) return;

    if (/^(\*|html|body)\b/.test(sel)) {
      out.push({
        kind: "global", term: sel, severity: "alta",
        detail: "Seletor global atinge a página inteira, não só o elemento novo.",
      });
      return;
    }
    try {
      const n = document.querySelectorAll(sel).length;
      if (n > 0) {
        out.push({
          kind: "seletor", term: sel, severity: n > 3 ? "alta" : "media",
          detail: `Este seletor já casa com ${n} elemento(s) existentes.`,
        });
      }
    } catch { /* seletor inválido, ignora */ }
  });

  // Funções globais que podem sobrescrever algo do projeto.
  [...p.js.matchAll(/function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=/g)].forEach((m) => {
    const nome = m[1] || m[2];
    if (!nome) return;
    if (nome in window) {
      out.push({
        kind: "funcao", term: nome, severity: "alta",
        detail: "Já existe algo com este nome no escopo global. Vai sobrescrever.",
      });
    }
  });

  // Padrões que merecem atenção antes de rodar.
  const riscos: [RegExp, string][] = [
    [/\beval\s*\(/, "Execução dinâmica de texto como código."],
    [/innerHTML\s*=/, "Escrita direta de HTML, caminho comum de XSS."],
    [/document\.write/, "Reescreve o documento inteiro."],
    [/localStorage|sessionStorage/, "Acessa o armazenamento do navegador."],
    [/fetch\s*\(|XMLHttpRequest/, "Faz chamada de rede."],
    [/location\s*=|location\.href\s*=/, "Redireciona a página."],
    [/setInterval\s*\(/, "Cria laço contínuo que não para sozinho."],
  ];
  riscos.forEach(([re, detail]) => {
    if (re.test(p.js)) {
      out.push({ kind: "risco", term: re.source.split("\\")[0].slice(0, 22), severity: "media", detail });
    }
  });

  return out;
}

/* ── Aplicação local ──────────────────────────────────────────── */

export interface Injected {
  id: string;
  label: string;
  hostId: string;
  styleId?: string;
  scriptId?: string;
  at: number;
}

const KEY = "pulso_injected";

function read(): Injected[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(l: Injected[]) {
  try { localStorage.setItem(KEY, JSON.stringify(l.slice(-40))); } catch { /* cota */ }
}

export function injected(): Injected[] { return read().reverse(); }

export type Position = "before" | "after" | "inside";

/**
 * Insere o elemento na página. O nó entra arrastável para você
 * encontrar o lugar certo antes de fixar.
 */
export function inject(
  p: Parsed,
  anchorSelector: string,
  position: Position,
  label: string,
  runScript: boolean
): { ok: boolean; msg: string; hostId?: string } {
  const anchor = document.querySelector(anchorSelector);
  if (!anchor) return { ok: false, msg: "Âncora não encontrada na tela." };
  if (!p.html && !p.css) return { ok: false, msg: "Nada para inserir." };

  const id = "pulso-" + Math.random().toString(36).slice(2, 8);
  const record: Injected = { id, label, hostId: id, at: Date.now() };

  if (p.css) {
    const style = document.createElement("style");
    style.id = id + "-css";
    style.textContent = `/* ${MARK} · ${label} */\n${p.css}`;
    document.head.appendChild(style);
    record.styleId = style.id;
  }

  const host = document.createElement("div");
  host.id = id;
  host.setAttribute("data-pulso", MARK);
  host.innerHTML = p.html;

  if (position === "before") anchor.parentNode?.insertBefore(host, anchor);
  else if (position === "after") anchor.parentNode?.insertBefore(host, anchor.nextSibling);
  else anchor.appendChild(host);

  if (p.js && runScript) {
    const s = document.createElement("script");
    s.id = id + "-js";
    s.textContent = `/* ${MARK} · ${label} */\n(function(){\n${p.js}\n})();`;
    document.body.appendChild(s);
    record.scriptId = s.id;
  }

  const list = read();
  list.push(record);
  write(list);

  return { ok: true, msg: "Elemento inserido. Arraste para posicionar.", hostId: id };
}

export function removeInjected(id: string): boolean {
  const list = read();
  const item = list.find((i) => i.id === id);
  if (!item) return false;
  [item.hostId, item.styleId, item.scriptId].forEach((x) => {
    if (x) document.getElementById(x)?.remove();
  });
  write(list.filter((i) => i.id !== id));
  return true;
}

export function removeAllInjected(): number {
  const list = read();
  list.forEach((i) => {
    [i.hostId, i.styleId, i.scriptId].forEach((x) => {
      if (x) document.getElementById(x)?.remove();
    });
  });
  write([]);
  return list.length;
}

/* ── Arrastar para posicionar ─────────────────────────────────── */

export interface DragHandle { finish: () => { x: number; y: number }; cancel: () => void }

/**
 * Deixa o elemento recém-inserido arrastável até o botão direito
 * finalizar. Guarda a posição final como estilo inline.
 */
export function makeDraggable(hostId: string, onFinish: () => void): DragHandle {
  const host = document.getElementById(hostId);
  if (!host) return { finish: () => ({ x: 0, y: 0 }), cancel: () => {} };

  host.classList.add("pulso-dragging");
  const start = host.getBoundingClientRect();
  host.style.position = "relative";
  host.style.zIndex = "999";

  let dx = 0, dy = 0, dragging = false, ox = 0, oy = 0;

  const down = (e: MouseEvent) => {
    if (e.button !== 0) return;
    dragging = true;
    ox = e.clientX - dx; oy = e.clientY - dy;
    e.preventDefault();
  };
  const move = (e: MouseEvent) => {
    if (!dragging) return;
    dx = e.clientX - ox; dy = e.clientY - oy;
    host.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const up = () => { dragging = false; };
  const menu = (e: MouseEvent) => { e.preventDefault(); finish(); };

  const finish = () => {
    host.classList.remove("pulso-dragging");
    host.removeEventListener("mousedown", down);
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    host.removeEventListener("contextmenu", menu);
    host.style.removeProperty("z-index");
    onFinish();
    return { x: dx, y: dy };
  };

  const cancel = () => {
    finish();
    host.style.removeProperty("transform");
  };

  host.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  host.addEventListener("contextmenu", menu);

  void start;
  return { finish, cancel };
}
