/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · FÁBRICA DE DOCUMENTOS
   ──────────────────────────────────────────────────────────────
   Documento montado por combinação, não por sorteio. Quatro
   layouts, cinco paletas, blocos que se encaixam em qualquer
   ordem. A variação vem da matemática: 4 × 5 × ordem dos blocos
   já passa de mil arranjos distintos.

   Nenhuma chamada de IA. O sistema entrega sozinho — e só chama
   o modelo se a pessoa reclamar do resultado.
   ══════════════════════════════════════════════════════════════ */

export type DocLayout = "coluna" | "lateral" | "cartao" | "revista";
export type DocKind =
  | "curriculo" | "relatorio" | "lista" | "proposta" | "tabela"
  | "carta" | "recibo" | "briefing" | "ficha";

export interface Palette {
  id: string; name: string;
  ink: string; accent: string; soft: string; line: string; muted: string;
}

export const PALETTES: Palette[] = [
  { id: "grafite", name: "Grafite", ink: "#1a1a1a", accent: "#c9a227", soft: "#faf8f3", line: "#e6e2d8", muted: "#6b6b6b" },
  { id: "uva",     name: "Uva",     ink: "#241536", accent: "#7c3aed", soft: "#f6f1fb", line: "#e6dcf2", muted: "#6f5f85" },
  { id: "oceano",  name: "Oceano",  ink: "#0f172a", accent: "#2563eb", soft: "#f1f5f9", line: "#dbe4ee", muted: "#64748b" },
  { id: "mata",    name: "Mata",    ink: "#14261a", accent: "#15803d", soft: "#f0f7f1", line: "#dcebe0", muted: "#5c7d66" },
  { id: "barro",   name: "Barro",   ink: "#2f2118", accent: "#92400e", soft: "#f7f1e9", line: "#eadfd0", muted: "#856a55" },
];

export const LAYOUTS: { id: DocLayout; name: string; hint: string }[] = [
  { id: "coluna",  name: "Coluna",  hint: "Texto corrido, leitura linear" },
  { id: "lateral", name: "Lateral", hint: "Barra à esquerda com dados" },
  { id: "cartao",  name: "Cartão",  hint: "Blocos separados em caixas" },
  { id: "revista", name: "Revista", hint: "Duas colunas, densidade alta" },
];

export const KINDS: { id: DocKind; name: string; blocks: string[] }[] = [
  { id: "curriculo", name: "Currículo",  blocks: ["cabecalho", "resumo", "experiencia", "formacao", "habilidades", "contato"] },
  { id: "relatorio", name: "Relatório",  blocks: ["capa", "sumario", "indicadores", "secoes", "tabela", "conclusao"] },
  { id: "lista",     name: "Lista",      blocks: ["cabecalho", "itens", "notas"] },
  { id: "proposta",  name: "Proposta",   blocks: ["capa", "resumo", "escopo", "tabela", "prazo", "contato"] },
  { id: "tabela",    name: "Tabela",     blocks: ["cabecalho", "tabela", "notas"] },
  { id: "carta",     name: "Carta",      blocks: ["cabecalho", "resumo", "secoes", "assinatura"] },
  { id: "recibo",    name: "Recibo",     blocks: ["cabecalho", "indicadores", "tabela", "assinatura"] },
  { id: "briefing",  name: "Briefing",   blocks: ["capa", "resumo", "indicadores", "itens", "secoes", "notas"] },
  { id: "ficha",     name: "Ficha",      blocks: ["cabecalho", "indicadores", "habilidades", "itens", "contato"] },
];

