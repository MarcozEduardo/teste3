/* ══════════════════════════════════════════════════════════════
   FÁBRICA DE DOCUMENTOS — memória de excelência
   ──────────────────────────────────────────────────────────────
   Blocos modulares de HTML/CSS que o Bobby combina para montar
   documentos bonitos e imprimir em PDF. Cada peça é independente:
   escolhendo tema + capa + seções, o resultado sai coeso.
   ══════════════════════════════════════════════════════════════ */

export interface DocTheme {
  id: string; name: string;
  ink: string; accent: string; soft: string; paper: string; muted: string;
  font: string; display: string;
}

export const DOC_THEMES: DocTheme[] = [
  {
    id: "editorial", name: "Editorial", ink: "#1a1a1a", accent: "#c9a227",
    soft: "#faf8f3", paper: "#ffffff", muted: "#6b6b6b",
    font: "'Inter', system-ui, sans-serif", display: "'Syne', sans-serif",
  },
  {
    id: "uva", name: "Uva", ink: "#241536", accent: "#7c3aed",
    soft: "#f6f1fb", paper: "#ffffff", muted: "#6f5f85",
    font: "'Inter', system-ui, sans-serif", display: "'Syne', sans-serif",
  },
  {
    id: "corporativo", name: "Corporativo", ink: "#0f172a", accent: "#2563eb",
    soft: "#f1f5f9", paper: "#ffffff", muted: "#64748b",
    font: "'Inter', system-ui, sans-serif", display: "'Inter', sans-serif",
  },
  {
    id: "natureza", name: "Natureza", ink: "#14261a", accent: "#15803d",
    soft: "#f0f7f1", paper: "#ffffff", muted: "#5c7d66",
    font: "'Inter', system-ui, sans-serif", display: "'Syne', sans-serif",
  },
  {
    id: "grafite", name: "Grafite", ink: "#18181b", accent: "#52525b",
    soft: "#f4f4f5", paper: "#ffffff", muted: "#71717a",
    font: "'Inter', system-ui, sans-serif", display: "'Inter', sans-serif",
  },
];

