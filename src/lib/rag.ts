/* ══════════════════════════════════════════════════════════════
   RAG + EMBEDDINGS — vector store local
   ──────────────────────────────────────────────────────────────
   • chunking com overlap
   • embedding local (hashing vectorizer + TF-IDF) → 100% offline
   • similaridade de cosseno + MMR (diversidade)
   • injeção de conteúdo via UI, persistida em localStorage
   • PRONTO PARA EMBEDDING REAL: veja `embed()` — basta trocar o
     corpo por um fetch (OpenAI / Gemini / Voyage) devolvendo
     number[]. Todo o resto do pipeline continua idêntico.
   ══════════════════════════════════════════════════════════════ */

export interface RagDoc {
  id: string;
  title: string;
  tags: string[];
  body: string;
  origin: "core" | "user";
  createdAt: number;
}

export interface RagChunk {
  id: string;
  docId: string;
  title: string;
  text: string;
  origin: "core" | "user";
  vec: Float32Array;
}

export interface Retrieved {
  text: string;
  title: string;
  docId: string;
  score: number;
}

import { loadEmbedConfig, remoteEmbed, type EmbedConfig } from "./embedProvider";
import { toolsDoc } from "./tools";

const DIM = 512;
const LS_KEY = "bobby_rag_docs";
const MAX_DOC_CHARS = 250_000;
const MAX_USER_CORPUS_CHARS = 1_500_000;

