export interface WebSearchConfig {
  apiKey: string;
  cx: string;
}

export interface WebResult {
  title: string;
  link: string;
  snippet: string;
  host: string;
  favicon: string;
}

const KEY = "bobby_google_search";

export function loadWebSearch(): WebSearchConfig {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || "null");
    return { apiKey: x?.apiKey || "", cx: x?.cx || "" };
  } catch { return { apiKey: "", cx: "" }; }
}

export function saveWebSearch(c: WebSearchConfig): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(c)); return true; }
  catch { return false; }
}

export async function googleSearch(query: string, cfg = loadWebSearch()): Promise<WebResult[]> {
  if (!cfg.apiKey || !cfg.cx)
    throw new Error("Configure a chave do Google e o Search Engine ID (CX) no botao API.");
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", cfg.apiKey);
  url.searchParams.set("cx", cfg.cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "3");
  url.searchParams.set("safe", "active");
  const r = await fetch(url);
  if (!r.ok) {
    const raw = await r.text();
    let message = raw.slice(0, 180);
    try { message = JSON.parse(raw)?.error?.message || message; } catch { /* texto */ }
    throw new Error(`Google Search HTTP ${r.status}: ${message}`);
  }
  const j = await r.json();
  return (j.items || []).slice(0, 3).map((x: { title: string; link: string; snippet?: string }) => {
    let host = x.link;
    try { host = new URL(x.link).hostname.replace(/^www\./, ""); } catch { /* noop */ }
    return {
      title: x.title,
      link: x.link,
      snippet: x.snippet || "Sem resumo disponivel.",
      host,
      favicon: `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
    };
  });
}