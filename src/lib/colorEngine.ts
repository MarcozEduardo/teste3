/* ══════════════════════════════════════════════════════════════
   MOTOR DE CORES
   ──────────────────────────────────────────────────────────────
   O usuário alcança 12 paletas prontas. A IA alcança o espaço
   inteiro: gera qualquer matiz, deriva a paleta completa e salva
   como cor nova do sistema.
   ══════════════════════════════════════════════════════════════ */

export interface Palette {
  key: string; name: string;
  gold: string; goldLight: string; navy: string;
  bg: string; surface: string; solid: string;
  text: string; muted: string; border: string;
  /** Criada pela IA em runtime, não faz parte do catálogo base. */
  custom?: boolean;
}

/* ── HSL → HEX e derivação de paleta ──────────────────────────── */
function hsl(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Deriva uma paleta inteira a partir de um matiz.
 * Mantém a mesma lógica de contraste das cores oficiais, então
 * qualquer matiz gerado pela IA nasce legível.
 */
export function buildPalette(key: string, name: string, hue: number, sat = 62): Palette {
  const dark = sat < 12; // tons neutros pedem tratamento próprio
  return {
    key, name, custom: true,
    gold: hsl(hue, dark ? 8 : sat, dark ? 38 : 44),
    goldLight: hsl(hue, dark ? 12 : sat + 10, dark ? 62 : 66),
    navy: hsl(hue, dark ? 10 : Math.min(sat + 20, 80), 14),
    bg: hsl(hue, dark ? 6 : Math.max(sat - 40, 14), 93),
    surface: hsl(hue, dark ? 5 : Math.max(sat - 46, 10), 96),
    solid: hsl(hue, dark ? 4 : Math.max(sat - 50, 8), 99),
    text: hsl(hue, dark ? 8 : 30, 16),
    muted: hsl(hue, dark ? 6 : 18, 46),
    border: `hsla(${hue}, ${dark ? 8 : 40}%, 22%, 0.12)`,
  };
}

/* ── Matiz de cada cor nomeada: base da aproximação ───────────── */
const HUES: Record<string, { hue: number; sat: number; name: string }> = {
  vermelho: { hue: 0, sat: 68, name: "Rubi" },
  laranja:  { hue: 24, sat: 72, name: "Âmbar" },
  amarelo:  { hue: 45, sat: 70, name: "Sol" },
  verde:    { hue: 142, sat: 58, name: "Musgo" },
  ciano:    { hue: 188, sat: 62, name: "Turquesa" },
  azul:     { hue: 220, sat: 66, name: "Cobalto" },
  roxo:     { hue: 268, sat: 62, name: "Ametista" },
  rosa:     { hue: 330, sat: 64, name: "Quartzo" },
  marrom:   { hue: 28, sat: 38, name: "Café" },
  cinza:    { hue: 220, sat: 8, name: "Grafite" },
  preto:    { hue: 240, sat: 6, name: "Ônix" },
  branco:   { hue: 40, sat: 5, name: "Alvo" },
  uva:      { hue: 268, sat: 62, name: "Uva" },
  creme:    { hue: 45, sat: 30, name: "Creme" },
};

export function paletteFor(key: string): Palette | null {
  const h = HUES[key];
  if (!h) return null;
  const p = buildPalette(key, h.name, h.hue, h.sat);
  p.custom = false;
  return p;
}

/** Vizinhas no círculo cromático — usado quando a pessoa pede "um tom de X". */
export function neighbors(key: string, count = 3): { key: string; name: string; hex: string }[] {
  const base = HUES[key];
  if (!base) return suggestRandom(count);
  const out: { key: string; name: string; hex: string }[] = [];
  const offsets = [-28, 22, 48, -52];
  for (let i = 0; i < count; i++) {
    const hue = (base.hue + offsets[i % offsets.length] + 360) % 360;
    const k = `${key}-t${i + 1}`;
    out.push({ key: k, name: `${base.name} ${["suave", "profundo", "aberto", "quebrado"][i % 4]}`, hex: hsl(hue, base.sat, 46) });
  }
  return out;
}

const SUGGEST_POOL = ["vermelho", "azul", "verde", "roxo", "laranja", "ciano", "rosa", "amarelo", "marrom", "cinza", "preto", "branco"];

export function suggestRandom(count = 3): { key: string; name: string; hex: string }[] {
  const pool = [...SUGGEST_POOL].sort(() => Math.random() - 0.5).slice(0, count);
  return pool.map((k) => {
    const h = HUES[k];
    return { key: k, name: h.name, hex: hsl(h.hue, h.sat, 46) };
  });
}

/* ── Cores criadas pela IA ────────────────────────────────────── */
const CUSTOM_KEY = "bobby_custom_palettes";

export function loadCustom(): Palette[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]"); } catch { return []; }
}