/* ── corpus base ─────────────────────────────────────────────── */
export const CORE_DOCS: RagDoc[] = [
  {
    id: "nexus", title: "Render Nexus — a casca do chat", origin: "core", createdAt: 0,
    tags: ["nexus", "chat", "widget", "layout", "interface", "portfolio"],
    body: `O Render Nexus é a casca do chat. Ele vive em dois estados: widget flutuante, discreto no canto da tela, e expandido, ocupando tudo. No modo expandido existem três layouts: fullscreen, noventa por cento e centered.
Existem duas formas de chegar aqui. A primeira é pela página inicial do portfólio: a pessoa digita a pergunta lá na home e a mensagem viaja junto com a navegação, chegando já enviada dentro deste chat. A segunda é pelo balãozinho flutuante: a pessoa está navegando pelo portfólio, bate na cabeça do Bobby no canto da tela e o widget abre por cima do conteúdo, sem tirar ela da página. É por isso que existe a versão janelinha no desktop.
O widget aceita parâmetros de URL: expanded abre já grande e msg envia a primeira mensagem automaticamente.`,
  },
  {
    id: "sentinela", title: "Sentinela — firewall de entrada", origin: "core", createdAt: 0,
    tags: ["sentinela", "firewall", "seguranca", "moderacao", "filtro", "injection"],
    body: `O Sentinela é a IA guardiã do chat. Ele não responde ao usuário: ele filtra. Toda mensagem passa por ele antes de chegar ao modelo.
O trabalho é triplo. Primeiro barrar o impróprio: ofensa, palavrão, conteúdo tóxico. Segundo, segurar o que é ruído, texto sem sentido de teclado amassado, arrogância e tentativas de manipular o sistema como prompt injection. Terceiro, e mais importante, montar o pacote: quando a mensagem é legítima, ele anexa os trechos recuperados da base, o histórico relevante e as instruções de persona, e só então entrega para a geração.
Por isso ele é firewall e não censor: filtra na entrada e enriquece na saída. O ponto verde no rodapé indica que está ativo.`,
  },
  {
    id: "gallerybob", title: "GalleryBob — explorador de arquivos", origin: "core", createdAt: 0,
    tags: ["galeria", "arquivos", "documentos", "prototipos", "explorer", "pasta"],
    body: `A GalleryBob é o painel direito e funciona como uma pasta do Windows dentro da conversa. Os pacotes de código e documentos que a pessoa envia ficam organizados ali, com ícone por extensão, data e busca.
As pastas são: Documentos, com o que o visitante anexa; DEV Protótipos, com os blocos de código que o Bobby gera; DEV Confirmados, com o que foi aprovado; Mensagens Curtidas, onde ficam as respostas que o usuário marcou com like; e Chats Deletados, que preserva as conversas apagadas no painel esquerdo.
A regra de ouro é que a curtida é uma cópia soberana: apagar o chat de origem não remove a mensagem curtida. Ela só sai se for removida na própria pasta.`,
  },
  {
    id: "renderlab", title: "RenderLab — motor de skills", origin: "core", createdAt: 0,
    tags: ["renderlab", "skills", "plugins", "configuracao", "motor"],
    body: `O RenderLab é onde as skills do Bobby são criadas. Skill é um módulo que configura o comportamento: uma liga a busca na base, outra o gerador de protótipos, outra o leitor de links, outra o cartão de documentos, outra a visão de imagens.
O ponto central é que o usuário consegue desativar qualquer skill. Isso deixa o sistema auditável: dá para mostrar ao vivo como a resposta muda quando se desliga o RAG ou o firewall. É a diferença entre dizer que usa IA e demonstrar a orquestração acontecendo.`,
  },
  {
    id: "rag", title: "RAG e embeddings", origin: "core", createdAt: 0,
    tags: ["rag", "embeddings", "vetor", "busca", "semantica", "cosseno"],
    body: `O Bobby responde sobre os projetos usando recuperação de contexto. Os documentos são quebrados em trechos com sobreposição, cada trecho vira um vetor, a pergunta também vira vetor e a similaridade de cosseno decide o que entra no contexto.
Nesta build o vetor é calculado localmente por hashing vectorizer com pesos TF-IDF, sem chamada de API. A matemática de recuperação é a mesma de um vector store tradicional. Trocar por embeddings de modelo é substituir uma função.
O ganho é honestidade: quando existe fonte, o Bobby cita de onde tirou. Quando não existe, ele diz que não sabe.`,
  },
  {
    id: "marcos", title: "Marcos Eduardo — dev orquestrador de IA", origin: "core", createdAt: 0,
    tags: ["marcos", "sobre", "autor", "portfolio", "recrutador", "experiencia", "dev"],
    body: `Marcos Eduardo é desenvolvedor orquestrador de IA generativa. O foco não é consumir uma API de chat e exibir texto: é desenhar o sistema em volta do modelo. Filtro de entrada, recuperação de contexto, geração de artefatos, persistência, telemetria de uso e interface.
Este chat é o cartão de visita desse trabalho e cada peça visível tem contraparte de engenharia. O Sentinela é moderação e montagem de contexto. A GalleryBob é gestão de artefatos. O RenderLab é configuração de comportamento em runtime. O gateway é abstração de provedores.
A construção é feita com atenção obsessiva a detalhe visual: transições, estados, densidade de informação, fallback para tudo. O portfólio inteiro é a demonstração — em vez de descrever competência, entrega o sistema funcionando para o visitante usar.`,
  },
  {
    id: "funcoes", title: "Funções da interface que o Bobby executa", origin: "core", createdAt: 0,
    tags: ["funcoes", "comandos", "acoes", "menu", "botoes", "interface", "tools"],
    body: `O Bobby consegue operar a própria interface quando o usuário pede. As ações disponíveis são estas:\n\n${toolsDoc()}\n\nQuando o pedido é uma ação, o Bobby executa e confirma o que fez. Quando é uma pergunta sobre a ação, ele apenas explica. As ações respeitam as skills: se uma capacidade está desligada no RenderLab, ele avisa em vez de agir por fora da configuração.`,
  },
  {
    id: "gateway", title: "Gateway de provedores de IA", origin: "core", createdAt: 0,
    tags: ["provedores", "api", "gateway", "servidor", "modelos", "gemini", "backend"],
    body: `Existe um servidor próprio que busca automaticamente os provedores de IA disponíveis e devolve a lista para o front. Em vez de fixar um modelo no código, o chat pergunta ao gateway quais provedores estão de pé e monta o seletor dinamicamente.
Isso resolve troca de modelo sem deploy e resiliência: se um provedor cai, o sistema aponta para outro. As chaves ficam no servidor. Para leitura de imagem o pipeline usa o Gemini, com limite de uso por sessão para não abusar da cota.`,
  },
];

/* ── embedding local ─────────────────────────────────────────── */

const STOP = new Set(
  `a o e é de do da das dos em um uma uns umas para por com sem que qual quais como quando onde se na no nas nos ao aos à às os as ou mas mais muito pouco ser tem ter foi são está estão isso isto esse essa este esta pelo pela seu sua meu minha nosso the of and to in is it for on you your what how`.split(/\s+/)
);

