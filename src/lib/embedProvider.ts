/* ══════════════════════════════════════════════════════════════
   PROVEDOR DE EMBEDDINGS — local ou via API
   ──────────────────────────────────────────────────────────────
   Camada única de troca: o RAG não sabe de onde vem o vetor.
   Se a API falhar, cai automaticamente no motor local.
   ══════════════════════════════════════════════════════════════ */

export type EmbedProviderId = "local" | "gemini" | "openai" | "custom";

export interface EmbedConfig {
  provider: EmbedProviderId;
  model: string;
  /** Para provider "custom": POST {input, model} → {embedding: number[]} */
  endpoint: string;
  apiKey: string;
  dim: number;
  fallbackLocal: boolean;
}

export const DEFAULT_EMBED: EmbedConfig = {
  provider: "local",
  model: "text-embedding-004",
  endpoint: "",
  apiKey: "",
  dim: 512,
  fallbackLocal: true,
};

export const EMBED_LS = "bobby_embed_cfg";

export function loadEmbedConfig(): EmbedConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(EMBED_LS) || "null");
    if (raw && typeof raw === "object") return { ...DEFAULT_EMBED, ...raw };
  } catch { localStorage.removeItem(EMBED_LS); }
  return { ...DEFAULT_EMBED };
}

export function saveEmbedConfig(cfg: EmbedConfig): boolean {
  try { localStorage.setItem(EMBED_LS, JSON.stringify(cfg)); return true; }
  catch { return false; }
}

export interface RemoteResult { ok: boolean; vector?: number[]; error?: string }

/** Chamada remota de embedding. Devolve erro em vez de lançar. */
export async function remoteEmbed(text: string, cfg: EmbedConfig): Promise<RemoteResult> {
  const input = text.slice(0, 8000);
  try {
    if (cfg.provider === "gemini") {
      if (!cfg.apiKey) return { ok: false, error: "Sem chave para o Gemini." };
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:embedContent?key=${cfg.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: `models/${cfg.model}`, content: { parts: [{ text: input }] } }),
        }
      );
      if (!r.ok) return { ok: false, error: `HTTP ${r.status} — ${(await r.text()).slice(0, 120)}` };
      const j = await r.json();
      const v = j?.embedding?.values;
      return Array.isArray(v) ? { ok: true, vector: v } : { ok: false, error: "Resposta sem vetor." };
    }

    if (cfg.provider === "openai") {
      if (!cfg.apiKey) return { ok: false, error: "Sem chave para a OpenAI." };
      const r = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({ model: cfg.model, input }),
      });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status} — ${(await r.text()).slice(0, 120)}` };
      const j = await r.json();
      const v = j?.data?.[0]?.embedding;
      return Array.isArray(v) ? { ok: true, vector: v } : { ok: false, error: "Resposta sem vetor." };
    }

    if (cfg.provider === "custom") {
      if (!cfg.endpoint) return { ok: false, error: "Endpoint não configurado." };
      const r = await fetch(cfg.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
        },
        body: JSON.stringify({ input, model: cfg.model }),
      });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status} — ${(await r.text()).slice(0, 120)}` };
      const j = await r.json();
      const v = j?.embedding || j?.vector || j?.data?.[0]?.embedding;
      return Array.isArray(v) ? { ok: true, vector: v } : { ok: false, error: "Formato inesperado. Esperado { embedding: number[] }." };
    }

    return { ok: false, error: "Provedor local não usa rede." };
  } catch (e) {
    return { ok: false, error: `Falha de rede: ${(e as Error).message}` };
  }
}

export async function testEmbedConfig(cfg: EmbedConfig): Promise<{ ok: boolean; msg: string }> {
  if (cfg.provider === "local")
    return { ok: true, msg: "Motor local ativo — 512d, sem custo e sem rede." };
  const r = await remoteEmbed("teste de conexão do Render Nexus", cfg);
  if (!r.ok) return { ok: false, msg: r.error || "Falha desconhecida." };
  return { ok: true, msg: `Conectado — vetor de ${r.vector!.length} dimensões recebido.` };
}
