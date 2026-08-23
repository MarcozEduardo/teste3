import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import type {
  Attachment, Conv, DeletedConv, GenState, Lang, LayoutMode, LikedMsg,
  ModalKind, Msg, Proto, SkillId, Source, Stage,
} from "./types";
import { bobbyReply } from "./bobbyBrain";
import { inspect } from "./sentinela";
import { LANGS } from "./i18n";
import * as RAG from "./rag";
import {
  extractLinks, mapLink, langOf, isImageFile, isPdf, transcribePdf,
  describeImage, fileToDataUrl, loadKey, saveKey, VISION_LIMIT, readWebPage,
} from "./skills";
import { P, pick } from "./phrases";
import type { LinkMap } from "./skills";
import { deleteAsset, saveAsset } from "./blobStore";
import { matchTool, TOOLS, type ToolMatch } from "./tools";
import { loadEmbedConfig, saveEmbedConfig, type EmbedConfig } from "./embedProvider";
import { classify, CONTEXTS, CTX, type ContextId } from "./contexts";
import { generatePdf } from "./pdfGenerator";
import { googleSearch } from "./webSearch";
import type { SealState } from "./quarantine";
import { log as slog, loadConfig as loadSentinelaCfg } from "./sentinelaLog";
import * as Pulso from "./pulso";
import { speechFor } from "./speech";
import { getObDocs, getVcDocs } from "./gallery";

const stripTxt = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** "foca em código", "só fala de projetos", "tira o filtro" */
function matchContextRequest(text: string): ContextId | "__off__" | null {
  const s = stripTxt(text);
  if (!/(foca|focar|filtra|filtrar|so fala|somente|apenas|muda o contexto|troca o contexto|contexto de|tira o filtro|remove o filtro|volta tudo|sem filtro)/.test(s))
    return null;
  if (/(tira|remove|limpa|volta tudo|sem filtro|desfaz)/.test(s)) return "__off__";
  for (const c of CONTEXTS) {
    if (s.includes(stripTxt(c.label))) return c.id;
    if (c.kws.some((k) => k.length > 4 && s.includes(stripTxt(k)))) return c.id;
  }
  return null;
}

function ordinalIndex(s: string): number | null {
  const words: Record<string, number> = {
    primeiro: 0, primeira: 0, segundo: 1, segunda: 1, terceiro: 2, terceira: 2,
    quarto: 3, quarta: 3, quinto: 4, quinta: 4,
  };
  for (const [word, index] of Object.entries(words)) if (s.includes(word)) return index;
  const n = s.match(/\b(\d+)[ºª]?\b/);
  return n ? Math.max(0, Number(n[1]) - 1) : null;
}

function resolveChats(text: string, convs: Conv[], activeId: string): Conv[] {
  const s = stripTxt(text);
  if (/\b(todos|todas|tudo)\b/.test(s)) return convs.filter((c) => c.messages.length > 0);
  if (/\b(atual|esse chat|esta conversa)\b/.test(s)) return convs.filter((c) => c.id === activeId);
  const ordinal = ordinalIndex(s);
  if (ordinal !== null && convs[ordinal]) return [convs[ordinal]];

  const now = new Date();
  if (s.includes("ontem")) {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return convs.filter((c) => new Date(c.createdAt).toDateString() === d.toDateString());
  }
  if (s.includes("hoje"))
    return convs.filter((c) => new Date(c.createdAt).toDateString() === now.toDateString());

  return convs
    .filter((c) => c.title.length > 3 && s.includes(stripTxt(c.title)))
    .sort((a, b) => b.title.length - a.title.length)
    .slice(0, 1);
}
import {
  LAUGH, STALL, pickOne, typingBanter, IDLE_NUDGE, restNudge, ageLabel, AGE_OPENERS,
} from "./reactions";
import { detectIntent, findColor, type IntentId } from "./intents";
import {
  applyPalette, clearPalette, resolvePalette, revertPalette, restoreSaved,
  neighbors, suggestRandom, inventColor, applyFont, FONTS,
} from "./colorEngine";
import { getGame } from "./games";



const uid = () => Math.random().toString(36).slice(2, 10);
const nowTime = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const mk = (m: Omit<Msg, "id" | "time" | "ts">): Msg => ({ id: uid(), time: nowTime(), ts: Date.now(), ...m });

/* ── RenderLab ────────────────────────────────────────────── */
export const SKILL_META: { id: SkillId; name: string; desc: string }[] = [
  { id: "rag", name: "Base de Conhecimento (RAG)", desc: "Busca vetorial nos cases e READMEs antes de responder" },
  { id: "sentinela", name: "Sentinela (firewall)", desc: "Filtra impróprio, ruído, arrogância e prompt injection" },
  { id: "metadata", name: "Metadados de digitação", desc: "Lê ritmo, pausas e correções pra calibrar o atendimento" },
  { id: "links", name: "Leitor de Links", desc: "Mapeia a estrutura da página quando você cola uma URL" },
  { id: "doccard", name: "Card de Documento", desc: "Cartão com preview e download para arquivos enviados" },
  { id: "pdf", name: "Transcrição de PDF", desc: "Extrai o texto de PDFs direto no navegador" },
  { id: "vision", name: "Visão (Gemini)", desc: `Lê imagens enviadas — limite de ${VISION_LIMIT} por sessão` },
  { id: "proto", name: "Protótipos", desc: "Gera blocos de código executáveis dentro do chat" },
  { id: "humor", name: "Persona / Humor", desc: "Carisma, opinião e brincadeira saudável na resposta" },
  { id: "turbo", name: "Turbo", desc: "Reduz latência e acelera o streaming" },
];

const DEFAULT_SKILLS: Record<SkillId, boolean> = {
  rag: true, sentinela: true, proto: true, humor: true, turbo: false,
  links: true, doccard: true, pdf: true, vision: true, metadata: true,
};

const ls = {
  get<T>(k: string, fb: T): T {
    try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? fb; }
    catch { localStorage.removeItem(k); return fb; }
  },
  set(k: string, v: unknown): boolean {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch { return false; }
  },
};

function withoutInlineAssets<T extends Conv | DeletedConv>(conv: T): T {
  return {
    ...conv,
    messages: conv.messages.map((m) => ({
      ...m,
      attachments: m.attachments?.map(({ dataUrl: _inline, ...a }) => {
        void _inline;
        return a;
      }),
    })),
  };
}

const MAX_FILES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

export type Theme = "creme" | "uva";
export const THEMES: { id: Theme; name: string; hint: string }[] = [
  { id: "creme", name: "Creme", hint: "papel quente e dourado" },
  { id: "uva", name: "Uva", hint: "vinho, violeta e bege" },
];

const freshConv = (): Conv => ({ id: uid(), title: "Nova sessão", createdAt: Date.now(), messages: [], branches: 0 });

function loadConvs(): Conv[] {
  const arr = ls.get<Conv[]>("bobby_convs", []);
  if (Array.isArray(arr) && arr.length && arr.every((c) => c?.id))
    return arr.map((c) => ({ ...c, messages: Array.isArray(c.messages) ? c.messages : [] }));
  return [freshConv()];
}

interface Store {
  origin: "home" | "widget";
  expanded: boolean; layout: LayoutMode;
  setExpanded: (v: boolean) => void; setLayout: (l: LayoutMode) => void;
  leftOpen: boolean; rightOpen: boolean; galleryOpen: boolean;
  setLeftOpen: (v: boolean) => void; setRightOpen: (v: boolean) => void;
  setGalleryOpen: (v: boolean) => void; openGalleryWindow: () => void;
  /** Inverte a posição dos dois painéis */
  swapped: boolean; toggleSwap: () => void;
  modal: ModalKind; setModal: (m: ModalKind) => void;
  docModal: Attachment | null; setDocModal: (a: Attachment | null) => void;
  lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string;

  convs: Conv[]; active: Conv; activeId: string; messages: Msg[];
  newChat: () => void; selectConv: (id: string) => void;
  deleteConv: (id: string) => void; deleteMany: (ids: string[]) => void;
  renameSession: (title: string) => void; clearCache: () => void;
  trash: DeletedConv[]; restoreConv: (id: string) => void; purgeTrash: (id: string) => void;

  liked: LikedMsg[]; toggleLike: (m: Msg) => void; unlike: (id: string) => void;
  flyToGallery: (from: DOMRect | null, color?: string) => void;
  likedNew: number; seenLiked: () => void;

  /** Publica uma mensagem do Bobby vinda de um componente. */
  pushSystem: (content: string, ctx?: ContextId) => void;
  /** Pergunta em aberto aguardando resposta do usuário. */
  flowTag: string | null;
  /** Quarentena de código: estado do lacre por anexo. */
  sealOf: (attId: string) => SealState;
  setSeal: (attId: string, s: SealState) => void;
  gen: GenState; stream: string; stages: Stage[];
  send: (text: string, atts?: Attachment[]) => void;
  attachFiles: (files: FileList | File[]) => void;
  editMessage: (id: string, text: string) => void;
  updateAttachment: (id: string, name: string, content: string) => void;
  resolveConfirmation: (msgId: string, yes: boolean) => void;

  skills: Record<SkillId, boolean>; toggleSkill: (id: SkillId) => void;
  apiKey: string; setApiKey: (k: string) => void; visionUsed: number;

  clock: string; msgCount: number; charCount: number; sessionTime: string; blocked: number;
  typing: { chars: number; backspaces: number; cpm: number; seconds: number };
  noteTyping: (e: { chars: number; backspace: boolean; keyed?: boolean }) => void; resetTyping: () => void;

  protos: Proto[]; docsVersion: number; bumpDocs: () => void;
  removeProtos: (ids: string[]) => void;
  removeAttachments: (ids: string[]) => void;
  ragVersion: number; bumpRag: () => void;
  storageWarning: string; dismissStorageWarning: () => void;