export function tokenize(s: string): string[] {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

/** stem leve pt-BR: corta plurais e sufixos comuns */
function stem(w: string): string {
  return w
    .replace(/(mente|ação|acoes|ações|ando|endo|indo|ados|idos|adas|idas)$/, "")
    .replace(/(s|es)$/, "") || w;
}

let IDF = new Map<number, number>();

/**
 * EMBEDDING — troque aqui por API real quando quiser.
 * Ex.: const r = await fetch('/api/embed', {...}); return new Float32Array(r.vector)
 */
export function embed(text: string, useIdf = true): Float32Array {
  const v = new Float32Array(DIM);
  const toks = tokenize(text).map(stem);
  const tf = new Map<number, number>();
  for (const tkn of toks) {
    const b = hash(tkn) % DIM;
    tf.set(b, (tf.get(b) || 0) + 1);
  }
  // bigramas → captura contexto de sequência
  for (let i = 0; i < toks.length - 1; i++) {
    const b = hash(toks[i] + "_" + toks[i + 1]) % DIM;
    tf.set(b, (tf.get(b) || 0) + 0.6);
  }
  tf.forEach((count, b) => {
    const w = 1 + Math.log(count);
    v[b] = useIdf ? w * (IDF.get(b) ?? 1) : w;
  });
  // normaliza L2
  let sum = 0;
  for (let i = 0; i < DIM; i++) sum += v[i] * v[i];
  const n = Math.sqrt(sum) || 1;
  for (let i = 0; i < DIM; i++) v[i] /= n;
  return v;
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let d = 0;
  for (let i = 0; i < DIM; i++) d += a[i] * b[i];
  return d;
}

/* ── chunking com overlap ────────────────────────────────────── */
function chunkText(body: string, size = 460, overlap = 90): string[] {
  const paras = body.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + " " + p).length <= size) {
      buf = buf ? buf + "\n" + p : p;
    } else {
      if (buf) out.push(buf);
      if (p.length <= size) {
        buf = p;
      } else {
        // parágrafo gigante: janela deslizante por frases
        const sents = p.split(/(?<=[.!?])\s+/);
        let w = "";
        for (const st of sents) {
          if ((w + " " + st).length <= size) w = w ? w + " " + st : st;
          else { if (w) out.push(w); w = st; }
        }
        buf = w;
      }
    }
  }
  if (buf) out.push(buf);
  // aplica overlap
  return out.map((c, i) =>
    i > 0 ? out[i - 1].slice(-overlap) + " " + c : c
  );
}

/* ── índice ──────────────────────────────────────────────────── */
let CHUNKS: RagChunk[] = [];
let DOCS: RagDoc[] = [];
let RUNTIME_DOCS: RagDoc[] = [];

function loadUserDocs(): RagDoc[] {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]") as RagDoc[];
    return Array.isArray(arr) ? arr.filter((d) => d && d.id && d.body) : [];
  } catch {
    localStorage.removeItem(LS_KEY);
    return [];
  }
}

function saveUserDocs(): boolean {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(DOCS.filter((d) => d.origin === "user")));
    return true;
  } catch {
    return false;
  }
}

export function rebuild(): void {
  const raw: { docId: string; title: string; text: string; origin: "core" | "user" }[] = [];
  for (const d of DOCS) {
    for (const c of chunkText(d.body)) {
      raw.push({ docId: d.id, title: d.title, origin: d.origin, text: `${d.tags.join(" ")} ${c}` });
    }
  }
  // IDF sobre buckets
  const df = new Map<number, number>();
  const bucketsPerChunk = raw.map((r) => {
    const set = new Set<number>();
    for (const tkn of tokenize(r.text).map(stem)) set.add(hash(tkn) % DIM);
    return set;
  });
  for (const set of bucketsPerChunk) set.forEach((b) => df.set(b, (df.get(b) || 0) + 1));
  const N = Math.max(1, raw.length);
  IDF = new Map();
  df.forEach((v, k) => IDF.set(k, Math.log(1 + N / v)));

  CHUNKS = raw.map((r, i) => ({
    id: `${r.docId}-${i}`,
    docId: r.docId,
    title: r.title,
    origin: r.origin,
    // texto exibido sem as tags coladas
    text: r.text.replace(/^(\S+\s){0,8}?(?=[A-ZÀ-Ú])/, "").trim() || r.text,
    vec: embed(r.text),
  }));
}

export function init(): void {
  DOCS = [...CORE_DOCS, ...loadUserDocs(), ...RUNTIME_DOCS];
  rebuild();
}
init();

/* ── API pública ─────────────────────────────────────────────── */

export function listDocs(): RagDoc[] { return DOCS; }

