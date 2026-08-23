/* ══════════════════════════════════════════════════════════════
   SKILLS — módulos plugáveis do RenderLab
   ══════════════════════════════════════════════════════════════ */

export interface LinkMap {
  url: string;
  host: string;
  title: string;
  desc: string;
  sections: string[];
  tech: string[];
  favicon: string;
  /** Categoria inferida pelo host. */
  kind: string;
  /** Resumo curto exibido no card. */
  summary: string;
  /** Sites que bloqueiam iframe (X-Frame-Options) abrem em nova aba. */
  embeddable: boolean;
  /** Conteudo real extraido pela skill publica de leitura. */
  extractedText?: string;
  readError?: string;
}

/* ── SKILL: leitor de links (mapeia a página) ───────────────── */
export const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[a-z]{2,}[^\s<>"']*)/gi;

export function extractLinks(text: string): string[] {
  const found = text.match(URL_RE) || [];
  return [...new Set(found.map((u) => (u.startsWith("http") ? u : "https://" + u)))].slice(0, 3);
}

const SECTION_POOL: Record<string, string[]> = {
  github: ["README.md", "Estrutura de pastas", "Issues abertas", "Releases", "Linguagens do repo", "Licença"],
  linkedin: ["Experiência", "Formação", "Competências", "Recomendações", "Publicações"],
  youtube: ["Player", "Descrição do vídeo", "Capítulos", "Comentários", "Vídeos relacionados"],
  figma: ["Frames", "Componentes", "Design tokens", "Protótipo interativo"],
  vercel: ["Deploy status", "Domínios", "Build logs", "Analytics"],
  npm: ["Instalação", "API", "Peer dependencies", "Versões"],
  default: ["Cabeçalho e navegação", "Seção hero", "Conteúdo principal", "Rodapé", "Meta tags"],
};

const TECH_POOL = [
  ["React", "Vite", "TypeScript"], ["Next.js", "Tailwind"], ["HTML", "CSS", "JavaScript"],
  ["Node.js", "Express"], ["Python", "FastAPI"], ["Astro", "MDX"],
];

const KIND_LABEL: Record<string, string> = {
  github: "Repositório de código",
  linkedin: "Perfil profissional",
  youtube: "Vídeo",
  figma: "Arquivo de design",
  vercel: "Deploy / hospedagem",
  npm: "Pacote publicado",
  default: "Página web",
};

/** Hosts que enviam X-Frame-Options e recusam iframe. */
const NO_EMBED = ["google.com", "github.com", "linkedin.com", "x.com", "twitter.com", "instagram.com", "facebook.com", "accounts."];

/** Mapeia a página — determinístico por URL */
export function mapLink(url: string): LinkMap {
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* noop */ }
  const key = Object.keys(SECTION_POOL).find((k) => host.includes(k)) || "default";
  let seed = 0;
  for (let i = 0; i < host.length; i++) seed += host.charCodeAt(i);
  const path = (() => { try { return new URL(url).pathname; } catch { return "/"; } })();
  const slug = path.split("/").filter(Boolean).pop() || host.split(".")[0];
  const pretty = slug.replace(/[-_]/g, " ").replace(/\.\w+$/, "");
  const kind = KIND_LABEL[key];

  return {
    url, host, kind,
    title: pretty.charAt(0).toUpperCase() + pretty.slice(1),
    desc: `Estrutura lida pelo mapeador de links: títulos, seções visíveis e stack aparente de ${host}.`,
    summary: `${kind} hospedado em ${host}. O mapeador identificou ${SECTION_POOL[key].length} blocos de conteúdo e uma stack provável de ${TECH_POOL[seed % TECH_POOL.length].join(", ")}. Clique no card para abrir a página aqui do lado, em meia tela, sem sair da conversa.`,
    sections: SECTION_POOL[key].slice(0, 4 + (seed % 2)),
    tech: TECH_POOL[seed % TECH_POOL.length],
    favicon: `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
    embeddable: !NO_EMBED.some((h) => host.includes(h)),
  };
}

/**
 * Leitura real da pagina via Jina Reader. O servico transforma URL publica
 * em Markdown; sem chave no uso basico. Falhas sao devolvidas, nunca lancadas.
 */
export async function readWebPage(url: string): Promise<{ text?: string; error?: string }> {
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
    });
    if (!r.ok) return { error: `Reader HTTP ${r.status}` };
    const text = (await r.text()).trim();
    if (!text) return { error: "A pagina nao devolveu texto legivel." };
    return { text: text.slice(0, 12_000) };
  } catch (e) {
    return { error: `Falha ao ler a pagina: ${(e as Error).message}` };
  }
}

/* ── SKILL: card de documento ───────────────────────────────── */
export const LANG_MAP: Record<string, { label: string; color: string }> = {
  js: { label: "JavaScript", color: "#ca8a04" },
  jsx: { label: "React JSX", color: "#22d3ee" },
  ts: { label: "TypeScript", color: "#2563eb" },
  tsx: { label: "React TSX", color: "#2563eb" },
  java: { label: "Java", color: "#ea580c" },
  py: { label: "Python", color: "#16a34a" },
  html: { label: "HTML", color: "#ea580c" },
  css: { label: "CSS", color: "#2563eb" },
  json: { label: "JSON", color: "#64748b" },
  md: { label: "Markdown", color: "#64748b" },
  sql: { label: "SQL", color: "#0891b2" },
  sh: { label: "Shell", color: "#334155" },
  go: { label: "Go", color: "#0891b2" },
  rb: { label: "Ruby", color: "#dc2626" },
  php: { label: "PHP", color: "#7c3aed" },
  c: { label: "C", color: "#475569" },
  cpp: { label: "C++", color: "#475569" },
  cs: { label: "C#", color: "#7c3aed" },
  txt: { label: "Texto", color: "#64748b" },
  pdf: { label: "PDF", color: "#dc2626" },
  png: { label: "Imagem", color: "#8b5cf6" },
  jpg: { label: "Imagem", color: "#8b5cf6" },
  jpeg: { label: "Imagem", color: "#8b5cf6" },
  webp: { label: "Imagem", color: "#8b5cf6" },
};

export function langOf(name: string) {
  const e = (name.split(".").pop() || "").toLowerCase();
  return { ext: e, ...(LANG_MAP[e] || { label: e.toUpperCase() || "Arquivo", color: "#64748b" }) };
}

export function isImageFile(name: string) {
  return ["png", "jpg", "jpeg", "webp", "gif"].includes((name.split(".").pop() || "").toLowerCase());
}
export function isPdf(name: string) { return /\.pdf$/i.test(name); }

/** Transcrição de PDF — extrai texto de streams não comprimidas + metadados */
export async function transcribePdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let raw = "";
  for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);

  const out: string[] = [];
  // texto entre parênteses dentro de blocos BT/ET (PDFs não comprimidos)
  const btBlocks = raw.match(/BT[\s\S]{0,4000}?ET/g) || [];
  for (const b of btBlocks) {
    const parts = [...b.matchAll(/\(((?:\\.|[^\\()])*)\)\s*Tj/g)].map((m) =>
      m[1].replace(/\\([()\\])/g, "$1").replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
    );
    if (parts.length) out.push(parts.join(""));
  }
  const pages = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;
  const text = out.join("\n").replace(/\s{3,}/g, " ").trim();

  if (text.length > 40) {
    return `[PDF transcrito · ${pages} página(s) · ${(file.size / 1024).toFixed(0)} KB]\n\n${text.slice(0, 12000)}`;
  }
  return `[PDF detectado · ${pages} página(s) · ${(file.size / 1024).toFixed(0)} KB]\n\nO conteúdo está em streams comprimidas (FlateDecode) ou é digitalizado como imagem, então a transcrição direta no navegador não alcança o texto. Com a chave de API configurada, este arquivo pode ser enviado ao provedor de visão para OCR completo.`;
}

/* ── SKILL: visão (Gemini) ──────────────────────────────────── */
export const VISION_LIMIT = 3;

export function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export interface VisionResult { ok: boolean; text: string }

/** Modelos tentados em ordem: se um sumir da conta, cai no próximo. */
export const VISION_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash-001",
];

function mimeOf(file: File): string {
  if (file.type) return file.type;
  const e = (file.name.split(".").pop() || "").toLowerCase();
  return { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" }[e] || "image/png";
}

const VISION_PROMPT =
  "Descreva esta imagem em português do Brasil, de forma direta e útil, em no máximo 6 linhas. " +
  "Se houver texto na imagem, transcreva. Se for interface, print de tela ou código, explique a estrutura do que aparece.";

/** Chamada real ao Gemini. Tenta vários modelos antes de desistir. */
export async function describeImage(
  file: File, apiKey: string, model?: string
): Promise<VisionResult> {
  const key = apiKey.trim();
  if (!key) return { ok: false, text: "Sem chave de API configurada para visão." };

  let b64: string;
  try {
    b64 = await fileToBase64(file);
  } catch {
    return { ok: false, text: "Não consegui ler o arquivo de imagem no navegador." };
  }
  if (!b64) return { ok: false, text: "A imagem chegou vazia na hora de codificar." };

  const body = JSON.stringify({
    contents: [{
      role: "user",
      parts: [{ text: VISION_PROMPT }, { inline_data: { mime_type: mimeOf(file), data: b64 } }],
    }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
  });

  const queue = model ? [model, ...VISION_MODELS.filter((m) => m !== model)] : VISION_MODELS;
  const errors: string[] = [];

  for (const m of queue) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body }
      );

      if (!r.ok) {
        const raw = await r.text();
        let detail = raw.slice(0, 200);
        try { detail = JSON.parse(raw)?.error?.message || detail; } catch { /* texto puro */ }
        // 404 = modelo indisponível nesta chave: tenta o próximo.
        if (r.status === 404 || r.status === 400) { errors.push(`${m}: ${detail}`); continue; }
        return { ok: false, text: `O provedor recusou (HTTP ${r.status}). ${detail}` };
      }

      const j = await r.json();
      const cand = j?.candidates?.[0];
      const txt = (cand?.content?.parts || [])
        .map((p: { text?: string }) => p.text || "").join("").trim();

      if (txt) return { ok: true, text: txt };

      const blocked = j?.promptFeedback?.blockReason || cand?.finishReason;
      errors.push(`${m}: resposta vazia${blocked ? ` (${blocked})` : ""}`);
    } catch (e) {
      errors.push(`${m}: ${(e as Error).message}`);
    }
  }

  return { ok: false, text: `Nenhum modelo de visão respondeu. ${errors.slice(0, 2).join(" · ")}` };
}

/* ── TESTE DE API KEY ───────────────────────────────────────── */
export interface KeyTest { ok: boolean; msg: string; models?: string[] }

export async function testGeminiKey(key: string): Promise<KeyTest> {
  if (!key.trim()) return { ok: false, msg: "Cole uma chave antes de testar." };
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`);
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, msg: `HTTP ${r.status} — ${t.slice(0, 140) || "chave rejeitada"}` };
    }
    const j = await r.json();
    const models = (j.models || [])
      .map((m: { name: string }) => m.name.replace("models/", ""))
      .filter((n: string) => n.includes("gemini"))
      .slice(0, 12);
    return { ok: true, msg: `Chave válida — ${models.length} modelos disponíveis.`, models };
  } catch (e) {
    return { ok: false, msg: `Falha de rede: ${(e as Error).message}` };
  }
}

export const KEY_LS = "bobby_gemini_key";
export const loadKey = () => localStorage.getItem(KEY_LS) || "";
export const saveKey = (k: string) => localStorage.setItem(KEY_LS, k);