/** CSS base — tipografia, grid e regras de impressão. */
function baseCss(t: DocTheme): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${t.font};color:${t.ink};background:${t.paper};line-height:1.65;font-size:11pt}
.page{max-width:820px;margin:0 auto;padding:56px 60px}
h1,h2,h3{font-family:${t.display};line-height:1.2;letter-spacing:-.02em}
h1{font-size:30pt;font-weight:800;margin-bottom:8px}
h2{font-size:15pt;font-weight:700;margin:32px 0 12px;padding-bottom:7px;border-bottom:2px solid ${t.accent}22;color:${t.ink}}
h3{font-size:12pt;font-weight:700;margin:20px 0 8px;color:${t.accent}}
p{margin-bottom:11px;text-align:justify;hyphens:auto}
strong{font-weight:600;color:${t.ink}}
a{color:${t.accent};text-decoration:none;border-bottom:1px solid ${t.accent}44}
ul,ol{margin:0 0 14px 20px}
li{margin-bottom:5px}
code{font-family:'Fira Code',ui-monospace,monospace;font-size:9.5pt;background:${t.soft};padding:1px 5px;border-radius:4px;color:${t.accent}}
pre{background:${t.ink};color:#f8f8f2;padding:16px 18px;border-radius:10px;overflow-x:auto;margin:14px 0;font-size:9pt;line-height:1.55}
pre code{background:none;color:inherit;padding:0}
blockquote{border-left:3px solid ${t.accent};padding:8px 0 8px 16px;margin:14px 0;color:${t.muted};font-style:italic}
hr{border:none;border-top:1px solid ${t.ink}14;margin:26px 0}
@media print{
  body{font-size:10.5pt}
  .page{padding:0;max-width:none}
  .no-print{display:none!important}
  h2{break-after:avoid}
  pre,table,.card,.kpi{break-inside:avoid}
  @page{margin:18mm 16mm}
}`;
}

/* ── BLOCOS MODULARES ─────────────────────────────────────────── */

export const BLOCKS = {
  /** Capa com faixa de cor e metadados */
  cover: (t: DocTheme, title: string, subtitle: string, author: string) => `
<header style="margin-bottom:42px">
  <div style="height:5px;width:74px;background:${t.accent};border-radius:99px;margin-bottom:22px"></div>
  <h1>${title}</h1>
  <p style="font-size:13pt;color:${t.muted};margin-bottom:18px;text-align:left">${subtitle}</p>
  <div style="display:flex;gap:18px;font-size:9pt;color:${t.muted};border-top:1px solid ${t.ink}12;padding-top:12px">
    <span><strong style="color:${t.ink}">Autor</strong> · ${author}</span>
    <span><strong style="color:${t.ink}">Data</strong> · ${new Date().toLocaleDateString("pt-BR")}</span>
  </div>
</header>`,

  /** Faixa de indicadores */
  kpis: (t: DocTheme, items: { value: string; label: string }[]) => `
<div style="display:grid;grid-template-columns:repeat(${Math.min(items.length, 4)},1fr);gap:12px;margin:20px 0">
  ${items.map((k) => `
  <div class="kpi" style="background:${t.soft};border-radius:12px;padding:16px 14px;text-align:center">
    <div style="font-family:${t.display};font-size:21pt;font-weight:800;color:${t.accent};line-height:1">${k.value}</div>
    <div style="font-size:8pt;color:${t.muted};text-transform:uppercase;letter-spacing:.08em;margin-top:5px">${k.label}</div>
  </div>`).join("")}
</div>`,

  /** Tabela zebrada com cabeçalho em cor */
  table: (t: DocTheme, head: string[], rows: string[][]) => `
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:9.5pt">
  <thead>
    <tr style="background:${t.accent}">
      ${head.map((h) => `<th style="padding:10px 12px;text-align:left;color:#fff;font-weight:600;font-size:9pt;letter-spacing:.03em">${h}</th>`).join("")}
    </tr>
  </thead>
  <tbody>
    ${rows.map((r, i) => `
    <tr style="background:${i % 2 ? t.soft : "transparent"}">
      ${r.map((c) => `<td style="padding:9px 12px;border-bottom:1px solid ${t.ink}0d">${c}</td>`).join("")}
    </tr>`).join("")}
  </tbody>
</table>`,

  /** Cartões lado a lado */
  cards: (t: DocTheme, items: { title: string; text: string }[]) => `
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:16px 0">
  ${items.map((c) => `
  <div class="card" style="border:1px solid ${t.ink}12;border-left:3px solid ${t.accent};border-radius:10px;padding:14px 16px">
    <div style="font-family:${t.display};font-weight:700;font-size:11pt;margin-bottom:5px">${c.title}</div>
    <div style="font-size:9.5pt;color:${t.muted};line-height:1.55">${c.text}</div>
  </div>`).join("")}
</div>`,

  /** Linha do tempo vertical */
  timeline: (t: DocTheme, items: { when: string; what: string; desc: string }[]) => `
<div style="margin:18px 0;padding-left:18px;border-left:2px solid ${t.accent}33">
  ${items.map((s) => `
  <div style="position:relative;margin-bottom:18px">
    <div style="position:absolute;left:-25px;top:4px;width:11px;height:11px;border-radius:50%;background:${t.accent};border:2px solid ${t.paper}"></div>
    <div style="font-size:8pt;color:${t.accent};font-weight:700;text-transform:uppercase;letter-spacing:.07em">${s.when}</div>
    <div style="font-weight:600;margin:2px 0 3px">${s.what}</div>
    <div style="font-size:9.5pt;color:${t.muted}">${s.desc}</div>
  </div>`).join("")}
</div>`,

  /** Destaque em caixa */
  callout: (t: DocTheme, title: string, text: string) => `
<div style="background:${t.soft};border-radius:12px;padding:18px 20px;margin:18px 0;border:1px solid ${t.accent}22">
  <div style="font-family:${t.display};font-weight:700;color:${t.accent};margin-bottom:6px;font-size:11pt">${title}</div>
  <div style="font-size:10pt;color:${t.ink};line-height:1.6">${text}</div>
</div>`,

  /** Barras de proporção */
  bars: (t: DocTheme, items: { label: string; pct: number }[]) => `
<div style="margin:16px 0">
  ${items.map((b) => `
  <div style="margin-bottom:11px">
    <div style="display:flex;justify-content:space-between;font-size:9.5pt;margin-bottom:4px">
      <span style="font-weight:500">${b.label}</span><span style="color:${t.accent};font-weight:700">${b.pct}%</span>
    </div>
    <div style="height:7px;background:${t.soft};border-radius:99px;overflow:hidden">
      <div style="height:100%;width:${b.pct}%;background:linear-gradient(90deg,${t.accent},${t.accent}aa);border-radius:99px"></div>
    </div>
  </div>`).join("")}
</div>`,

  /** Assinatura de rodapé */
  footer: (t: DocTheme, note: string) => `
<footer style="margin-top:40px;padding-top:14px;border-top:1px solid ${t.ink}12;font-size:8.5pt;color:${t.muted};display:flex;justify-content:space-between">
  <span>${note}</span>
  <span>Gerado por Bobby · Render Nexus</span>
</footer>`,
};

export interface DocSpec {
  theme?: string;
  title: string;
  subtitle?: string;
  author?: string;
  /** HTML já montado com os blocos, ou markdown simples. */
  body: string;
  footer?: string;
}

/** Monta o documento completo pronto para impressão. */
export function buildDoc(spec: DocSpec): string {
  const t = DOC_THEMES.find((x) => x.id === spec.theme) || DOC_THEMES[0];
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>${spec.title}</title>
<style>${baseCss(t)}</style>
</head><body><div class="page">
${BLOCKS.cover(t, spec.title, spec.subtitle || "", spec.author || "Marcos Eduardo")}
${spec.body}
${BLOCKS.footer(t, spec.footer || spec.title)}
</div></body></html>`;
}