export function addDoc(title: string, body: string, tags: string[] = []): RagDoc {
  const cleanBody = body.trim();
  if (!cleanBody) throw new Error("O documento está vazio.");
  if (cleanBody.length > MAX_DOC_CHARS)
    throw new Error(`O documento excede ${MAX_DOC_CHARS.toLocaleString("pt-BR")} caracteres.`);
  const currentSize = DOCS.filter((d) => d.origin === "user").reduce((n, d) => n + d.body.length, 0);
  if (currentSize + cleanBody.length > MAX_USER_CORPUS_CHARS)
    throw new Error("A base local atingiu o limite seguro. Exporte e remova documentos antigos antes de continuar.");

  const doc: RagDoc = {
    id: "u-" + Math.random().toString(36).slice(2, 9),
    title: title.trim() || "Documento sem título",
    body: cleanBody,
    tags: tags.length ? tags : tokenize(title).slice(0, 6),
    origin: "user",
    createdAt: Date.now(),
  };
  DOCS = [...DOCS, doc];
  if (!saveUserDocs()) {
    DOCS = DOCS.filter((d) => d.id !== doc.id);
    throw new Error("O navegador recusou a persistência. A cota local pode estar cheia.");
  }
  rebuild();
  return doc;
}

export function removeDoc(id: string): void {
  const before = DOCS;
  DOCS = DOCS.filter((d) => d.id !== id || d.origin === "core");
  if (!saveUserDocs()) {
    DOCS = before;
    throw new Error("Não foi possível atualizar a base persistida.");
  }
  rebuild();
}

/**
 * Sincroniza objetos temporarios da interface (ex.: GalleryBob) no indice.
 * Nao persiste no localStorage: a galeria continua sendo a fonte da verdade.
 */
export function syncRuntimeDocs(
  scope: string,
  items: { id: string; title: string; body: string; tags?: string[] }[]
): void {
  RUNTIME_DOCS = [
    ...RUNTIME_DOCS.filter((d) => !d.id.startsWith(`runtime:${scope}:`)),
    ...items
      .filter((x) => x.body.trim())
      .slice(0, 160)
      .map((x) => ({
        id: `runtime:${scope}:${x.id}`,
        title: x.title,
        body: x.body.slice(0, 80_000),
        tags: [...(x.tags || []), scope, "galeria"],
        origin: "core" as const,
        createdAt: Date.now(),
      })),
  ];
  DOCS = [
    ...CORE_DOCS,
    ...DOCS.filter((d) => d.origin === "user"),
    ...RUNTIME_DOCS,
  ];
  clearRemoteIndex();
  rebuild();
}

/** Retrieval com MMR — relevância + diversidade */
export function retrieve(query: string, k = 3, threshold = 0.11): Retrieved[] {
  if (!query.trim() || !CHUNKS.length) return [];
  const qv = embed(query);
  const scored = CHUNKS
    .map((c) => ({ c, score: cosine(qv, c.vec) }))
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k * 4);

  const chosen: typeof scored = [];
  while (chosen.length < k && scored.length) {
    let best = 0, bestVal = -Infinity;
    for (let i = 0; i < scored.length; i++) {
      const redundancy = chosen.length
        ? Math.max(...chosen.map((ch) => cosine(scored[i].c.vec, ch.c.vec)))
        : 0;
      const mmr = 0.76 * scored[i].score - 0.24 * redundancy;
      if (mmr > bestVal) { bestVal = mmr; best = i; }
    }
    chosen.push(scored.splice(best, 1)[0]);
  }
  return chosen.map((x) => ({
    text: x.c.text, title: x.c.title, docId: x.c.docId, score: x.score,
  }));
}

export function stats() {
  return {
    docs: DOCS.length,
    userDocs: DOCS.filter((d) => d.origin === "user").length,
    chunks: CHUNKS.length,
    dim: DIM,
    remoteVectors: REMOTE.size,
    provider: loadEmbedConfig().provider,
  };
}

/* ══════════════════════════════════════════════════════════════
   EMBEDDINGS REMOTOS
   Quando o provedor não é local, os chunks ganham um vetor da API
   e a consulta usa o mesmo espaço. Se faltar vetor remoto para
   algum chunk, o retrieval usa o motor local — nunca quebra.
   ══════════════════════════════════════════════════════════════ */

const REMOTE = new Map<string, Float32Array>();
let remoteReady = false;

function toUnit(v: number[]): Float32Array {
  const out = new Float32Array(v.length);
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const n = Math.sqrt(sum) || 1;
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

function dot(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < len; i++) d += a[i] * b[i];
  return d;
}