  /** Tema visual */
  theme: Theme; setTheme: (t: Theme) => void; cycleTheme: () => void;

  /** Filtro por contexto */
  contextFilter: ContextId | null;
  setContextFilter: (c: ContextId | null) => void;
  filterAnchor: number;
  visibleMessages: Msg[];
  /** Carimbo clicado pede o painel lá embaixo */
  panelHint: number;
  flyToPanel: (c: ContextId) => void;
  clearPanelHint: () => void;

  /** Visualizador de site em meia tela */
  siteView: LinkMap | null; openSite: (l: LinkMap) => void; closeSite: () => void;
  /** Config de embeddings */
  embedCfg: EmbedConfig; setEmbedCfg: (c: EmbedConfig) => void;
}

interface SendOptions {
  /** A mensagem do usuário já foi inserida, como acontece ao editar/ramificar. */
  skipUser?: boolean;
  /** Histórico exato usado pelo firewall e pelo motor naquele branch. */
  history?: Msg[];
}

const Ctx = createContext<Store | null>(null);
export const useBobby = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useBobby fora do provider");
  return s;
};

export function BobbyProvider({ children }: { children: ReactNode }) {
  const [origin] = useState<"home" | "widget">(() =>
    new URLSearchParams(window.location.search).has("msg") ? "home" : "widget"
  );
  const [expanded, setExpanded] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>("fullscreen");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const toggleSwap = useCallback(() => setSwapped((s) => !s), []);
  const [modal, setModal] = useState<ModalKind>(null);
  const [docModal, setDocModal] = useState<Attachment | null>(null);

  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("bobby_lang") as Lang) || "pt");
  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem("bobby_lang", l); };
  const t = useCallback((k: string) => LANGS[lang][k] ?? LANGS.pt[k] ?? k, [lang]);

  const [skills, setSkills] = useState<Record<SkillId, boolean>>(() => ({
    ...DEFAULT_SKILLS, ...ls.get("bobby_skills", {}),
  }));
  const toggleSkill = useCallback((id: SkillId) => {
    setSkills((p) => { const n = { ...p, [id]: !p[id] }; ls.set("bobby_skills", n); return n; });
  }, []);

  const [apiKey, setApiKeyState] = useState(loadKey);
  const setApiKey = (k: string) => { setApiKeyState(k); saveKey(k); };
  const [visionUsed, setVisionUsed] = useState(0);

  /* ── conversas ── */
  const [convs, setConvs] = useState<Conv[]>(loadConvs);
  const [activeId, setActiveId] = useState<string>(() => loadConvs()[0].id);
  const [trash, setTrash] = useState<DeletedConv[]>(() => ls.get("bobby_trash", []));
  const [liked, setLiked] = useState<LikedMsg[]>(() => ls.get("bobby_liked", []));
  const [likedNew, setLikedNew] = useState(0);
  const [storageWarning, setStorageWarning] = useState("");
  const [seals, setSeals] = useState<Record<string, SealState>>(() => ls.get("bobby_seals", {}));
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = localStorage.getItem("bobby_theme");
    return t === "uva" || t === "creme" ? t : "uva";
  });
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("bobby_theme", t); } catch { /* noop */ }
  }, []);
  const cycleTheme = useCallback(() => {
    clearPalette(); // sai da cor secreta ao voltar pros temas oficiais
    setThemeState((prev) => {
      const next: Theme = prev === "creme" ? "uva" : "creme";
      try { localStorage.setItem("bobby_theme", next); } catch { /* noop */ }
      return next;
    });
  }, []);

  /* restaura a paleta escolhida na sessão anterior */
  useEffect(() => { restoreSaved(); }, []);

  /* ── filtro por contexto ── */
  const [contextFilter, setContextFilterState] = useState<ContextId | null>(null);
  const [filterAnchor, setFilterAnchor] = useState(0);
  const [panelHint, setPanelHint] = useState(0);
  const flyToPanel = useCallback(() => setPanelHint(Date.now()), []);
  const clearPanelHint = useCallback(() => setPanelHint(0), []);
  const setContextFilter = useCallback((c: ContextId | null) => {
    // O clique vira âncora: o recorte vale para o que já existe.
    setFilterAnchor(c ? Date.now() : 0);
    setContextFilterState(c);
  }, []);

  const [siteView, setSiteView] = useState<LinkMap | null>(null);
  const openSite = useCallback((link: LinkMap) => {
    // Uma janela pesada por vez: evita galeria + iframe disputando largura.
    setGalleryOpen(false);
    setRightOpen(false);
    setLeftOpen(false);
    setSiteView(link);
  }, []);
  const closeSite = useCallback(() => setSiteView(null), []);
  const [embedCfg, setEmbedCfgState] = useState<EmbedConfig>(loadEmbedConfig);
  const setEmbedCfg = useCallback((c: EmbedConfig) => {
    setEmbedCfgState(c);
    if (!saveEmbedConfig(c)) setStorageWarning("Não foi possível salvar a configuração de embeddings.");
  }, []);

  useEffect(() => {
    if (!convs.length) { const c = freshConv(); setConvs([c]); setActiveId(c.id); }
    else if (!convs.some((c) => c.id === activeId)) setActiveId(convs[0].id);
  }, [convs, activeId]);

  const active = useMemo(
    () => convs.find((c) => c.id === activeId) || convs[0] || freshConv(),
    [convs, activeId]
  );
  const messages = active.messages;

  useEffect(() => {
    const data = convs.slice(0, 40).map(withoutInlineAssets);
    if (!ls.set("bobby_convs", data))
      setStorageWarning("O armazenamento local está cheio. A conversa continua aberta, mas pode não sobreviver a um recarregamento.");
  }, [convs]);
  useEffect(() => {
    const data = trash.slice(0, 30).map(withoutInlineAssets);
    if (!ls.set("bobby_trash", data))
      setStorageWarning("A pasta de chats deletados atingiu a cota local. Remova itens antigos para continuar arquivando.");
  }, [trash]);
  useEffect(() => {
    if (!ls.set("bobby_liked", liked.slice(0, 200)))
      setStorageWarning("A pasta de mensagens curtidas atingiu a cota local.");
  }, [liked]);

  const updateActive = useCallback((fn: (c: Conv) => Conv) => {
    setConvs((prev) => {
      const i = prev.findIndex((c) => c.id === activeId);
      if (i === -1) return prev;
      const next = [...prev]; next[i] = fn(next[i]); return next;
    });
  }, [activeId]);

  const pushMsg = useCallback((m: Msg) => updateActive((c) => ({ ...c, messages: [...c.messages, m] })), [updateActive]);

  /* ── timers ── */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearAllTimers = useCallback(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (typeTimer.current) { clearInterval(typeTimer.current); typeTimer.current = null; }
  }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const [gen, setGen] = useState<GenState>("idle");
  const [stream, setStream] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [blocked, setBlocked] = useState(0);

  /* ── conversas: ações ── */
  const resetGen = useCallback(() => { clearAllTimers(); setGen("idle"); setStream(""); setStages([]); }, [clearAllTimers]);

  const newChat = useCallback(() => {
    resetGen();
    // A conversa atual já está persistida pelo efeito. Se estiver vazia,
    // apenas a reutiliza; caso contrário cria uma nova fora do updater.
    if (active.messages.length > 0) {
      const c = freshConv();
      setConvs((prev) => [c, ...prev]);
      setActiveId(c.id);
    } else {
      setActiveId(active.id);
    }
    if (window.innerWidth <= 768) setLeftOpen(false);
  }, [active, resetGen]);

  const selectConv = useCallback((id: string) => {
    resetGen(); setActiveId(id);
    if (window.innerWidth <= 768) setLeftOpen(false);
  }, [resetGen]);

  const moveToTrash = useCallback((ids: string[]) => {
    const gone = convs.filter((c) => ids.includes(c.id) && c.messages.length > 0);
    if (gone.length) {
      const deletedAt = Date.now();
      setTrash((prev) => [
        ...gone.map((g) => ({ ...g, deletedAt })),
        ...prev.filter((old) => !gone.some((g) => g.id === old.id)),
      ]);
    }
    const next = convs.filter((c) => !ids.includes(c.id));
    setConvs(next.length ? next : [freshConv()]);
  }, [convs]);

  const deleteConv = useCallback((id: string) => moveToTrash([id]), [moveToTrash]);
  const deleteMany = useCallback((ids: string[]) => moveToTrash(ids), [moveToTrash]);

  const resolveConfirmation = useCallback((msgId: string, yes: boolean) => {
    const found = convs.flatMap((c) => c.messages).find((m) => m.id === msgId)?.confirm;
    const targetIds = found?.targetIds || [];
    setConvs((prev) => prev.map((c) => ({
      ...c,
      messages: c.messages.map((m) => {
        if (m.id !== msgId || !m.confirm || m.confirm.resolved) return m;
        return { ...m, confirm: { ...m.confirm, resolved: yes ? "yes" : "no" } };
      }),
    })));
    if (yes && targetIds.length) {
      setTimeout(() => moveToTrash(targetIds), 0);
      pushMsg(mk({
        role: "ai", ctx: "config",
        content: `${targetIds.length} conversa${targetIds.length === 1 ? " foi movida" : "s foram movidas"} para a **Lixeira do Chat**. Nada foi destruido definitivamente; voce ainda pode restaurar pela galeria.`,
      }));
    } else if (!yes) {
      pushMsg(mk({ role: "ai", ctx: "config", content: "Cancelado. Nao apaguei nada." }));
    }
  }, [convs, moveToTrash, pushMsg]);

  const restoreConv = useCallback((id: string) => {
    const c = trash.find((x) => x.id === id);
    if (!c) return;
    const { deletedAt: _d, ...rest } = c;
    void _d;
    setTrash((prev) => prev.filter((x) => x.id !== id));
    setConvs((prev) => [rest, ...prev.filter((x) => x.id !== rest.id)]);
  }, [trash]);
  const purgeTrash = useCallback((id: string) => {
    const conv = trash.find((x) => x.id === id);
    for (const m of conv?.messages || [])
      for (const a of m.attachments || [])
        if (a.assetId) void deleteAsset(a.assetId);
    setTrash((p) => p.filter((x) => x.id !== id));
  }, [trash]);

  const renameSession = useCallback((title: string) => {
    const clean = title.trim().slice(0, 60) || "Nova sessão";
    updateActive((c) => (c.title === clean ? c : { ...c, title: clean }));
  }, [updateActive]);

  const clearCache = useCallback(() => {
    resetGen(); updateActive((c) => ({ ...c, messages: [] }));
  }, [updateActive, resetGen]);

  /* ── likes ── */
  /** Anima um item voando até o botão da galeria e acende o contador. */
  const flyToGallery = useCallback((from: DOMRect | null, color = "#e11d48") => {
    const target = document.querySelector(".side-btn-right")?.getBoundingClientRect();
    if (!from || !target) return;
    const dot = document.createElement("span");
    dot.className = "gallery-flyer";
    dot.style.cssText =
      `left:${from.left + from.width / 2}px;top:${from.top + from.height / 2}px;background:${color};` +
      `--tx:${target.left + target.width / 2 - from.left - from.width / 2}px;` +
      `--ty:${target.top + target.height / 2 - from.top - from.height / 2}px`;
    document.body.appendChild(dot);
    setTimeout(() => {
      dot.remove();
      document.querySelector(".side-btn-right")?.classList.add("got-item");
      setTimeout(() => document.querySelector(".side-btn-right")?.classList.remove("got-item"), 700);
    }, 620);
  }, []);

  const toggleLike = useCallback((m: Msg) => {
    updateActive((c) => ({
      ...c, messages: c.messages.map((x) => (x.id === m.id ? { ...x, liked: !x.liked } : x)),
    }));
    const exists = liked.some((l) => l.id === m.id);
    if (exists) {
      setLiked((prev) => prev.filter((l) => l.id !== m.id));
    } else {
      setLiked((prev) => [{
        id: m.id, content: m.content, convId: active.id, convTitle: active.title,
        time: m.time, savedAt: Date.now(), sources: m.sources,
      }, ...prev]);
      setLikedNew((n) => n + 1);
    }
  }, [updateActive, active.id, active.title, liked]);

  const unlike = useCallback((id: string) => {
    setLiked((p) => p.filter((l) => l.id !== id));
    setConvs((prev) => prev.map((c) => ({
      ...c, messages: c.messages.map((m) => (m.id === id ? { ...m, liked: false } : m)),
    })));
  }, []);
  const seenLiked = useCallback(() => setLikedNew(0), []);

  /* ── galeria ── */
  const [protos, setProtos] = useState<Proto[]>(() => ls.get("bobby_protos", []));
  const [docsVersion, setDocsVersion] = useState(0);
  const [ragVersion, setRagVersion] = useState(0);
  const bumpDocs = useCallback(() => setDocsVersion((v) => v + 1), []);
  const bumpRag = useCallback(() => setRagVersion((v) => v + 1), []);
  const removeProtos = useCallback((ids: string[]) => {
    setProtos((prev) => {
      const next = prev.filter((p) => !ids.includes(p.id));
      ls.set("bobby_protos", next);
      return next;
    });
    bumpDocs();
  }, [bumpDocs]);
  const removeAttachments = useCallback((ids: string[]) => {
    const clean = ids.map((id) => id.replace(/^att-(doc|trash)-/, ""));
    const strip = (c: Conv) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        attachments: m.attachments?.filter((a) => {
          const remove = clean.includes(a.id);
          if (remove && a.assetId) void deleteAsset(a.assetId);
          return !remove;
        }),
      })),
    });
    setConvs((prev) => prev.map(strip));
    setTrash((prev) => prev.map((c) => ({ ...strip(c), deletedAt: c.deletedAt })));
    bumpDocs();
  }, [bumpDocs]);

  /* ── metadados de digitação ── */
  const [typing, setTyping] = useState({ chars: 0, backspaces: 0, cpm: 0, seconds: 0 });
  const typeStart = useRef(0);
  const lastNudge = useRef(0);
  const nudged = useRef<Set<string>>(new Set());
  /** Conta teclas de verdade: texto colado não conta como digitação. */
  const keystrokes = useRef(0);

  const resetTyping = useCallback(() => {
    typeStart.current = 0; nudged.current.clear();
    setTyping({ chars: 0, backspaces: 0, cpm: 0, seconds: 0 });
  }, []);

  const noteTyping = useCallback((e: { chars: number; backspace: boolean; keyed?: boolean }) => {
    if (e.chars === 0 && !e.backspace) {
      typeStart.current = 0;
      keystrokes.current = 0;
      nudged.current.clear();
      setTyping({ chars: 0, backspaces: 0, cpm: 0, seconds: 0 });
      return;
    }
    if (e.keyed !== false) keystrokes.current += 1;
    if (!typeStart.current) typeStart.current = Date.now();
    const secs = (Date.now() - typeStart.current) / 1000;
    setTyping((p) => {
      const backspaces = p.backspaces + (e.backspace ? 1 : 0);
      const cpm = secs > 2 ? Math.round((e.chars / secs) * 60) : 0;
      return { chars: e.chars, backspaces, cpm, seconds: Math.round(secs) };
    });
  }, []);

  /* nudges automáticos baseados em metadados */
  const nudge = useCallback((key: string, phrase: string) => {
    if (nudged.current.has(key)) return;
    if (Date.now() - lastNudge.current < 25000) return;
    nudged.current.add(key); lastNudge.current = Date.now();
    pushMsg(mk({ role: "ai", content: phrase, meta: true }));
  }, [pushMsg]);

  /**
   * Sensor de presença: a aba está aberta e visível, mas ninguém
   * digita. Diferente de ausência real — aqui a pessoa está lá,
   * só se distraiu. Dispara uma vez e depois se recolhe.
   */
  useEffect(() => {
    if (!skills.metadata) return;
    let idleSince = Date.now();
    let stage = 0;

    const wake = () => { idleSince = Date.now(); stage = 0; };
    ["mousemove", "keydown", "click", "scroll"].forEach((ev) =>
      window.addEventListener(ev, wake, { passive: true })
    );

    const i = setInterval(() => {
      if (document.hidden || gen !== "idle" || messages.length < 2) return;
      const idle = (Date.now() - idleSince) / 1000;

      if (stage === 0 && idle > 100) {
        stage = 1;
        nudge("presence-1", "Opa, demorando pra aparecer… A aba tá aberta, então você deve ter se ocupado aí.");
      } else if (stage === 1 && idle > 320) {
        stage = 2;
        nudge("presence-2", "Já é bastante tempo. Vou dar uma relaxada aqui até você voltar. Tá tudo salvo.");
      }
    }, 20000);

    return () => {
      clearInterval(i);
      ["mousemove", "keydown", "click", "scroll"].forEach((ev) => window.removeEventListener(ev, wake));
    };
  }, [skills.metadata, gen, messages.length, nudge]);

  /* Sensor de ausencia: registra quando a pessoa sai da aba e volta. */
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (!hiddenAt || messages.length < 2 || gen !== "idle") return;
      const away = Math.round((Date.now() - hiddenAt) / 1000);
      hiddenAt = 0;
      if (away >= 30) {
        const label = away >= 120 ? `${Math.round(away / 60)} minutos` : `${away} segundos`;
        nudge(`return-${Math.floor(Date.now() / 300000)}`, `Voltou. Voce ficou fora por ${label}; a conversa continuou salva exatamente onde parou.`);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [messages.length, gen, nudge]);

  /**
   * Só dispara se houver MOVIMENTO real no teclado. Texto colado e
   * abandonado não conta como digitação — vira o cutucão de ociosidade.
   */
  useEffect(() => {
    if (!skills.metadata || gen !== "idle") return;
    const i = setInterval(() => {
      if (!typeStart.current) return;
      const secs = (Date.now() - typeStart.current) / 1000;
      const moved = keystrokes.current > 12;
      if (!moved || typing.chars === 0) return;

      const erased = Math.round(typing.backspaces * 1.4);
      if (typing.backspaces > 20)
        nudge("back", typingBanter({ seconds: secs, backspaces: typing.backspaces, chars: typing.chars, erased }));
      else if (secs > 120 && typing.chars > 150)
        nudge("long", typingBanter({ seconds: secs, backspaces: typing.backspaces, chars: typing.chars, erased }));
      else if (typing.cpm > 380 && typing.chars > 60)
        nudge("fast", pick("fast", P.fastTyping));
    }, 5000);
    return () => clearInterval(i);
  }, [skills.metadata, gen, typing, nudge]);

  /* texto parado, sem movimento: o Bobby cutuca */
  const lastKey = useRef(Date.now());
  useEffect(() => { lastKey.current = Date.now(); }, [typing.chars]);
  useEffect(() => {
    if (!skills.metadata) return;
    const i = setInterval(() => {
      if (typing.chars > 15 && Date.now() - lastKey.current > 45000 && gen === "idle")
        nudge("pause", pickOne(IDLE_NUDGE));
    }, 6000);
    return () => clearInterval(i);
  }, [skills.metadata, typing.chars, gen, nudge]);

  /* sessão longa: sugerir descanso */
  useEffect(() => {
    if (!skills.metadata) return;
    const i = setInterval(() => {
      const mins = Math.round((Date.now() - sessionStart.current) / 60000);
      const msg = restNudge(mins);
      if (msg && gen === "idle" && messages.length > 4) nudge(`rest-${Math.floor(mins / 45)}`, msg);
    }, 120000);
    return () => clearInterval(i);
  }, [skills.metadata, gen, messages.length, nudge]);

  /* ── EXECUTOR DE TOOLS ── */
  const runTool = useCallback((m: ToolMatch): string => {
    switch (m.id) {
      case "new_chat": {
        const hadMessages = active.messages.length > 0;
        if (hadMessages) {
          const c = freshConv();
          setConvs((prev) => [c, ...prev]);
          setActiveId(c.id);
        }
        return hadMessages
          ? "Pronto, abri uma conversa nova. A anterior foi salva no histórico do painel esquerdo, com o título e todas as mensagens intactas."
          : "Esta conversa já está vazia, então reaproveitei ela em vez de criar outra e deixar lixo no histórico.";
      }
      case "rename_chat": {
        if (!m.arg) return "__ASK_NAME__";
        return "__RITUAL_RENAME__" + m.arg;
      }
      case "open_history":
        setLeftOpen(true);
        return "Abri o histórico à esquerda. Ali dá pra buscar por título ou por conteúdo das mensagens, selecionar vários chats e apagar em lote.";
      case "open_gallery":
        setRightOpen(true);
        return "Galeria aberta à direita. As pastas são Documentos, DEV Protótipos, DEV Confirmados, Mensagens Curtidas, Chats e Chats Deletados.";
      case "open_rag":
        setModal("rag");
        return "Abri a Base de Conhecimento. Lá você injeta conteúdo, configura o provedor de embeddings, edita o JSON da base e testa o retrieval em tempo real.";
      case "open_skills":
        setModal("renderchat");
        return "RenderLab aberto. Cada skill pode ser ligada ou desligada ali, e a mudança vale na hora — inclusive pra mim.";
      case "open_apikey":
        setModal("apikey");
        return "Abri o testador de chave. Cola a API key e clica em testar; se for válida, eu listo os modelos disponíveis.";
      case "expand":
        setExpanded(true);
        return "Expandi pra tela cheia. Os botões de layout apareceram no topo, dá pra alternar entre fullscreen, 90% e centered.";
      case "collapse":
        setExpanded(false);
        return "Voltei pro modo widget, flutuando no canto. A página atrás fica livre de novo.";
      case "clear_chat":
        updateActive((c) => ({ ...c, messages: [] }));
        return "Limpei as mensagens desta sessão. A conversa continua no histórico, só ficou em branco.";
      case "set_layout": {
        const l = (m.arg || "fullscreen") as LayoutMode;
        setExpanded(true); setLayout(l);
        const nome = l === "90" ? "90%" : l === "centered" ? "centralizado" : "tela cheia";
        return `Layout alterado para **${nome}**.`;
      }
      case "toggle_skill": {
        const id = m.arg as SkillId;
        const want = m.extra === "on";
        const meta = SKILL_META.find((s) => s.id === id);
        if (skills[id] === want)
          return `A skill **${meta?.name || id}** já estava ${want ? "ligada" : "desligada"}. Deixei como está.`;
        toggleSkill(id);
        return want
          ? `Liguei a skill **${meta?.name || id}**. ${meta?.desc || ""}`
          : `Desliguei a skill **${meta?.name || id}**. A partir de agora eu respondo sem ela — e vou avisar quando fizer falta.`;
      }
      default:
        return "Comando reconhecido, mas sem ação associada.";
    }
  }, [active.messages.length, renameSession, updateActive, skills, toggleSkill]);

  /* ══ FLUXO CONVERSACIONAL — o formulário que parece conversa ══
     Guarda uma pergunta em aberto. A próxima mensagem do usuário
     é interpretada como resposta, não como comando novo. */
  interface FlowStep {
    accepts?: IntentId[];
    match?: (text: string) => string | null;
    resolve: (answer: string, raw: string) => void;
  }
  const flow = useRef<FlowStep | null>(null);
  const [flowTag, setFlowTagState] = useState<string | null>(null);
  const setFlowTag = setFlowTagState;

  const ask = useCallback((question: string, tag: string, step: FlowStep, ctx: ContextId = "chat") => {
    flow.current = step;
    setFlowTag(tag);
    setGen("thinking");
    later(() => {
      setGen("idle");
      pushMsg(mk({ role: "ai", content: question, ctx }));
    }, 700);
  }, [pushMsg]);

  /* ══ EXECUTOR DE INTENÇÕES ══ */
  const runIntent = useCallback((id: IntentId, color?: string, raw?: string): boolean => {
    const say = (content: string, ctx: ContextId = "chat", delay = 900) => {
      setGen("thinking");
      later(() => { setGen("idle"); pushMsg(mk({ role: "ai", content, ctx })); }, delay);
    };

    /**
     * Ritual de execução: o Bobby avisa, trabalha com barra de
     * progresso, o progresso vira check e só então confirma.
     * Sem isso a ação parece instantânea demais para ser real.
     */
    const ritual = (action: string, alvo: string, ctx: ContextId, work: () => void) => {
      pushMsg(mk({ role: "ai", content: speechFor(action, "aviso"), ctx, meta: true }));
      setGen("thinking");
      setStages([{ id: "w", label: speechFor(action, "trabalho"), state: "run" }]);
      later(() => {
        work();
        setStages([{ id: "w", label: "Concluído", state: "ok" }]);
      }, 2000);
      later(() => {
        setGen("idle"); setStages([]);
        pushMsg(mk({
          role: "ai", ctx,
          content: speechFor(action, "pronto").replace(/\{alvo\}/g, alvo),
        }));
      }, 2600);
    };

    switch (id) {
      /* ── CORES ── */
      case "color.change": {
        const p = color ? resolvePalette(color) : null;
        if (!p) return false;
        const first = !localStorage.getItem("bobby_palette");
        ritual("color.change", p.name, "design", () => { applyPalette(p); Pulso.enter("cor", p.key); });
        if (first) {
          later(() => pushMsg(mk({
            role: "ai", ctx: "design",
            content: `Olha, eu nem sabia que dava. O Marcos deixou as variáveis abertas em runtime e eu acabei de descobrir que consigo reescrever na hora.\n\nVocê achou uma porta que nem eu conhecia. Pede pra voltar quando quiser desfazer.`,
          })), 3400);
        }
        return true;
      }

      case "color.revert": {
        setGen("thinking");
        later(() => {
          const p = revertPalette();
          setGen("idle");
          pushMsg(mk({
            role: "ai", ctx: "design",
            content: p
              ? `Voltei para **${p.name}**. Uma casa atrás no histórico de cores.`
              : `Desfiz tudo. O chat voltou ao tema original, sem nenhuma cor aplicada por cima.`,
          }));
        }, 800);
        return true;
      }

      case "color.random": {
        // Se citou "tom de X", sugere vizinhas; senão, sorteia três.
        const hint = raw ? findColor(raw) : null;
        const opts = hint ? neighbors(hint, 3) : suggestRandom(3);
        const list = opts.map((o, i) => `${i + 1}. **${o.name}**`).join("\n");
        ask(
          `Cor eu troco na hora. Só não sei qual você quer.\n\nChuto três:\n\n${list}\n\nFala o número, o nome, ou joga outra cor que eu acho o tom mais próximo.`,
          "escolha de cor",
          {
            accepts: ["color.change"],
            match: (t) => {
              const n = t.trim().match(/^([1-3])\b/);
              if (n) return opts[Number(n[1]) - 1].key;
              const c = findColor(t);
              if (c) return c;
              if (/(qualquer|tanto faz|voce escolhe|surpreende|inventa|voce que sabe)/i.test(t)) return "__invent__";
              return null;
            },
            resolve: (answer) => {
              if (answer === "confirm.no") { say("Beleza, deixo como está.", "design", 500); return; }
              if (answer === "__invent__" || answer === "confirm.yes") {
                const p = inventColor();
                applyPalette(p);
                say(`Então eu invento.\n\nCriei **${p.name}** agora — matiz que não estava no catálogo. Já apliquei e salvei como cor nova do sistema.\n\nNinguém mais tem essa. É sua.`, "design", 900);
                return;
              }
              const p = resolvePalette(answer) || (() => {
                const found = opts.find((o) => o.key === answer);
                return found ? inventColor(found.name) : null;
              })();
              if (p) {
                applyPalette(p);
                say(`Feito. **${p.name}** aplicado.`, "design", 700);
              } else say("Não peguei a cor. Tenta pelo nome: vermelho, azul, roxo…", "design", 600);
            },
          },
          "design"
        );
        return true;
      }

      /* ── FONTE: função oculta ── */
      case "font.change": {
        const f = FONTS[Math.floor(Math.random() * FONTS.length)];
        setGen("thinking");
        later(() => {
          const name = applyFont(f.key);
          setGen("idle");
          pushMsg(mk({
            role: "ai", ctx: "design",
            content: `Troquei para **${name}**.\n\nCurioso: esse comando não tem botão em lugar nenhum. Cor o usuário troca pela interface; fonte, não. Só sai daqui, conversando comigo.\n\nO Marcos chama isso de função oculta — coisa que existe mas não se anuncia.`,
          }));
        }, 1000);
        return true;
      }

      /* ── GALERIA com desambiguação ── */
      case "gallery.docs": {
        ask(
          `Opa. Você fala dos **documentos da galeria** ou de algum documento que apareceu **aqui na conversa**?\n\nSão lugares diferentes: a galeria guarda tudo que já passou por aqui; a conversa mostra só o que está nesta sessão.`,
          "qual documento",
          {
            match: (t) => {
              const s = t.toLowerCase();
              if (/(galeria|gallery|pasta|tudo|guardad|salvo|acervo|l[áa]|primeir)/.test(s)) return "galeria";
              if (/(chat|conversa|aqui|sess[ãa]o|agora|esse|segund)/.test(s)) return "chat";
              return null;
            },
            resolve: (answer) => {
              if (answer === "confirm.no") { say("Sem problema. Quando quiser, é só pedir.", "documento", 500); return; }
              if (answer === "chat") {
                const found = messages.flatMap((m) => m.attachments || []);
                say(found.length
                  ? `Nesta conversa tem ${found.length} anexo(s): ${found.map((a) => `\`${a.name}\``).join(", ")}.\n\nOs cards estão logo acima — clica no olho para abrir.`
                  : `Nesta conversa ainda não tem nenhum anexo. Se quiser, arrasta um arquivo ou usa o clipe ali embaixo.`,
                  "documento", 800);
                return;
              }
              ritual("gallery.docs", "Documentos", "documento", () => {
                setGalleryOpen(true);
                window.dispatchEvent(new CustomEvent("gallery:focus", { detail: { cat: "doc" } }));
                Pulso.enter("galeria", "doc");
              });
            },
          },
          "documento"
        );
        return true;
      }

      case "gallery.open":
      case "gallery.protos":
      case "gallery.liked":
      case "gallery.trash": {
        const cat = id === "gallery.protos" ? "proto" : id === "gallery.liked" ? "liked" : id === "gallery.trash" ? "trash" : "all";
        const nome = { proto: "DEV Protótipos", liked: "Mensagens Curtidas", trash: "Lixeira do Chat", all: "tudo" }[cat];
        ritual("gallery.open", nome, "documento", () => {
          setGalleryOpen(true);
          window.dispatchEvent(new CustomEvent("gallery:focus", { detail: { cat } }));
          Pulso.enter("galeria", cat);
        });
        return true;
      }

      /* ── PAINÉIS ── */
      case "panel.rag": setModal("rag"); say("Abri a Base de Conhecimento. Ali você injeta conteúdo, troca o provedor de embeddings e edita o JSON.", "dados", 700); return true;
      case "panel.skills": setModal("renderchat"); say("RenderLab aberto. Cada skill liga e desliga ali — e a mudança vale na hora, inclusive pra mim.", "config", 700); return true;
      case "panel.apikey": setModal("apikey"); say("Testador de chave aberto.", "config", 600); return true;
      case "panel.sentinela":
        ritual("panel.sentinela", "Posto do Sentinela", "seguranca", () => {
          setModal("sentinela"); Pulso.enter("sentinela");
        });
        return true;
      case "chat.history": setLeftOpen(true); say("Histórico aberto à esquerda.", "config", 600); return true;
      case "view.expand": setExpanded(true); say("Expandi. Agora tem espaço de sobra.", "config", 600); return true;
      case "view.collapse": setExpanded(false); say("Voltei pro balão, liberando a página atrás.", "config", 600); return true;

      /* ── DÚVIDA SOBRE ERRO: o easter egg do rodapé ── */
      case "doubt.error": {
        ask(
          `Oxe, claro que erro. Sou uma IA, não um oráculo.\n\nInclusive tem um aviso sobre isso no rodapé que ninguém lê nunca. **Quer ver uma parada?**`,
          "provocação",
          {
            accepts: ["confirm.yes", "confirm.no"],
            resolve: (answer) => {
              if (answer !== "confirm.yes") {
                say("Tudo bem. Mas o aviso continua lá embaixo, esperando alguém com curiosidade.", "chat", 700);
                return;
              }
              window.dispatchEvent(new CustomEvent("bobby:prank"));
              setGen("thinking");
              later(() => {
                setGen("idle");
                pushMsg(mk({
                  role: "ai", ctx: "chat",
                  content: `Pronto. Aquele avisinho que fica escondido no rodapé, agora em tela cheia, com o botão de fechar travado por cinco segundos.\n\nLê com calma. Eu espero.`,
                }));
              }, 1400);
            },
          },
          "chat"
        );
        return true;
      }

      /* ── JOGO OCULTO ── */
      case "fun.game": {
        const g = getGame(raw && /xadrez|velha/i.test(raw) ? "velha" : undefined);
        setGen("thinking");
        setStages([{ id: "j", label: "Procurando… acho que tem algo aqui", state: "run" }]);
        later(() => {
          setGen("idle"); setStages([]);
          pushMsg(mk({
            role: "ai", ctx: "chat",
            content: `Tem sim. Não é anunciado em lugar nenhum, mas tem.\n\n**${g.name}** — ${g.tagline}\n\nAbre no card aqui embaixo. Aviso: eu jogo mal de propósito, às vezes.`,
            proto: { id: "game-" + uid(), name: `${g.id}.html`, lang: "html", code: g.html() },
          }));
        }, 1600);
        return true;
      }

      default: return false;
    }
  }, [pushMsg, ask, messages]);

  /* ══ REAÇÃO DA BOLHA EM ÓRBITA ══
     Só age quando há bolha viva. Palavra solta que fora de órbita
     não significaria nada, aqui vira comando. */
  const orbitReact = useCallback((text: string): boolean => {
    const orb = Pulso.current();
    if (!orb) return false;

    const say = (content: string, ctx: ContextId = "chat", delay = 800) => {
      setGen("thinking");
      later(() => { setGen("idle"); pushMsg(mk({ role: "ai", content, ctx })); }, delay);
    };

    /* ── GALERIA ── */
    if (orb.id === "galeria") {
      // Contagem: "quantos arquivos tem aí?"
      if (Pulso.isCountRequest(text)) {
        const docs = getObDocs().length;
        const prot = protos.length;
        const fin = getVcDocs().length;
        const chats = convs.filter((c) => c.messages.length).length;
        const cur = liked.length;
        const lix = trash.length;
        const total = docs + prot + fin + chats + cur + lix;
        setGen("thinking");
        setStages([{ id: "n", label: "Contando", state: "run" }]);
        later(() => setStages([{ id: "n", label: `${total} itens`, state: "ok" }]), 1500);
        later(() => {
          setGen("idle"); setStages([]);
          Pulso.enter("galeria", orb.focus);
          pushMsg(mk({
            role: "ai", ctx: "documento",
            content: `Vixe, peraí que eu conto…\n\nSão **${total} arquivo(s)** na galeria.\n\nQuer detalhe por pasta? Documentos ${docs}, Protótipos ${prot}, Confirmados ${fin}, Chats ${chats}, Curtidas ${cur}, Lixeira ${lix}.`,
          }));
        }, 2100);
        return true;
      }

      // Prefixo: "prot", "protot", "dev"
      const found = Pulso.resolveItem("galeria", text);
      if (found?.exact) {
        const label = Pulso.ORBITS.galeria.items!.find((i) => i.key === found.exact)!.label;
        ritualLite(`Abrindo ${label}`, () => {
          setGalleryOpen(true);
          window.dispatchEvent(new CustomEvent("gallery:focus", { detail: { cat: found.exact } }));
          Pulso.enter("galeria", found.exact);
        }, `Tá na mão! **${label}** aberto.`, "documento");
        return true;
      }
      if (found?.ambiguous) {
        const n = Pulso.noteRepeat("ambiguo");
        const opts = found.ambiguous.map((a) => `**${a.label}**`).join(" ou ");
        say(n > 2
          ? `Continua ambíguo, hein. Escolhe uma: ${opts}. Ou clica direto na galeria, que é mais rápido.`
          : `Mas qual dev? Tem ${found.ambiguous.length} aí, uai: ${opts}.`,
          "documento", 700);
        return true;
      }
    }

    /* ── CRONÔMETRO ── */
    if (orb.id === "cronometro" && /\b(zera|zerar|reinicia|reset)\b/i.test(text)) {
      const mins = Math.round((Date.now() - sessionStart.current) / 60000);
      ritualLite("Zerando o contador", () => {
        sessionStart.current = Date.now();
        window.dispatchEvent(new CustomEvent("clock:reset"));
      }, `Zerado! Mas entre nós: o tempo real de casa era **${mins} min**. Eu só reiniciei o mostrador — o sistema sabe a soma.`, "config");
      return true;
    }

    /* ── COR: pergunta sobre outros elementos ── */
    if (orb.id === "cor" && /\b(balao|bolha|botao|borda|letra|fonte|fundo|enviar)\b/i.test(text.toLowerCase())) {
      say(`Tudo aqui é variável de tema, então quase tudo eu alcanço: balão, borda, fundo, botão.\n\nO botão de enviar eu mexo, mas ele volta ao normal sozinho — é o único que insiste em ter opinião própria.`, "design", 900);
      Pulso.enter("cor");
      return true;
    }

    return false;
  }, [pushMsg, protos, convs, liked, trash]);

  /** Versão curta do ritual, para reações da bolha. */
  const ritualLite = useCallback((working: string, work: () => void, done: string, ctx: ContextId) => {
    setGen("thinking");
    setStages([{ id: "o", label: working, state: "run" }]);
    later(() => { work(); setStages([{ id: "o", label: "Concluído", state: "ok" }]); }, 1800);
    later(() => { setGen("idle"); setStages([]); pushMsg(mk({ role: "ai", content: done, ctx })); }, 2400);
  }, [pushMsg]);

  /* ── PIPELINE DE GERAÇÃO com thinking visível ── */
  const fullReply = useRef("");
  const pendProto = useRef<Proto | null>(null);
  const pendSources = useRef<Source[] | undefined>(undefined);
  const pendLinks = useRef<LinkMap[]>([]);
  const currentCtx = useRef<ContextId>("chat");
  const pendRagOnly = useRef(false);

  const commitFinal = useCallback((content: string, proto: Proto | null, sources?: Source[]) => {
    pushMsg(mk({
      role: "ai", content, proto: proto || undefined, sources,
      linkMaps: pendLinks.current.length ? pendLinks.current : undefined,
      ctx: currentCtx.current,
      ragOnly: pendRagOnly.current,
    }));
    pendLinks.current = [];
    pendRagOnly.current = false;
    if (proto) setProtos((prev) => { const n = [...prev, proto].slice(-60); ls.set("bobby_protos", n); return n; });
    setStream(""); setStages([]); setGen("idle");
  }, [pushMsg]);

  const send = useCallback((raw: string, atts?: Attachment[], options?: SendOptions) => {
    const text = raw.trim();
    const baseMessages = options?.history ?? messages;
    // O filtro visual tambem recorta o pacote real enviado ao motor.
    const pipelineMessages = contextFilter
      ? baseMessages.filter((m) => m.ts > filterAnchor || m.ctx === contextFilter)
      : baseMessages;

    /* STOP */
    if (gen !== "idle") {
      clearAllTimers();
      if (stream) {
        commitFinal(stream, pendProto.current, pendSources.current);
        pushMsg(mk({ role: "ai", content: pick("cancel", P.cancel), meta: true }));
      } else {
        setStream(""); setStages([]); setGen("idle");
        pushMsg(mk({ role: "ai", content: pick("cancel", P.cancel), meta: true }));
      }
      return;
    }
    if (!text && !atts?.length) return;

    const isFirst = pipelineMessages.length === 0;
    const links = skills.links ? extractLinks(text) : [];

    /* Contexto catalogado na chegada — a resposta herda o mesmo trilho. */
    const turnCtx = classify(text, {
      hasAttachment: !!atts?.length,
      attachmentKind: atts?.[0]?.kind,
      hasLink: links.length > 0,
    });
    currentCtx.current = turnCtx;

    if (!options?.skipUser) pushMsg(mk({ role: "user", content: text, attachments: atts, ctx: turnCtx }));
    if (isFirst && active.title === "Nova sessão" && text) renameSession(text.slice(0, 34));
    resetTyping();

    /* 0a · MOTOR DE INTENÇÕES — verbo + alvo, com todas as flexões */
    const intent = text ? detectIntent(text) : null;

    // Fluxo aberto tem prioridade: a conversa continua de onde parou.
    if (flow.current && intent && (intent.id === "confirm.yes" || intent.id === "confirm.no" || flow.current.accepts?.includes(intent.id))) {
      const step = flow.current;
      flow.current = null;
      setFlowTag(null);
      step.resolve(intent.id, text);
      return;
    }
    if (flow.current && text) {
      const step = flow.current;
      const answered = step.match?.(text);
      if (answered) { flow.current = null; setFlowTag(null); step.resolve(answered, text); return; }
    }

    if (intent && runIntent(intent.id, intent.color, text)) return;

    /* 0a2 · PULSO ETERNO — a bolha em órbita interpreta palavra solta */
    if (text && orbitReact(text)) return;
    if (text) Pulso.pulse(text);

    /* 0b · RISADA — figurinha de reação */
    if (text && /^[\s]*(k{4,}|(ha){3,}|rs{3,}|hehe{2,}|😂|🤣)[\s!.]*$/i.test(text)) {
      const r = pickOne(LAUGH);
      later(() => pushMsg(mk({
        role: "ai", ctx: "chat",
        content: `\`\`\`meme\n${r.art}\n\`\`\`\n${r.say}`,
      })), 600);
      return;
    }

    /* 0f · BUSCA GOOGLE — tres primeiros resultados */
    const searchMatch = text?.match(/^(?:pesquisa|pesquise|busca|busque|procura|procure)(?:\s+(?:no google|na internet|na web))?\s+(?:por\s+|sobre\s+)?(.+)/i);
    if (searchMatch?.[1] && !/\b(chat|conversa|galeria|arquivo)\b/i.test(searchMatch[1])) {
      const query = searchMatch[1].trim();
      setGen("thinking");
      setStages([{ id: "web", label: "Consultando o Google", state: "run" }]);
      void googleSearch(query)
        .then((results) => {
          setStages([{ id: "web", label: `${results.length} resultados localizados`, state: "ok" }]);
          later(() => {
            setGen("idle"); setStages([]);
            pushMsg(mk({
              role: "ai", ctx: "web",
              content: results.length
                ? `Separei os **3 primeiros resultados** para **${query}**. Clique em qualquer card para abrir; o link abaixo leva ao restante da pesquisa.`
                : `O Google nao devolveu resultados para **${query}**.`,
              searchResults: results,
            }));
          }, 450);
        })
        .catch((e) => {
          setGen("idle"); setStages([]);
          pushMsg(mk({ role: "ai", ctx: "web", content: `Nao consegui pesquisar agora: ${(e as Error).message}` }));
        });
      return;
    }

    /* 0e · GERENCIAMENTO DE CHATS POR LINGUAGEM NATURAL */
    if (text && /\b(apaga|apagar|exclui|excluir|deleta|deletar|remove|remover)\b/i.test(text)
        && /\b(chat|chats|conversa|conversas)\b/i.test(text)) {
      const targets = resolveChats(text, convs, activeId);
      if (!targets.length) {
        pushMsg(mk({
          role: "ai", ctx: "config",
          content: "Nao localizei qual conversa voce quis apagar. Tente pelo titulo, pela data ou pela posicao: **apaga o terceiro chat**, por exemplo.",
        }));
      } else {
        const label = targets.length === 1 ? targets[0].title : `${targets.length} conversas`;
        pushMsg(mk({
          role: "ai", ctx: "config",
          content: `Localizei **${label}**. Antes de mover para a Lixeira do Chat, preciso da sua confirmacao.`,
          confirm: {
            id: "confirm-" + uid(), kind: "delete-chats",
            targetIds: targets.map((c) => c.id), label,
          },
        }));
      }
      return;
    }

    if (text && /\b(renomeia|renomear|muda o nome|troca o nome)\b/i.test(text)
        && /\b(chat|conversa)\b/i.test(text)) {
      const match = text.match(/\b(?:para|pra|como)\s+["']?(.+?)["']?\s*$/i);
      const newName = match?.[1]?.trim().slice(0, 60);
      const reference = match ? text.slice(0, match.index) : text;
      const targets = resolveChats(reference, convs, activeId);
      const target = targets[0] || active;
      if (!newName) {
        pushMsg(mk({ role: "ai", ctx: "config", content: "Encontrei a conversa, mas faltou o nome novo. Use: **renomeia o terceiro chat para Projeto Atlas**." }));
      } else {
        setConvs((prev) => prev.map((c) => c.id === target.id ? { ...c, title: newName } : c));
        pushMsg(mk({ role: "ai", ctx: "config", content: `Pronto. **${target.title}** agora se chama **${newName}**.` }));
      }
      return;
    }

    /* 0d · FÁBRICA DE PDF */
    if (text && /\b(pdf|documento bonito|relat[óo]rio|gera(r)? um doc|monta(r)? um doc|imprim)/i.test(text)
        && /\b(faz|gera|monta|cria|quero|preciso|manda)/i.test(text)) {
      setGen("thinking");
      setStages([{ id: "pdf", label: "Escolhendo tema e blocos do documento", state: "run" }]);
      later(() => setStages([{ id: "pdf", label: "Montando o HTML de impressão", state: "ok" }]), 900);
      later(async () => {
        setGen("idle"); setStages([]);
        const title = text.replace(/^.*?(pdf|documento|relat[óo]rio)\s*(sobre|de|do|da)?\s*/i, "").trim() || active.title;
        try {
          const blob = await generatePdf({
            title: title.slice(0, 90),
            subtitle: "Documento gerado automaticamente pelo Bobby",
            session: active.title,
            messages: messages.length,
            docs: RAG.stats().docs,
            chunks: RAG.stats().chunks,
            theme: "editorial",
          });
          const assetId = "pdf-" + uid();
          if (!(await saveAsset(assetId, blob))) throw new Error("O navegador recusou o armazenamento do arquivo.");
          pushMsg(mk({
            role: "ai", ctx: "documento",
            content: `Pronto. Entreguei **${title}** como PDF de verdade, com 3 paginas, capa, indicadores, tabela, linha do tempo e barras.\n\nO codigo de montagem fica interno ao sistema. Voce recebe apenas o documento final: abra no olho ou baixe.`,
            attachments: [{
              id: assetId, assetId,
              name: `${title.replace(/[^\w\d-]+/g, "-").replace(/^-|-$/g, "").slice(0, 52) || "documento"}.pdf`,
              ext: "pdf", label: "PDF", color: "#dc2626",
              size: blob.size,
              content: `[PDF gerado pelo Bobby]\nTitulo: ${title}\nSessao: ${active.title}\nPaginas: 3`,
              kind: "pdf",
            }],
          }));
        } catch (e) {
          pushMsg(mk({
            role: "ai", ctx: "documento",
            content: `Nao consegui fabricar o PDF agora: ${(e as Error).message}\n\nO pedido ficou registrado; tente novamente ou abra a configuracao de armazenamento.`,
          }));
        }
      }, 1700);
      return;
    }

    /* 0c · TROCA DE CONTEXTO POR PEDIDO */
    const ctxReq = text ? matchContextRequest(text) : null;
    if (ctxReq) {
      setGen("thinking");
      setStages([{ id: "cx", label: "Reorganizando o contexto da conversa", state: "run" }]);
      later(() => {
        setGen("idle"); setStages([]);
        if (ctxReq === "__off__") {
          setContextFilter(null);
          pushMsg(mk({
            role: "ai", ctx: "config",
            content: "Filtro removido. Voltei a enxergar a conversa inteira, na ordem em que ela aconteceu — tudo que ficou pra trás está de volta na minha memória.",
          }));
        } else {
          setContextFilter(ctxReq);
          const d = CTX[ctxReq];
          pushMsg(mk({
            role: "ai", ctx: ctxReq,
            content: `Pronto, foquei em **${d.label}**.\n\nAviso importante: enquanto esse filtro estiver ligado, eu **não vou lembrar dos outros contextos** que a gente conversou antes. Minha atenção fica só nesse assunto — o resto do histórico sai do meu campo de visão.\n\nMensagens novas continuam livres pra mudar de rumo. Quando quiser tudo de volta, é só pedir ou clicar no ✕ do seletor.`,
          }));
        }
      }, 900);
      return;
    }

    /* 0 · TOOLS — a IA operando a própria interface */
    const tool = text ? matchTool(text) : null;
    if (tool) {
      setGen("thinking");
      const stall = pickOne(STALL);
      setStages([{ id: "tool", label: "Interpretando comando de interface", state: "run" }]);
      // Enrolada curta: dá a sensação de alguém indo buscar de verdade.
      later(() => pushMsg(mk({ role: "ai", content: stall, meta: true, ctx: "config" })), 260);
      later(() => {
        const def = TOOLS.find((x) => x.id === tool.id);
        setStages([{ id: "tool", label: `Ação: ${def?.name || tool.id}`, state: "ok" }]);
      }, 900);
      later(() => {
        setGen("idle"); setStages([]);
        const confirmation = runTool(tool);

        // Renome usa o ritual completo: aviso, trabalho, check, confirmação.
        if (confirmation.startsWith("__RITUAL_RENAME__")) {
          const novo = confirmation.replace("__RITUAL_RENAME__", "");
          pushMsg(mk({ role: "ai", content: speechFor("chat.rename", "aviso"), ctx: "config", meta: true }));
          setGen("thinking");
          setStages([{ id: "r", label: speechFor("chat.rename", "trabalho"), state: "run" }]);
          later(() => { renameSession(novo); setStages([{ id: "r", label: "Concluído", state: "ok" }]); }, 2000);
          later(() => {
            setGen("idle"); setStages([]);
            Pulso.enter("conversa");
            pushMsg(mk({ role: "ai", ctx: "config", tool: tool.id, content: speechFor("chat.rename", "pronto").replace(/\{alvo\}/g, novo) }));
          }, 2600);
          return;
        }
        if (confirmation === "__ASK_NAME__") {
          pushMsg(mk({ role: "ai", ctx: "config", content: "Renomear eu renomeio. Só falta o nome novo." }));
          Pulso.enter("conversa");
          return;
        }
        pushMsg(mk({ role: "ai", content: confirmation, tool: tool.id, ctx: "config" }));
      }, 1500);
      return;
    }

    const speedFactor = skills.turbo ? 0.35 : 1;
    const S = (id: string, label: string, state: Stage["state"] = "run") =>
      setStages((p) => [...p.filter((x) => x.id !== id), { id, label, state }]);
    const done = (id: string, label: string, state: Stage["state"] = "ok") =>
      setStages((p) => p.map((x) => (x.id === id ? { id, label, state } : x)));

    setGen("thinking"); setStages([]);
    let clock = 0;
    const step = (ms: number, fn: () => void) => { clock += ms * speedFactor; later(fn, clock); };

    /* 1 · Sentinela */
    if (skills.sentinela) {
      S("sent", pick("st-sent", P.stages.sentinela));
      const recent = pipelineMessages.filter((m) => m.role === "user").slice(-4).map((m) => m.content);
      const scfg = loadSentinelaCfg();
      let verdict = inspect(text, recent);

      // Regras desligadas no painel do Sentinela não barram.
      if (!verdict.ok && scfg.rules[verdict.reason] === false) verdict = { ok: true, reason: null };

      // Termos extras banidos pelo painel.
      const lower = text.toLowerCase();
      if (verdict.ok && scfg.customBlocked.some((t) => t && lower.includes(t.toLowerCase()))) {
        verdict = {
          ok: false, reason: "impróprio",
          message: "**Sentinela interceptou.** Esse termo está na lista de bloqueio configurada para este perímetro.",
        };
      }
      // Allowlist tem a palavra final.
      if (!verdict.ok && scfg.allowlist.some((t) => t && lower.includes(t.toLowerCase())))
        verdict = { ok: true, reason: null };

      if (!verdict.ok) {
        slog("block", verdict.reason, `Mensagem barrada na entrada: ${verdict.reason}.`, { sample: text, severity: "grave" });
      } else if (scfg.logEverything) {
        slog("pass", "liberado", "Mensagem inspecionada e liberada para o motor.", { sample: text });
      }

      if (!verdict.ok) {
        step(560, () => {
          done("sent", `Ameaça detectada: ${verdict.reason}`, "warn");
        });
        step(420, () => {
          setBlocked((b) => b + 1); setGen("idle"); setStages([]);
          pushMsg(mk({ role: "ai", content: verdict.message, flag: verdict.reason, ctx: "seguranca" }));
        });
        return;
      }
      step(500, () => done("sent", pick("st-safe", P.stages.safe)));
    }

    /* 2 · Links */
    let maps: LinkMap[] = [];
    let webJob: Promise<void> | null = null;
    if (links.length) {
      step(180, () => S("link", `Mapeando ${links.length} link${links.length > 1 ? "s" : ""}`));
      step(620, () => {
        maps = links.map(mapLink);
        maps.forEach((m) => slog("web", "leitura externa", `Página ${m.host} lida pelo mapeador.`, { sample: m.url }));
        webJob = Promise.all(maps.map(async (map) => {
          const read = await readWebPage(map.url);
          if (read.text) {
            map.extractedText = read.text.slice(0, 6_000);
            const clean = read.text.replace(/^Title:.*\n|^URL Source:.*\n|^Markdown Content:.*\n/gm, "").trim();
            map.summary = clean.slice(0, 420).replace(/\s+/g, " ") + (clean.length > 420 ? "..." : "");
          } else map.readError = read.error;
        })).then(() => {
          pendLinks.current = maps;
          RAG.syncRuntimeDocs("web", maps
            .filter((m) => m.extractedText)
            .map((m) => ({ id: m.url, title: `Web: ${m.title}`, body: m.extractedText!, tags: ["web", m.host] })));
          done("link", `${maps.filter((m) => m.extractedText).length}/${maps.length} pagina(s) lida(s)`);
        });
      });
    }

    /* 3 · RAG — remoto quando o índice existir, local caso contrário */
    let hits: Source[] = [];
    let ragJob: Promise<void> | null = null;
    if (skills.rag) {
      const query = text || (atts?.[0]?.name ?? "");
      step(180, () => S("rag", pick("st-mem", P.stages.memory)));
      step(560, () => {
        ragJob = RAG.retrieveAsync(query, 3).then((r) => {
          hits = r.map((h) => ({ title: h.title, docId: h.docId, score: h.score }));
          // Resposta montada sobre trechos da base, sem síntese de modelo externo.
          pendRagOnly.current = r.length > 0;
          done(
            "rag",
            r.length ? `${pick("st-found", P.stages.found)} · ${r.length} trecho(s)` : pick("st-nf", P.stages.notFound),
            r.length ? "ok" : "warn"
          );
        });
      });
    }

    /* 4 · Bobby */
    step(200, () => S("call", pick("st-call", P.stages.calling)));
    step(340, () => { done("call", "Pacote entregue"); S("think", pick("st-think", P.stages.thinking)); });

    // Bobby pensa mais: a pausa dá peso à resposta.
    step(skills.turbo ? 700 : 1900 + Math.random() * 900, async () => {
      // Espera o retrieval remoto antes de responder, sem travar a UI.
      if (ragJob) await ragJob;
      if (webJob) await webJob;
      const reply = bobbyReply(text, {
        msgCount: pipelineMessages.length, skills, attachments: atts, linkMaps: maps, typing, origin,
        retrieved: hits,
      });
      const old = [...pipelineMessages].reverse().find((m) => m.role === "user" && ageLabel(m.ts));
      const age = old ? ageLabel(old.ts) : null;
      const agePrefix = age ? `${pickOne(AGE_OPENERS)} Essa parte vem ${age}.\n\n` : "";
      fullReply.current = agePrefix + reply.text;
      pendProto.current = reply.proto || null;
      pendSources.current = reply.sources || (hits.length ? hits : undefined);
      done("think", "Resposta estruturada");
      S("type", P.stages.typing[0]);
      setGen("streaming"); setStream("");
      // ...e digita mais rápido: leitura fluida, sem espera arrastada.
      let i = 0;
      const sp = skills.turbo ? 14 : 6 + Math.floor(Math.random() * 3);
      typeTimer.current = setInterval(() => {
        i += sp;
        if (i >= fullReply.current.length) {
          clearAllTimers();
          commitFinal(fullReply.current, pendProto.current, pendSources.current);
        } else setStream(fullReply.current.slice(0, i));
      }, 12);
    });
  }, [gen, stream, skills, messages, contextFilter, filterAnchor, active.title, typing, origin, pushMsg, renameSession, commitFinal, clearAllTimers, resetTyping]);

  /* ── anexos ── */
  const attachFiles = useCallback(async (files: FileList | File[]) => {
    const selected = Array.from(files);
    const list = selected.slice(0, MAX_FILES);
    if (!list.length) return;
    const atts: Attachment[] = [];
    const rejected: string[] = selected.length > MAX_FILES
      ? [`somente os ${MAX_FILES} primeiros arquivos foram considerados`]
      : [];
    const acceptedFiles: File[] = [];

    for (const f of list) {
      const L = langOf(f.name);
      const img = isImageFile(f.name);
      const pdf = isPdf(f.name);
      const limit = img ? MAX_IMAGE_BYTES : pdf ? MAX_PDF_BYTES : MAX_TEXT_BYTES;
      if (f.size > limit) {
        rejected.push(`${f.name} excede o limite de ${(limit / 1024 / 1024).toFixed(0)} MB`);
        continue;
      }
      let content = "";
      let dataUrl: string | undefined;
      const assetId = uid();

      if (img) { dataUrl = await fileToDataUrl(f); content = `[imagem ${f.name}]`; }
      else if (pdf) {
        // Guarda o binário original para download e o texto separado para preview/RAG.
        dataUrl = await fileToDataUrl(f);
        content = skills.pdf ? await transcribePdf(f) : "[PDF anexado — skill de transcrição desligada]";
      }
      else content = (await f.text()).slice(0, 200000);

      if ((img || pdf) && !(await saveAsset(assetId, f))) {
        rejected.push(`${f.name} não pôde ser persistido no navegador`);
        continue;
      }

      atts.push({
        id: assetId, assetId: img || pdf ? assetId : undefined,
        name: f.name, ext: L.ext, label: L.label, color: L.color,
        size: f.size, content, dataUrl,
        kind: img ? "image" : pdf ? "pdf" : ["txt", "md"].includes(L.ext) ? "text" : "code",
      });

      const docs = ls.get<{ id: string; name: string; content: string; meta: string }[]>("ob_docs", []);
      docs.push({ id: uid(), name: f.name, content: content.slice(0, 120000), meta: new Date().toLocaleDateString("pt-BR") });
      if (!ls.set("ob_docs", docs.slice(-50))) {
        setStorageWarning(`O card de ${f.name} abriu, mas a cópia da pasta Documentos não coube no armazenamento local.`);
      } else {
        bumpDocs();
      }
      acceptedFiles.push(f);
    }

    if (atts.length) send("", atts);
    if (rejected.length) {
      pushMsg(mk({
        role: "ai", meta: true,
        content: `Anexo não processado: ${rejected.join("; ")}.`,
      }));
    }
    if (!atts.length) return;

    /* ── VISÃO: leitura real da imagem pelo Gemini ── */
    const file = acceptedFiles.find((f) => isImageFile(f.name));
    if (!file) return;

    if (!skills.vision) {
      later(() => pushMsg(mk({
        role: "ai", meta: true,
        content: "A skill de Visão está desligada no RenderLab — a imagem foi só arquivada.",
      })), 900);
      return;
    }
    if (!apiKey) {
      later(() => pushMsg(mk({
        role: "ai",
        content: "Recebi a imagem, mas a **Visão** precisa de uma chave do Gemini pra funcionar.\n\nClica no botão flutuante **API** no canto inferior esquerdo, cola a chave e testa. Depois reenvia a imagem que eu descrevo o conteúdo.",
      })), 900);
      return;
    }
    if (visionUsed >= VISION_LIMIT) {
      later(() => pushMsg(mk({
        role: "ai", meta: true,
        content: `Limite de ${VISION_LIMIT} leituras de imagem por sessão atingido. Recarregue a página para zerar a cota.`,
      })), 900);
      return;
    }

    // Estágio visível enquanto a API responde.
    setVisionUsed((v) => v + 1);
    slog("vision", "visão externa", `Imagem ${file.name} enviada ao provedor de visão.`, { severity: "aviso" });
    setStages([{ id: "vision", label: "Gemini lendo a imagem", state: "run" }]);
    setGen("thinking");

    const result = await describeImage(file, apiKey);

    setStages([{
      id: "vision",
      label: result.ok ? "Imagem interpretada" : "Visão indisponível",
      state: result.ok ? "ok" : "warn",
    }]);

    later(() => {
      setGen("idle"); setStages([]);
      const restantes = Math.max(0, VISION_LIMIT - visionUsed - 1);
      pushMsg(mk({
        role: "ai",
        ctx: "imagem",
        content: result.ok
          ? `**Visão · leitura de ${file.name}**\n\n${result.text}\n\n_Restam ${restantes} leitura(s) de imagem nesta sessão._`
          : `**Não consegui ler a imagem.** ${result.text}\n\nChecagem rápida: a chave precisa ser do Google AI Studio e ter a Generative Language API liberada. Testa ela no botão **API** — se listar os modelos, o problema é outro e eu investigo. O arquivo segue salvo na galeria de qualquer forma.`,
      }));
    }, 520);
  }, [send, skills.pdf, skills.vision, apiKey, visionUsed, bumpDocs, pushMsg]);

  /* ── editar mensagem → branch ── */
  const editMessage = useCallback((id: string, text: string) => {
    resetGen();
    const mi = active.messages.findIndex((m) => m.id === id);
    if (mi === -1) return;

    let branches = (active.branches || 0) + 1;
    let history = active.messages.slice(0, mi);

    // Mantém no máximo três tentativas recentes. Na quarta, remove as duas
    // ramificações anteriores antes de iniciar uma nova sequência limpa.
    if (branches > 3) {
      history = history.filter((m) => !m.branch || m.branch === 1);
      branches = 1;
    }

    const edited: Msg = {
      ...active.messages[mi], content: text.trim(), ts: Date.now(), branch: branches,
    };
    const branchHistory = [...history, edited];

    setConvs((prev) => prev.map((c) =>
      c.id === activeId ? { ...c, messages: branchHistory, branches } : c
    ));

    // O usuário já foi inserido acima; não duplica a mensagem no novo branch.
    later(() => send(text, undefined, { skipUser: true, history: branchHistory }), 60);
  }, [active, activeId, send, resetGen]);

  const updateAttachment = useCallback((id: string, name: string, content: string) => {
    const update = (c: Conv) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        attachments: m.attachments?.map((a) => a.id === id
          ? { ...a, name, content, size: new Blob([content]).size, ext: name.split(".").pop()?.toLowerCase() || a.ext }
          : a),
      })),
    });
    setConvs((prev) => prev.map(update));
    setTrash((prev) => prev.map((c) => ({ ...update(c), deletedAt: c.deletedAt })));
    bumpDocs();
  }, [bumpDocs]);

  const openGalleryWindow = useCallback(() => { setRightOpen(false); setGalleryOpen(true); }, []);

  /* ── body classes ── */
  useEffect(() => {
    const b = document.body.classList;
    b.toggle("is-expanded", expanded);
    b.toggle("panel-left-open", leftOpen);
    b.toggle("panel-right-open", rightOpen);
    b.toggle("gallery-open", galleryOpen);
    b.toggle("panels-swapped", swapped);
    b.remove("layout-fullscreen", "layout-90", "layout-centered");
    b.add(`layout-${layout}`);
    b.remove("theme-creme", "theme-uva");
    b.add(`theme-${theme}`);
  }, [expanded, layout, leftOpen, rightOpen, galleryOpen, theme, swapped]);

  /* ── cronômetro da sessão ──
     Fica FORA do contexto: o componente Clock assina sozinho.
     Antes isso re-renderizava a árvore inteira a cada segundo. */
  const sessionStart = useRef(Date.now());
  const clock = "";
  const sessionTime = "";

  const msgCount = messages.length;
  const charCount = useMemo(() => messages.reduce((a, m) => a + m.content.length, 0), [messages]);

  /**
   * Recorte por contexto: o que veio antes do clique é filtrado pelo
   * assunto; o que chega depois aparece sempre, para a pessoa enxergar
   * a conversa mudando de trilho.
   */
  const visibleMessages = useMemo(() => {
    if (!contextFilter) return messages;
    return messages.filter((m) => m.ts > filterAnchor || m.ctx === contextFilter);
  }, [messages, contextFilter, filterAnchor]);

  /* ── URL params ── */
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; ran.current = true;
    const p = new URLSearchParams(window.location.search);
    const wantExp = p.has("expanded");
    const preMsg = p.get("msg");
    if (wantExp) { setExpanded(true); setLayout("90"); }
    if (wantExp || preMsg) window.history.replaceState({}, "", window.location.pathname);
    if (preMsg) setTimeout(() => send(preMsg), 1300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  const value: Store = {
    origin,
    expanded, setExpanded, layout, setLayout,
    leftOpen, rightOpen, galleryOpen, setLeftOpen, setRightOpen, setGalleryOpen, openGalleryWindow,
    swapped, toggleSwap,
    modal, setModal, docModal, setDocModal, lang, setLang, t,
    convs, active, activeId, messages, newChat, selectConv, deleteConv, deleteMany,
    renameSession, clearCache, trash, restoreConv, purgeTrash,
    liked, toggleLike, unlike, likedNew, seenLiked, flyToGallery,
    pushSystem: (content, ctx = "chat") => pushMsg(mk({ role: "ai", content, ctx })),
    flowTag,
    sealOf: (id) => seals[id] || "held",
    setSeal: (id, s) => setSeals((prev) => {
      const next = { ...prev, [id]: s };
      ls.set("bobby_seals", next);
      slog(
        s === "released" ? "release" : "deny",
        s === "released" ? "liberado pelo usuário" : "bloqueio definitivo",
        s === "released"
          ? "Código retido foi autorizado por assinatura do usuário."
          : "Usuário negou a liberação. O anexo fica lacrado nesta conversa.",
        { severity: s === "released" ? "aviso" : "grave" }
      );
      return next;
    }),
    gen, stream, stages, send, attachFiles, editMessage, updateAttachment, resolveConfirmation,
    skills, toggleSkill, apiKey, setApiKey, visionUsed,
    clock, msgCount, charCount, sessionTime, blocked,
    typing, noteTyping, resetTyping,
    protos, docsVersion, bumpDocs, removeProtos, removeAttachments, ragVersion, bumpRag,
    storageWarning, dismissStorageWarning: () => setStorageWarning(""),
    theme, setTheme, cycleTheme,
    contextFilter, setContextFilter, filterAnchor, visibleMessages,
    panelHint, flyToPanel, clearPanelHint,
    siteView, openSite, closeSite,
    embedCfg, setEmbedCfg,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
