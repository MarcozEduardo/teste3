/* ══════════════════════════════════════════════════════════════
   PULSO ETERNO · FÁBRICA DE SITES
   ──────────────────────────────────────────────────────────────
   Três arquétipos de página, cada um com as mesmas cinco paletas
   dos documentos. Autocontidos: um arquivo, sem dependência.

   Serve para entregar protótipo na hora, sem IA. Se a pessoa
   reclamar do resultado, aí sim vale chamar o modelo.
   ══════════════════════════════════════════════════════════════ */

import { PALETTES, type Palette } from "./docFactory";

export type SiteKind = "landing" | "portfolio" | "produto";

export const SITE_KINDS: { id: SiteKind; name: string; hint: string }[] = [
  { id: "landing",   name: "Landing",   hint: "Uma dobra, foco em conversão" },
  { id: "portfolio", name: "Portfólio", hint: "Grade de trabalhos com bio" },
  { id: "produto",   name: "Produto",   hint: "Recursos, preço e chamada" },
];

export interface SiteData {
  title?: string;
  tagline?: string;
  about?: string;
  cta?: string;
  items?: { title: string; text: string }[];
  contact?: string[];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function shell(p: Palette, title: string, body: string, extra = ""): string {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--ink:${p.ink};--acc:${p.accent};--soft:${p.soft};--line:${p.line};--muted:${p.muted}}
html{scroll-behavior:smooth}
body{font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.65;font-size:16px}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
h1,h2,h3{font-family:'Syne',sans-serif;letter-spacing:-.02em;line-height:1.12}
a{color:inherit;text-decoration:none}
nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;align-items:center;justify-content:space-between;height:66px}
.logo{display:flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-weight:800;font-size:18px}
.logo i{width:28px;height:28px;border-radius:9px;background:var(--acc);display:block}
nav ul{display:flex;gap:26px;list-style:none;font-size:14px;color:var(--muted)}
nav a:hover{color:var(--acc)}
.btn{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:99px;
  background:var(--ink);color:#fff;font-weight:600;font-size:15px;transition:.2s}
.btn:hover{background:var(--acc);transform:translateY(-2px)}
.btn.ghost{background:transparent;color:var(--ink);border:1.5px solid var(--line)}
.btn.ghost:hover{border-color:var(--acc);color:var(--acc);background:transparent}
footer{border-top:1px solid var(--line);padding:44px 0;margin-top:90px;color:var(--muted);font-size:14px}
footer .wrap{display:flex;flex-wrap:wrap;gap:18px;justify-content:space-between}
@media(max-width:760px){nav ul{display:none}h1{font-size:34px!important}}
${extra}
</style></head><body>
${body}
</body></html>`;
}

export function buildSite(kind: SiteKind, data: SiteData, paletteId?: string, seed = Date.now()): string {
  const p = PALETTES.find((x) => x.id === paletteId) || PALETTES[seed % PALETTES.length];
  const title = data.title || "Projeto";
  const tagline = data.tagline || "Uma frase curta que explica o que é isso.";
  const about = data.about || "Descrição do trabalho, do serviço ou do produto.";
  const cta = data.cta || "Começar agora";
  const items = data.items?.length ? data.items : [
    { title: "Primeiro ponto", text: "O que torna isso diferente do resto." },
    { title: "Segundo ponto", text: "Como funciona na prática, sem enrolação." },
    { title: "Terceiro ponto", text: "O resultado que a pessoa leva daqui." },
  ];
  const contact = data.contact?.length ? data.contact : ["contato@exemplo.com"];

  const nav = `
<nav><div class="wrap">
  <span class="logo"><i></i>${esc(title)}</span>
  <ul>
    <li><a href="#sobre">Sobre</a></li>
    <li><a href="#itens">Destaques</a></li>
    <li><a href="#contato">Contato</a></li>
  </ul>
  <a href="#contato" class="btn">${esc(cta)}</a>
</div></nav>`;

  const rodape = `
<footer id="contato"><div class="wrap">
  <span>© ${new Date().getFullYear()} ${esc(title)}</span>
  <span>${contact.map(esc).join(" · ")}</span>
</div></footer>`;

  if (kind === "landing") {
    return shell(p, title, `${nav}
<header class="hero"><div class="wrap">
  <span class="tag">Novo</span>
  <h1>${esc(tagline)}</h1>
  <p>${esc(about)}</p>
  <div class="acts">
    <a href="#contato" class="btn">${esc(cta)}</a>
    <a href="#itens" class="btn ghost">Ver detalhes</a>
  </div>
</div></header>

<section id="itens" class="grid"><div class="wrap">
  <div class="cards">
    ${items.map((i, n) => `
    <article class="card">
      <span class="num">${String(n + 1).padStart(2, "0")}</span>
      <h3>${esc(i.title)}</h3>
      <p>${esc(i.text)}</p>
    </article>`).join("")}
  </div>
</div></section>

<section id="sobre" class="faixa"><div class="wrap">
  <h2>${esc(title)}</h2>
  <p>${esc(about)}</p>
  <a href="#contato" class="btn">${esc(cta)}</a>
</div></section>
${rodape}`, `
.hero{padding:110px 0 90px;background:linear-gradient(170deg,var(--soft),#fff)}
.tag{display:inline-block;padding:5px 14px;border-radius:99px;background:var(--acc);color:#fff;
  font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:22px}
.hero h1{font-size:58px;max-width:16ch;margin-bottom:20px}
.hero p{font-size:19px;color:var(--muted);max-width:52ch;margin-bottom:34px}
.acts{display:flex;gap:12px;flex-wrap:wrap}
.grid{padding:70px 0}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px}
.card{padding:30px 26px;border-radius:18px;background:var(--soft);border:1px solid var(--line);transition:.22s}
.card:hover{transform:translateY(-4px);box-shadow:0 18px 44px rgba(0,0,0,.08)}
.num{font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--acc)}
.card h3{font-size:20px;margin:10px 0 8px}
.card p{color:var(--muted);font-size:15px}
.faixa{padding:80px 0;background:var(--ink);color:#fff;text-align:center}
.faixa h2{font-size:38px;margin-bottom:14px}
.faixa p{max-width:54ch;margin:0 auto 28px;opacity:.75}
.faixa .btn{background:var(--acc)}`);
  }

  if (kind === "portfolio") {
    return shell(p, title, `${nav}
<header class="intro"><div class="wrap">
  <div class="avatar"></div>
  <h1>${esc(title)}</h1>
  <p>${esc(tagline)}</p>
</div></header>

<section id="itens" class="obras"><div class="wrap">
  <h2>Trabalhos</h2>
  <div class="masonry">
    ${items.map((i, n) => `
    <article class="obra ${n % 3 === 0 ? "tall" : ""}">
      <div class="thumb"></div>
      <h3>${esc(i.title)}</h3>
      <p>${esc(i.text)}</p>
    </article>`).join("")}
  </div>
</div></section>

<section id="sobre" class="bio"><div class="wrap">
  <h2>Sobre</h2>
  <p>${esc(about)}</p>
</div></section>
${rodape}`, `
.intro{padding:90px 0 60px;text-align:center}
.avatar{width:96px;height:96px;border-radius:28px;margin:0 auto 24px;
  background:linear-gradient(140deg,var(--acc),var(--ink))}
.intro h1{font-size:46px;margin-bottom:10px}
.intro p{font-size:18px;color:var(--muted);max-width:46ch;margin:0 auto}
.obras{padding:50px 0}
.obras h2,.bio h2{font-size:15px;text-transform:uppercase;letter-spacing:.14em;
  color:var(--muted);margin-bottom:26px}
.masonry{columns:3;column-gap:20px}
.obra{break-inside:avoid;margin-bottom:20px;padding:18px;border-radius:16px;
  background:var(--soft);border:1px solid var(--line);transition:.22s}
.obra:hover{transform:translateY(-3px);box-shadow:0 16px 38px rgba(0,0,0,.09)}
.thumb{height:150px;border-radius:11px;margin-bottom:14px;
  background:linear-gradient(140deg,var(--acc),var(--ink));opacity:.85}
.obra.tall .thumb{height:220px}
.obra h3{font-size:18px;margin-bottom:6px}
.obra p{font-size:14px;color:var(--muted)}
.bio{padding:60px 0;border-top:1px solid var(--line)}
.bio p{font-size:18px;max-width:60ch;line-height:1.8}
@media(max-width:900px){.masonry{columns:2}}
@media(max-width:600px){.masonry{columns:1}}`);
  }

  // produto
  return shell(p, title, `${nav}
<header class="topo"><div class="wrap">
  <div class="topo-txt">
    <h1>${esc(tagline)}</h1>
    <p>${esc(about)}</p>
    <a href="#contato" class="btn">${esc(cta)}</a>
  </div>
  <div class="mock"><span></span><span></span><span></span></div>
</div></header>

<section id="itens" class="recursos"><div class="wrap">
  ${items.map((i) => `
  <article class="rec">
    <span class="dot"></span>
    <div><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>
  </article>`).join("")}
</div></section>

<section id="sobre" class="preco"><div class="wrap">
  <div class="plano">
    <span class="plano-tag">Plano único</span>
    <b>Sob consulta</b>
    <p>${esc(about)}</p>
    <a href="#contato" class="btn">${esc(cta)}</a>
  </div>
</div></section>
${rodape}`, `
.topo{padding:80px 0}
.topo .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:50px;align-items:center}
.topo h1{font-size:46px;margin-bottom:18px}
.topo p{font-size:17px;color:var(--muted);margin-bottom:28px}
.mock{background:var(--soft);border:1px solid var(--line);border-radius:18px;
  padding:20px;display:flex;flex-direction:column;gap:12px;min-height:250px}
.mock span{height:14px;border-radius:99px;background:var(--acc);opacity:.28}
.mock span:nth-child(2){width:70%;opacity:.5}
.mock span:nth-child(3){width:45%;opacity:.75}
.recursos{padding:60px 0}
.recursos .wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:26px}
.rec{display:flex;gap:14px}
.dot{width:11px;height:11px;border-radius:50%;background:var(--acc);flex-shrink:0;margin-top:7px}
.rec h3{font-size:18px;margin-bottom:5px}
.rec p{color:var(--muted);font-size:15px}
.preco{padding:70px 0}
.plano{max-width:460px;margin:0 auto;padding:44px 36px;text-align:center;
  border-radius:22px;background:var(--soft);border:1px solid var(--line)}
.plano-tag{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}
.plano b{display:block;font-family:'Syne',sans-serif;font-size:38px;margin:12px 0 14px}
.plano p{color:var(--muted);margin-bottom:26px;font-size:15px}
@media(max-width:840px){.topo .wrap{grid-template-columns:1fr}}`);
}

export function siteVariations(): number {
  return SITE_KINDS.length * PALETTES.length;
}
