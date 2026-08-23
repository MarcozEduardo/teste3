/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · AÇÕES OCULTAS
   ──────────────────────────────────────────────────────────────
   O que o usuário não alcança pela interface, mas a IA alcança
   pela conversa. Quem descobre como pedir sente que achou uma
   porta escondida — e é exatamente essa a intenção.

   Regra inegociável: toda ação grava o estado anterior. Nada
   aqui é irreversível. `restoreAll()` devolve tudo ao normal.
   ══════════════════════════════════════════════════════════════ */

export type HiddenCategory = "aparencia" | "posicao" | "conteudo" | "revelacao" | "sacanagem";

export interface HiddenAction {
  id: string;
  label: string;
  category: HiddenCategory;
  /** O que o Bobby diz na primeira vez. A surpresa só acontece uma vez. */
  firstTime: string;
  /** Depois que já foi descoberta. */
  repeat: string;
  /** Precisa de um alvo na tela. */
  needsTarget: boolean;
  /** Reverte sozinha depois de N milissegundos. */
  autoRevert?: number;
}

export const HIDDEN_CATEGORIES: Record<HiddenCategory, { label: string; hint: string; color: string }> = {
  aparencia: { label: "Aparência", hint: "Cor, tamanho, opacidade e sombra", color: "#7c3aed" },
  posicao:   { label: "Posição",   hint: "Trocar de lugar, mover, esconder", color: "#ec4899" },
  conteudo:  { label: "Conteúdo",  hint: "Legenda, ícone e texto do elemento", color: "#0891b2" },
  revelacao: { label: "Revelação", hint: "Mostrar o que existe por baixo", color: "#16a34a" },
  sacanagem: { label: "Sacanagem", hint: "Brincadeiras que voltam sozinhas", color: "#eab308" },
};

export const HIDDEN_ACTIONS: HiddenAction[] = [
  {
    id: "hide.temp", label: "Ocultar temporário", category: "posicao", needsTarget: true,
    autoRevert: 8000,
    firstTime: "Peraí… acho que eu consigo esconder isso.\n\n**Sumiu.** Volta em oito segundos, calma.\n\nNão sabia que dava pra fazer isso, sério.",
    repeat: "Escondi de novo. Volta sozinho em oito segundos.",
  },
  {
    id: "hide.perm", label: "Ocultar permanente", category: "posicao", needsTarget: true,
    firstTime: "Escondi. E esse fica escondido mesmo, até você pedir pra voltar.\n\nSe se arrepender, é só falar em restaurar.",
    repeat: "Ocultado. Pede pra restaurar quando quiser de volta.",
  },
  {
    id: "swap", label: "Trocar dois de lugar", category: "posicao", needsTarget: true,
    firstTime: "Opa. Trocar dois elementos de lugar?\n\nNunca tentei… **funcionou.** Olha lá em cima, eles inverteram.\n\nIsso não tem botão em lugar nenhum, viu. Você descobriu sozinho.",
    repeat: "Troquei os dois de posição.",
  },
  {
    id: "legend", label: "Editar legenda", category: "conteudo", needsTarget: true,
    firstTime: "Reescrever o texto de um botão? Deixa comigo.\n\n**Pronto.** Agora ele diz o que você quis.\n\nCuriosidade: nem o Marcos costuma mexer nisso em runtime.",
    repeat: "Legenda trocada.",
  },
  {
    id: "icon", label: "Trocar a figurinha", category: "conteudo", needsTarget: true,
    firstTime: "Trocar o ícone… peraí.\n\n**Trocado.** Ficou estranho, mas trocou.",
    repeat: "Ícone trocado.",
  },
  {
    id: "reveal.css", label: "Revelar o CSS", category: "revelacao", needsTarget: true,
    firstTime: "Ah, você quer ver por baixo do capô?\n\nSegura essa: estou mostrando a caixa, a posição e as regras aplicadas nesse elemento. Contorno vermelho é margem, azul é padding.\n\nPoucos pedem isso. Gostei.",
    repeat: "Aí está a estrutura. Contorno vermelho é margem, azul é padding.",
  },
  {
    id: "reveal.grid", label: "Mostrar a malha", category: "revelacao", needsTarget: false,
    autoRevert: 12000,
    firstTime: "Quer ver o esqueleto da página inteira?\n\n**Toma.** Cada caixa contornada, cada div exposta. É assim que eu enxergo tudo isso aqui.\n\nSome em doze segundos.",
    repeat: "Malha ligada. Some em doze segundos.",
  },
  {
    id: "shake", label: "Sacudir", category: "sacanagem", needsTarget: true, autoRevert: 900,
    firstTime: "Sacudir um botão? Isso é sacanagem pura.\n\n**Feito.** Ele nem viu de onde veio.",
    repeat: "Sacudido.",
  },
  {
    id: "spin", label: "Girar", category: "sacanagem", needsTarget: true, autoRevert: 2400,
    firstTime: "Girando… e volta.\n\nNão pergunte pra que serve. Serve pra isso mesmo.",
    repeat: "Girou. Voltou.",
  },
  {
    id: "carrot", label: "Cenoura", category: "sacanagem", needsTarget: true, autoRevert: 5000,
    firstTime: "Você pediu. Eu avisei que não era uma boa ideia.\n\nPendurei uma cenoura no elemento. Some em cinco segundos, antes que alguém veja.",
    repeat: "Cenoura pendurada de novo. Você não cansa.",
  },
  {
    id: "highlight", label: "Destacar", category: "aparencia", needsTarget: true, autoRevert: 4000,
    firstTime: "Deixa eu apontar pra você.\n\n**É esse aqui**, piscando. Agora não tem erro.",
    repeat: "Destaquei. É esse piscando.",
  },
  {
    id: "ghost", label: "Deixar translúcido", category: "aparencia", needsTarget: true, autoRevert: 6000,
    firstTime: "Deixar meio fantasma?\n\nFeito. Dá pra ver o que tem atrás agora.",
    repeat: "Translúcido por seis segundos.",
  },
];