/** Converte markdown enxuto em HTML com as classes do tema. */
export function mdToHtml(md: string, themeId = "editorial"): string {
  const t = DOC_THEMES.find((x) => x.id === themeId) || DOC_THEMES[0];
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false, inCode = false;

  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };

  for (const raw of lines) {
    const l = raw.trimEnd();
    if (l.startsWith("```")) {
      if (inCode) { out.push("</code></pre>"); inCode = false; }
      else { closeList(); out.push("<pre><code>"); inCode = true; }
      continue;
    }
    if (inCode) { out.push(l.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))); continue; }

    if (/^###\s+/.test(l)) { closeList(); out.push(`<h3>${inline(l.slice(4))}</h3>`); continue; }
    if (/^##\s+/.test(l)) { closeList(); out.push(`<h2>${inline(l.slice(3))}</h2>`); continue; }
    if (/^#\s+/.test(l)) { closeList(); out.push(`<h2>${inline(l.slice(2))}</h2>`); continue; }
    if (/^>\s+/.test(l)) { closeList(); out.push(`<blockquote>${inline(l.slice(2))}</blockquote>`); continue; }
    if (/^[-*]\s+/.test(l)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(l.slice(2))}</li>`); continue;
    }
    if (/^---+$/.test(l)) { closeList(); out.push("<hr>"); continue; }
    if (!l.trim()) { closeList(); continue; }
    closeList();
    out.push(`<p>${inline(l)}</p>`);
  }
  closeList();
  if (inCode) out.push("</code></pre>");
  void t;
  return out.join("\n");
}

function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/** Abre a janela de impressão do navegador — vira PDF pelo "Salvar como PDF". */
export function printDocument(html: string): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => setTimeout(() => w.print(), 400);
}