/* ── Dados de entrada, todos opcionais ────────────────────────── */
export interface DocData {
  title?: string;
  subtitle?: string;
  author?: string;
  contact?: string[];
  summary?: string;
  sections?: { title: string; body: string }[];
  items?: string[];
  table?: { head: string[]; rows: string[][] };
  metrics?: { value: string; label: string }[];
  timeline?: { when: string; what: string; desc: string }[];
  skills?: { label: string; level: number }[];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ── Blocos ───────────────────────────────────────────────────── */

/* Todos os blocos recebem a mesma assinatura para poderem ser
   trocados de ordem livremente. Alguns não usam a paleta. */
const B: Record<string, (_p: Palette, d: DocData) => string> = {
  cabecalho: (_p, d) => `
<header class="hd">
  <div class="hd-bar"></div>
  <h1>${esc(d.title || "Documento")}</h1>
  ${d.subtitle ? `<p class="sub">${esc(d.subtitle)}</p>` : ""}
  ${d.author || d.contact?.length ? `
  <div class="meta">
    ${d.author ? `<span><b>${esc(d.author)}</b></span>` : ""}
    ${(d.contact || []).map((c) => `<span>${esc(c)}</span>`).join("")}
    <span>${new Date().toLocaleDateString("pt-BR")}</span>
  </div>` : ""}
</header>`,

  capa: (_p, d) => `
<header class="capa">
  <div class="capa-mark"></div>
  <h1>${esc(d.title || "Documento")}</h1>
  ${d.subtitle ? `<p class="sub">${esc(d.subtitle)}</p>` : ""}
  <div class="capa-foot">
    <span>${esc(d.author || "")}</span>
    <span>${new Date().toLocaleDateString("pt-BR")}</span>
  </div>
</header>`,

  resumo: (_p, d) => d.summary ? `
<section><h2>Resumo</h2><p class="lead">${esc(d.summary)}</p></section>` : "",

  indicadores: (_p, d) => d.metrics?.length ? `
<section>
  <div class="kpis">
    ${d.metrics.map((m) => `<div class="kpi"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join("")}
  </div>
</section>` : "",

  secoes: (_p, d) => (d.sections || []).map((s) => `
<section><h2>${esc(s.title)}</h2><p>${esc(s.body).replace(/\n/g, "</p><p>")}</p></section>`).join(""),

  experiencia: (_p, d) => d.timeline?.length ? `
<section>
  <h2>Experiência</h2>
  <div class="tl">
    ${d.timeline.map((t) => `
    <div class="tl-item">
      <span class="tl-when">${esc(t.when)}</span>
      <div><b>${esc(t.what)}</b><p>${esc(t.desc)}</p></div>
    </div>`).join("")}
  </div>
</section>` : "",

  formacao: () => "",

  habilidades: (_p, d) => d.skills?.length ? `
<section>
  <h2>Habilidades</h2>
  ${d.skills.map((s) => `
  <div class="bar">
    <div class="bar-hd"><span>${esc(s.label)}</span><b>${s.level}%</b></div>
    <div class="bar-track"><div style="width:${s.level}%"></div></div>
  </div>`).join("")}
</section>` : "",

  itens: (_p, d) => d.items?.length ? `
<section>
  <ul class="lista">
    ${d.items.map((i) => `<li>${esc(i)}</li>`).join("")}
  </ul>
</section>` : "",

  tabela: (_p, d) => d.table ? `
<section>
  <table>
    <thead><tr>${d.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>
      ${d.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>
</section>` : "",

  escopo: () => "",
  prazo: () => "",
  sumario: (_p, d) => (d.sections || []).length ? `
<section class="sumario">
  <h2>Sumário</h2>
  <ol>${(d.sections || []).map((s) => `<li>${esc(s.title)}</li>`).join("")}</ol>
</section>` : "",

  conclusao: () => "",
  notas: () => `
<footer class="notas">Documento gerado automaticamente · ${new Date().toLocaleString("pt-BR")}</footer>`,

  contato: (_p, d) => d.contact?.length ? `
<section class="contato">
  ${d.contact.map((c) => `<span>${esc(c)}</span>`).join("")}
</section>` : "",

  assinatura: (_p, d) => `
<section class="assinatura">
  <div class="linha"></div>
  <span>${esc(d.author || "Assinatura")}</span>
</section>`,
};

/* ── Folhas de estilo por layout ──────────────────────────────── */

function css(p: Palette, layout: DocLayout): string {
  const base = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;color:${p.ink};background:#fff;font-size:10.5pt;line-height:1.62}
.page{max-width:800px;margin:0 auto;padding:44px 52px}
h1{font-family:'Syne',sans-serif;font-size:27pt;font-weight:800;letter-spacing:-.02em;line-height:1.12}
h2{font-family:'Syne',sans-serif;font-size:13pt;font-weight:700;margin:26px 0 10px;color:${p.ink}}
p{margin-bottom:9px;text-align:justify;hyphens:auto}
.sub{font-size:12pt;color:${p.muted};text-align:left;margin-top:6px}
.lead{font-size:11pt;color:${p.muted}}
.hd-bar{width:64px;height:4px;background:${p.accent};border-radius:99px;margin-bottom:18px}
.meta{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px;padding-top:11px;border-top:1px solid ${p.line};font-size:8.5pt;color:${p.muted}}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:9px;margin:14px 0}
.kpi{background:${p.soft};border-radius:10px;padding:13px 10px;text-align:center}
.kpi b{display:block;font-family:'Syne',sans-serif;font-size:19pt;color:${p.accent};line-height:1}
.kpi span{font-size:7.5pt;color:${p.muted};text-transform:uppercase;letter-spacing:.07em}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9.5pt}
th{background:${p.accent};color:#fff;padding:9px 11px;text-align:left;font-size:8.5pt;font-weight:600}
td{padding:8px 11px;border-bottom:1px solid ${p.line}}
tbody tr:nth-child(even){background:${p.soft}}
.tl{padding-left:16px;border-left:2px solid ${p.line}}
.tl-item{position:relative;margin-bottom:15px}
.tl-item::before{content:'';position:absolute;left:-21px;top:5px;width:9px;height:9px;border-radius:50%;background:${p.accent}}
.tl-when{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${p.accent}}
.tl-item b{display:block;font-size:10.5pt;margin:1px 0 2px}
.tl-item p{font-size:9pt;color:${p.muted};text-align:left}
.bar{margin-bottom:9px}
.bar-hd{display:flex;justify-content:space-between;font-size:9pt;margin-bottom:3px}
.bar-hd b{color:${p.accent}}
.bar-track{height:6px;background:${p.soft};border-radius:99px;overflow:hidden}
.bar-track div{height:100%;background:${p.accent};border-radius:99px}
.lista{list-style:none}
.lista li{padding:7px 0 7px 20px;border-bottom:1px solid ${p.line};position:relative}
.lista li::before{content:'';position:absolute;left:4px;top:14px;width:5px;height:5px;border-radius:50%;background:${p.accent}}
.contato{display:flex;flex-wrap:wrap;gap:12px;padding:12px 0;font-size:9pt;color:${p.muted}}
.notas{margin-top:26px;padding-top:11px;border-top:1px solid ${p.line};font-size:8pt;color:${p.muted};text-align:center}
.capa{padding:60px 0 40px}
.capa-mark{width:44px;height:44px;border-radius:12px;background:${p.accent};margin-bottom:22px}
.capa-foot{display:flex;justify-content:space-between;margin-top:38px;padding-top:12px;border-top:1px solid ${p.line};font-size:9pt;color:${p.muted}}
.sumario ol{padding-left:18px;color:${p.muted};font-size:10pt}
.assinatura{margin-top:44px;text-align:center}
.assinatura .linha{width:240px;height:1px;background:${p.ink};margin:0 auto 6px}
.assinatura span{font-size:9.5pt;color:${p.muted}}
@media print{.page{padding:0}@page{margin:16mm}h2{break-after:avoid}table,.kpi,.tl-item{break-inside:avoid}}`;

  const variantes: Record<DocLayout, string> = {
    coluna: "",
    lateral: `
.page{display:grid;grid-template-columns:190px 1fr;gap:32px;padding-left:34px}
.hd,.capa{grid-column:1/-1}
.contato,section:has(.bar){grid-column:1;background:${p.soft};padding:16px;border-radius:12px}
section:not(:has(.bar)):not(.contato){grid-column:2}`,
    cartao: `
section{background:${p.soft};border-radius:14px;padding:18px 20px;margin-bottom:12px}
section h2{margin-top:0}
.hd,.capa{background:none;padding-left:0}`,
    revista: `
section{column-count:2;column-gap:26px}
section h2{column-span:all}
table,.kpis,.tl{column-span:all}`,
  };

  return base + variantes[layout];
}

/* ── Montagem ─────────────────────────────────────────────────── */

export interface DocSpec {
  kind: DocKind;
  layout?: DocLayout;
  palette?: string;
  data: DocData;
  /** Semente: mesma semente gera o mesmo documento. */
  seed?: number;
}

export function buildDocument(spec: DocSpec): string {
  const seed = spec.seed ?? Date.now();
  const pick = <T,>(arr: T[], off = 0) => arr[(seed + off) % arr.length];

  const palette = PALETTES.find((x) => x.id === spec.palette) || pick(PALETTES);
  const layout = spec.layout || pick(LAYOUTS, 3).id;
  const kind = KINDS.find((k) => k.id === spec.kind) || KINDS[0];

  const body = kind.blocks
    .map((b) => (B as Record<string, (p: Palette, d: DocData) => string>)[b]?.(palette, spec.data) || "")
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(spec.data.title || kind.name)}</title>
<style>${css(palette, layout)}</style>
</head><body><div class="page">
${body}
</div></body></html>`;
}

/** Quantos arranjos distintos a combinação permite. */
export function variations(): number {
  return LAYOUTS.length * PALETTES.length * KINDS.length;
}

/* ── Extração de dados do texto livre ─────────────────────────
   A pessoa cola o conteúdo cru e o sistema separa. Sem IA:
   heurística de linha, dois-pontos e marcador.
   ──────────────────────────────────────────────────────────── */

export function parseFreeText(raw: string): DocData {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const data: DocData = { sections: [], items: [], contact: [] };

  let current: { title: string; body: string } | null = null;

  for (const line of lines) {
    // Título de seção: maiúsculas ou terminado em dois-pontos.
    if (/^[A-ZÀ-Ú\s]{4,}$/.test(line) || /^#{1,3}\s/.test(line) || /:$/.test(line)) {
      if (current) data.sections!.push(current);
      current = { title: line.replace(/^#+\s*|:$/g, "").trim(), body: "" };
      continue;
    }
    // Marcador de lista.
    if (/^[-*•]\s/.test(line)) { data.items!.push(line.slice(2)); continue; }
    // Contato.
    if (/@|\bhttps?:|\(\d{2}\)|\d{4,}-\d{4}/.test(line) && line.length < 60) {
      data.contact!.push(line); continue;
    }
    // Primeira linha vira título.
    if (!data.title) { data.title = line; continue; }
    if (!data.summary && line.length > 40) { data.summary = line; continue; }
    if (current) current.body += (current.body ? "\n" : "") + line;
  }
  if (current) data.sections!.push(current);

  if (!data.items!.length) delete data.items;
  if (!data.contact!.length) delete data.contact;
  if (!data.sections!.length) delete data.sections;
  return data;
}