/* ── Registro do que foi alterado ─────────────────────────────── */

interface Change {
  selector: string;
  property: string;
  previous: string;
  actionId: string;
  at: number;
}

const LOG_KEY = "pulso_hidden_log";
let changes: Change[] = load();

function load(): Change[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
}
function persist() {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(changes.slice(-60))); } catch { /* cota */ }
}

/** Primeira vez de cada ação, para a surpresa não se repetir. */
const SEEN_KEY = "pulso_hidden_seen";
function seen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; }
}
export function isFirstTime(actionId: string): boolean {
  return !seen().includes(actionId);
}
function markSeen(actionId: string) {
  const s = seen();
  if (!s.includes(actionId)) {
    s.push(actionId);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch { /* cota */ }
  }
}

function record(el: HTMLElement, selector: string, property: string, actionId: string) {
  changes.push({
    selector, property, actionId, at: Date.now(),
    previous: el.style.getPropertyValue(property),
  });
  persist();
}

export function pendingChanges(): number { return changes.length; }

/** Devolve tudo ao estado anterior, na ordem inversa. */
export function restoreAll(): number {
  const total = changes.length;
  [...changes].reverse().forEach((c) => {
    document.querySelectorAll<HTMLElement>(c.selector).forEach((el) => {
      if (c.previous) el.style.setProperty(c.property, c.previous);
      else el.style.removeProperty(c.property);
    });
  });
  document.querySelectorAll(".pe-carrot, .pe-cssbox").forEach((n) => n.remove());
  document.body.classList.remove("pe-grid-on");
  changes = [];
  persist();
  return total;
}

/* ── Execução ─────────────────────────────────────────────────── */

export interface HiddenResult {
  ok: boolean;
  message: string;
  /** Detalhe técnico, quando a ação revela algo. */
  detail?: string;
}