export interface IndexProgress { done: number; total: number; failed: number }

/** Gera vetores remotos para todos os chunks. Idempotente. */
export async function buildRemoteIndex(
  cfg: EmbedConfig = loadEmbedConfig(),
  onProgress?: (p: IndexProgress) => void
): Promise<IndexProgress> {
  if (cfg.provider === "local") {
    REMOTE.clear(); remoteReady = false;
    return { done: 0, total: 0, failed: 0 };
  }
  let done = 0, failed = 0;
  const total = CHUNKS.length;
  for (const c of CHUNKS) {
    if (REMOTE.has(c.id)) { done++; onProgress?.({ done, total, failed }); continue; }
    const r = await remoteEmbed(c.text, cfg);
    if (r.ok && r.vector) { REMOTE.set(c.id, toUnit(r.vector)); done++; }
    else failed++;
    onProgress?.({ done, total, failed });
  }
  remoteReady = REMOTE.size > 0;
  return { done, total, failed };
}

export function clearRemoteIndex(): void { REMOTE.clear(); remoteReady = false; }
export function isRemoteReady(): boolean { return remoteReady; }

/** Retrieval assíncrono: usa vetores remotos quando existirem. */
export async function retrieveAsync(query: string, k = 3, threshold = 0.11): Promise<Retrieved[]> {
  const cfg = loadEmbedConfig();
  if (cfg.provider === "local" || !remoteReady) return retrieve(query, k, threshold);

  const r = await remoteEmbed(query, cfg);
  if (!r.ok || !r.vector) {
    // Fallback silencioso: a conversa não pode parar por causa da API.
    return cfg.fallbackLocal ? retrieve(query, k, threshold) : [];
  }
  const qv = toUnit(r.vector);
  const scored = CHUNKS
    .map((c) => {
      const rv = REMOTE.get(c.id);
      return { c, score: rv ? dot(qv, rv) : 0 };
    })
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored.map((x) => ({ text: x.c.text, title: x.c.title, docId: x.c.docId, score: x.score }));
}

/* ── JSON da base: exportar, validar e importar ───────────────── */

export interface BaseSnapshot { version: 1; exportedAt: string; docs: RagDoc[] }

export function exportJson(): BaseSnapshot {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    docs: DOCS.filter((d) => d.origin === "user"),
  };
}

export function exportJsonText(): string {
  return JSON.stringify(exportJson(), null, 2);
}

/** Substitui os documentos do usuário pelo JSON informado. */
export function importJsonText(text: string, mode: "replace" | "merge" = "replace"): number {
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { throw new Error("JSON inválido: verifique vírgulas e aspas."); }

  const raw = Array.isArray(parsed)
    ? parsed
    : (parsed as BaseSnapshot)?.docs;
  if (!Array.isArray(raw)) throw new Error('Esperado um array de documentos ou { "docs": [...] }.');

  const incoming: RagDoc[] = [];
  for (const [i, item] of raw.entries()) {
    const d = item as Partial<RagDoc>;
    if (!d || typeof d.body !== "string" || !d.body.trim())
      throw new Error(`Documento ${i + 1} sem o campo "body".`);
    if (d.body.length > MAX_DOC_CHARS)
      throw new Error(`Documento ${i + 1} excede ${MAX_DOC_CHARS.toLocaleString("pt-BR")} caracteres.`);
    incoming.push({
      id: typeof d.id === "string" && d.id ? d.id : "u-" + Math.random().toString(36).slice(2, 9),
      title: (d.title || "Documento sem título").toString().slice(0, 120),
      body: d.body.trim(),
      tags: Array.isArray(d.tags) ? d.tags.map(String).slice(0, 12) : tokenize(d.title || "").slice(0, 6),
      origin: "user",
      createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
    });
  }

  const total = incoming.reduce((n, d) => n + d.body.length, 0);
  if (total > MAX_USER_CORPUS_CHARS)
    throw new Error("O conjunto importado ultrapassa o limite seguro da base local.");

  const before = DOCS;
  const kept = mode === "merge"
    ? DOCS.filter((d) => d.origin === "user" && !incoming.some((x) => x.id === d.id))
    : [];
  DOCS = [...CORE_DOCS, ...kept, ...incoming];

  if (!saveUserDocs()) {
    DOCS = before;
    throw new Error("O navegador recusou a gravação. Libere espaço e tente de novo.");
  }
  clearRemoteIndex();
  rebuild();
  return incoming.length;
}