export function saveCustom(p: Palette): void {
  const all = loadCustom().filter((x) => x.key !== p.key);
  all.push(p);
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(all.slice(-24))); } catch { /* cota */ }
}

/** A IA inventa uma cor: matiz livre, nome próprio, entra no catálogo. */
export function inventColor(seedName?: string): Palette {
  const hue = Math.floor(Math.random() * 360);
  const sat = 46 + Math.floor(Math.random() * 30);
  const poetic = ["Aurora", "Vesper", "Cobre Antigo", "Névoa", "Brasa", "Índigo Fundo",
    "Musgo Noturno", "Areia Quente", "Tinta Fresca", "Vinho Seco", "Jade Pálido", "Ferrugem"];
  const name = seedName || poetic[Math.floor(Math.random() * poetic.length)];
  const key = "ia-" + name.toLowerCase().replace(/\s+/g, "-") + "-" + hue;
  const p = buildPalette(key, name, hue, sat);
  saveCustom(p);
  return p;
}

export function resolvePalette(key: string): Palette | null {
  return paletteFor(key) || loadCustom().find((p) => p.key === key) || null;
}

/* ── Aplicação em runtime ─────────────────────────────────────── */
const HISTORY_KEY = "bobby_palette_history";

export function applyPalette(p: Palette): void {
  const r = document.documentElement.style;
  r.setProperty("--gold", p.gold);
  r.setProperty("--gold-light", p.goldLight);
  r.setProperty("--gold-glow", p.gold + "26");
  r.setProperty("--navy", p.navy);
  r.setProperty("--bg", p.bg);
  r.setProperty("--surface", p.surface);
  r.setProperty("--surface-solid", p.solid);
  r.setProperty("--text-main", p.text);
  r.setProperty("--text-muted", p.muted);
  r.setProperty("--border", p.border);
  document.body.style.background = p.bg;
  try {
    const hist: string[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    hist.push(p.key);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(-12)));
    localStorage.setItem("bobby_palette", p.key);
  } catch { /* cota */ }
}

export function clearPalette(): void {
  const r = document.documentElement.style;
  ["--gold", "--gold-light", "--gold-glow", "--navy", "--bg", "--surface",
   "--surface-solid", "--text-main", "--text-muted", "--border"].forEach((v) => r.removeProperty(v));
  document.body.style.background = "";
  try {
    localStorage.removeItem("bobby_palette");
    localStorage.removeItem(HISTORY_KEY);
  } catch { /* noop */ }
}

/** Volta uma casa no histórico. */
export function revertPalette(): Palette | null {
  try {
    const hist: string[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    hist.pop();
    const prev = hist[hist.length - 1];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    if (!prev) { clearPalette(); return null; }
    const p = resolvePalette(prev);
    if (p) applyPalette(p);
    return p;
  } catch { clearPalette(); return null; }
}

export function restoreSaved(): void {
  try {
    const key = localStorage.getItem("bobby_palette");
    if (!key) return;
    const p = resolvePalette(key);
    if (p) applyPalette(p);
  } catch { /* noop */ }
}

/* ── Fontes: função oculta, só a IA alcança ───────────────────── */
export const FONTS = [
  { key: "inter", name: "Inter", stack: "'Inter', system-ui, sans-serif" },
  { key: "syne", name: "Syne", stack: "'Syne', 'Inter', sans-serif" },
  { key: "mono", name: "Fira Code", stack: "'Fira Code', ui-monospace, monospace" },
  { key: "serif", name: "Serifada", stack: "Georgia, 'Times New Roman', serif" },
  { key: "system", name: "Sistema", stack: "system-ui, -apple-system, sans-serif" },
];

export function applyFont(key: string): string {
  const f = FONTS.find((x) => x.key === key) || FONTS[0];
  document.documentElement.style.setProperty("--font-chat", f.stack);
  document.body.style.fontFamily = f.stack;
  try { localStorage.setItem("bobby_font", f.key); } catch { /* noop */ }
  return f.name;
}