export function runHidden(actionId: string, selector?: string, arg?: string): HiddenResult {
  const action = HIDDEN_ACTIONS.find((a) => a.id === actionId);
  if (!action) return { ok: false, message: "Essa eu não conheço." };

  const el = selector ? document.querySelector<HTMLElement>(selector) : null;
  if (action.needsTarget && !el) return { ok: false, message: "Não achei esse elemento na tela agora." };

  const first = isFirstTime(actionId);
  const revert = (fn: () => void) => action.autoRevert && setTimeout(fn, action.autoRevert);
  let detail: string | undefined;

  switch (actionId) {
    case "hide.temp":
    case "hide.perm": {
      record(el!, selector!, "display", actionId);
      el!.style.display = "none";
      revert(() => { el!.style.removeProperty("display"); });
      break;
    }
    case "swap": {
      // Troca com o irmão seguinte, ou o anterior se for o último.
      const sib = (el!.nextElementSibling || el!.previousElementSibling) as HTMLElement | null;
      if (!sib) return { ok: false, message: "Esse não tem com quem trocar de lugar." };
      record(el!, selector!, "order", actionId);
      const parent = el!.parentElement!;
      parent.style.display = parent.style.display || "flex";
      const a = getComputedStyle(el!).order || "0";
      const b = getComputedStyle(sib).order || "0";
      el!.style.order = b === a ? "1" : b;
      sib.style.order = a === b ? "0" : a;
      break;
    }
    case "legend": {
      const target = el!.querySelector("span,b") || el!;
      changes.push({ selector: selector!, property: "__text", actionId, at: Date.now(), previous: target.textContent || "" });
      persist();
      target.textContent = arg || "Botão misterioso";
      break;
    }
    case "icon": {
      const svg = el!.querySelector("svg");
      if (!svg) return { ok: false, message: "Esse não tem figurinha pra trocar." };
      record(el!, selector!, "filter", actionId);
      el!.style.filter = "hue-rotate(140deg) saturate(1.8)";
      break;
    }
    case "reveal.css": {
      const r = el!.getBoundingClientRect();
      const cs = getComputedStyle(el!);
      const box = document.createElement("div");
      box.className = "pe-cssbox";
      box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
      box.innerHTML = `<span>${Math.round(r.width)} × ${Math.round(r.height)}</span>`;
      document.body.appendChild(box);
      setTimeout(() => box.remove(), 9000);
      detail = [
        `posição: ${cs.position}`,
        `display: ${cs.display}`,
        `margem: ${cs.margin}`,
        `padding: ${cs.padding}`,
        `raio: ${cs.borderRadius}`,
        `cor: ${cs.color}`,
        `fundo: ${cs.backgroundColor}`,
      ].join("\n");
      break;
    }
    case "reveal.grid": {
      document.body.classList.add("pe-grid-on");
      revert(() => document.body.classList.remove("pe-grid-on"));
      break;
    }
    case "shake": {
      record(el!, selector!, "animation", actionId);
      el!.style.animation = "peShake .42s ease 2";
      revert(() => el!.style.removeProperty("animation"));
      break;
    }
    case "spin": {
      record(el!, selector!, "animation", actionId);
      el!.style.animation = "peSpin 1.1s ease 2";
      revert(() => el!.style.removeProperty("animation"));
      break;
    }
    case "carrot": {
      const r = el!.getBoundingClientRect();
      const c = document.createElement("div");
      c.className = "pe-carrot";
      c.textContent = "🥕";
      c.style.cssText = `left:${r.left + r.width / 2 - 12}px;top:${r.top - 34}px`;
      document.body.appendChild(c);
      revert(() => c.remove());
      break;
    }
    case "highlight": {
      record(el!, selector!, "box-shadow", actionId);
      el!.style.boxShadow = "0 0 0 3px #eab308, 0 0 24px rgba(234,179,8,.6)";
      el!.style.animation = "pePulse 1s ease infinite";
      revert(() => { el!.style.removeProperty("box-shadow"); el!.style.removeProperty("animation"); });
      break;
    }
    case "ghost": {
      record(el!, selector!, "opacity", actionId);
      el!.style.opacity = "0.28";
      revert(() => el!.style.removeProperty("opacity"));
      break;
    }
  }

  markSeen(actionId);
  return { ok: true, message: first ? action.firstTime : action.repeat, detail };
}
