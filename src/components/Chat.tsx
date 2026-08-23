import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  Pencil, Maximize, RectangleHorizontal, Square, Paperclip, SendHorizonal,
  Zap, ShieldCheck, MoreHorizontal, Settings2, Trash2, Download, Sparkles,
  FileCode2, ExternalLink, CheckCircle2, BookOpen, Database, ShieldAlert,
  FileSearch, Heart, Check, X, Link2, FileText, Image as ImgIcon, Eye, GitBranch,
  Globe, PanelRight, Wrench, Binary, Copy, FolderOpen, Play,
} from "lucide-react";
import { langOf, mapLink, type LinkMap } from "../lib/skills";
import { useBobby } from "../lib/store";
import { CTX } from "../lib/contexts";
import { ContextStamp, ContextPanel, CtxIcon } from "./ContextTag";
import Clock from "./Clock";
import OrbitBubble from "./OrbitBubble";
import QuarantineCard from "./Quarantine";
import { scanCode } from "../lib/quarantine";
import type { WebResult } from "../lib/webSearch";
import Thinking from "./Thinking";
import { confirmProto, openInTab } from "../lib/gallery";
import * as RAG from "../lib/rag";
import type { Attachment, LayoutMode, Msg, Proto } from "../lib/types";
import bobbyAvatar from "../../public/bobby-avatar.png";
import { getAsset, getAssetUrl } from "../lib/blobStore";

/* Bloco de código com título e botão de copiar */
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [ok, setOk] = useState(false);
  const L = langOf(`x.${lang || "txt"}`);
  return (
    <div className="code-block">
      <div className="code-hd">
        <span className="code-dot" style={{ background: L.color }} />
        <span className="code-lang">{L.label}</span>
        <span className="code-lines">{code.split("\n").length} linhas</span>
        <button
          className={`code-copy${ok ? " ok" : ""}`}
          data-tip={ok ? "Copiado" : "Copiar código"}
          onClick={async () => {
            try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1500); }
            catch { /* negado */ }
          }}
        >
          {ok ? <Check size={11} strokeWidth={3} /> : <Copy size={11} strokeWidth={2} />}
        </button>
      </div>
      <pre className="code-body"><code>{code}</code></pre>
    </div>
  );
}

/* markdown mínimo: **negrito**, `code`, meme e bloco de código */
function rich(text: string) {
  const meme = text.match(/^```meme\n([\s\S]*?)\n```\n?([\s\S]*)$/);
  if (meme) {
    return (
      <>
        <div className="meme-block">{meme[1]}</div>
        {meme[2] && <div style={{ marginTop: 8 }}>{rich(meme[2])}</div>}
      </>
    );
  }

  // Blocos cercados viram cartão de código
  if (/```/.test(text)) {
    const parts = text.split(/```(\w*)\n([\s\S]*?)```/g);
    const out: ReactElement[] = [];
    for (let i = 0; i < parts.length; i += 3) {
      if (parts[i]) out.push(<span key={`t${i}`}>{rich(parts[i])}</span>);
      if (parts[i + 2] !== undefined)
        out.push(<CodeBlock key={`c${i}`} lang={parts[i + 1] || "txt"} code={parts[i + 2].trimEnd()} />);
    }
    return <>{out}</>;
  }
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={{ color: "var(--navy)" }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="inline-code">{p.slice(1, -1)}</code>;
    if (p.startsWith("_") && p.endsWith("_"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  });
}

/* ════ WELCOME ════ */
function WelcomeCard() {
  const { origin } = useBobby();
  const st = RAG.stats();
  return (
    <div className="welcome-card">
      <div className="wc-header">
        <div className="wc-avatar"><img src={bobbyAvatar} alt="Bobby" /></div>
        <div className="wc-info">
          <div className="wc-name">Bobby</div>
          <div className="wc-role">ASSISTENTE OFICIAL · RENDER NEXUS</div>
        </div>
        <div className="wc-status"><span className="wc-status-dot" />online</div>
      </div>
      <div className="wc-text">
        Sou o assistente do portfólio do <strong>Marcos Eduardo</strong>, dev orquestrador de IA.
        Respondo com <strong>busca vetorial</strong> nos projetos, passo tudo pelo <strong>Sentinela</strong>{" "}
        e falo sem florear.
      </div>
      <div className="wc-entry">
        {origin === "home"
          ? "Entrada: página inicial · mensagem recebida com a navegação"
          : "Entrada: balão flutuante · contexto da página preservado"}
      </div>
      <div className="wc-model">
        bobby-motor-1.0 · RAG {st.docs} docs / {st.chunks} chunks / {st.dim}d · pt-BR
      </div>
    </div>
  );
}

const SUGGESTIONS = ["Me fala sobre o Marcos", "Como funciona o Sentinela?", "O que é o RenderLab?", "Faz um protótipo"];

/**
 * Extrai um trecho de código embutido numa frase.
 * "olha isso: <div>x</div>" → devolve só o código, sem o comentário.
 */
function extractCode(text: string): { code: string; rest: string } | null {
  const fenced = text.match(/```[\w]*\n?([\s\S]+?)```/);
  if (fenced) return { code: fenced[1].trim(), rest: text.replace(fenced[0], "").trim() };

  const lines = text.split("\n");
  const isCodeLine = (l: string) =>
    /[{};=<>]|^\s{2,}\S|^\s*(const|let|var|function|class|def|import|export|return|if|for|while|SELECT|INSERT|public|private)\b/.test(l);

  let start = -1, end = -1;
  lines.forEach((l, i) => {
    if (isCodeLine(l)) { if (start === -1) start = i; end = i; }
  });
  if (start === -1) return null;

  const block = lines.slice(start, end + 1).join("\n").trim();
  // Precisa ser bloco de verdade, não uma frase com sinal solto.
  if (block.length < 24) return null;
  const density = (block.match(/[{};=<>()]/g) || []).length / block.length;
  if (density < 0.02) return null;

  const rest = [...lines.slice(0, start), ...lines.slice(end + 1)].join(" ").trim();
  return { code: block, rest };
}

/** Reconhece se o texto colado é código e qual a linguagem. */
function sniffCode(t: string): string | null {
  const s = t.trim();
  if (s.length < 12) return null;
  const has = (re: RegExp) => re.test(s);

  // Sinais fortes que valem mesmo em trechos curtos
  if (has(/^\s*[[{][\s\S]*[\]}]\s*$/) && has(/["'\d]\s*[,:]/)) return "json";
  if (has(/\b(const|let|var)\s+\w+\s*=\s*\[/)) return "js";
  if (has(/\b\w+\s*=\s*\[[\s\S]*\]/) && has(/[,;]/)) return "py";
  if (has(/^\s*<!DOCTYPE html|^\s*<html[\s>]/i)) return "html";
  if (has(/<\/(div|span|section|body|head|p|button)>/i) && has(/<[a-z]+[\s>]/i)) return "html";
  if (has(/^\s*(import|export)\s|=>\s*\{|const\s+\w+\s*=|function\s+\w+\s*\(/m) && has(/[;{}]/)) {
    return has(/:\s*(string|number|boolean|any)\b|interface\s+\w+|type\s+\w+\s*=/) ? "ts" : "js";
  }
  if (has(/^\s*(def|class)\s+\w+.*:\s*$/m) || has(/^\s*(from|import)\s+\w+/m) && has(/:\s*$/m)) return "py";
  if (has(/^\s*(public|private|protected)\s+(class|static|void)/m)) return "java";
  if (has(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b/im)) return "sql";
  if (has(/^\s*[.#][\w-]+\s*\{[\s\S]*?\}/m) || has(/^\s*[\w-]+\s*:\s*[^;]+;/m) && has(/\{[\s\S]*\}/)) return "css";
  if (has(/^\s*[[{][\s\S]*[\]}]\s*$/) && has(/"[^"]+"\s*:/)) return "json";
  if (has(/^\s*#!\/|^\s*(sudo|npm|yarn|git|cd|mkdir)\s/m)) return "sh";
  return null;
}

type AttachKind = "all" | "image" | "doc" | "code";
const ACCEPT: Record<AttachKind, string> = {
  all: ".js,.jsx,.ts,.tsx,.py,.java,.html,.css,.json,.md,.txt,.sql,.sh,.go,.rb,.php,.c,.cpp,.cs,.pdf,.png,.jpg,.jpeg,.webp",
  image: ".png,.jpg,.jpeg,.webp,.gif",
  doc: ".pdf,.txt,.md,.json,.csv",
  code: ".js,.jsx,.ts,.tsx,.py,.java,.html,.css,.sql,.sh,.go,.rb,.php,.c,.cpp,.cs",
};



/* ════ CARD DE DOCUMENTO ════ */
function DocCard({ att }: { att: Attachment }) {
  const { setDocModal, skills, bumpRag, openGalleryWindow, sealOf } = useBobby();

  // Código colado fica retido até o usuário assinar a liberação.
  const scan = useMemo(
    () => (att.kind === "code" ? scanCode(att.content, att.ext) : null),
    [att.kind, att.content, att.ext]
  );
  const sealed = scan && sealOf(att.id) !== "released";
  const [assetUrl, setAssetUrl] = useState(att.dataUrl);
  const [copied, setCopied] = useState(false);
  const [indexed, setIndexed] = useState(() =>
    RAG.listDocs().some((d) => d.origin === "user" && d.title === att.name && d.body === att.content)
  );

  useEffect(() => {
    if (assetUrl || !att.assetId || att.kind !== "image") return;
    let live = true;
    let objectUrl = "";
    void getAssetUrl(att.assetId).then((url) => {
      if (!live || !url) return;
      objectUrl = url;
      setAssetUrl(url);
    });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetUrl, att.assetId, att.kind]);

  if (sealed) return <QuarantineCard att={att} scan={scan!} />;
  if (!skills.doccard) return <div className="att-plain">{att.name}</div>;

  const download = async () => {
    const a = document.createElement("a");
    const persisted = att.assetId ? await getAsset(att.assetId) : null;
    const objectUrl = persisted ? URL.createObjectURL(persisted) : "";
    a.href = assetUrl || objectUrl || URL.createObjectURL(new Blob([att.content], { type: "text/plain" }));
    a.download = att.name; a.click();
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const openViewer = () => setDocModal({ ...att, dataUrl: assetUrl });
  const openInGallery = () => {
    openGalleryWindow();
    setTimeout(() => window.dispatchEvent(new CustomEvent("gallery:focus", { detail: { cat: "doc", query: att.name } })), 30);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(att.content); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { /* clipboard negado */ }
  };

  const indexInRag = () => {
    if (indexed || att.kind === "image" || !att.content.trim()) return;
    RAG.addDoc(att.name, att.content, [att.label, att.ext, "anexo"]);
    bumpRag();
    setIndexed(true);
  };

  return (
    <div className="doc-card" style={{ borderLeftColor: att.color }}>
      {att.kind === "image" && assetUrl && (
        <img className="doc-thumb" src={assetUrl} alt={att.name} onClick={openViewer} />
      )}
      <div className="doc-main">
        <div className="doc-ico" style={{ background: att.color + "1f", color: att.color }}>
          {att.kind === "image" ? <ImgIcon size={14} strokeWidth={2} />
            : att.kind === "pdf" ? <FileText size={14} strokeWidth={2} />
            : <FileCode2 size={14} strokeWidth={2} />}
        </div>
        <div className="doc-txt">
          <div className="doc-name">{att.name}</div>
          <div className="doc-meta">
            <span style={{ color: att.color, fontWeight: 700 }}>{att.label}</span>
            {" · "}{(att.size / 1024).toFixed(1)} KB
          </div>
        </div>
        <div className="doc-acts">
          {att.kind !== "image" && (
            <>
              <button className={`doc-btn${copied ? " on" : ""}`} onClick={copy} data-tip={copied ? "Copiado" : "Copiar conteúdo"}>
                {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
              </button>
              <button
                className={`doc-btn${indexed ? " on" : ""}`}
                onClick={indexInRag}
                data-tip={indexed ? "Já indexado no RAG" : "Indexar no RAG"}
              >
                {indexed ? <Check size={12} strokeWidth={2.5} /> : <Database size={12} strokeWidth={2} />}
              </button>
            </>
          )}
          <button className="doc-btn" onClick={openViewer} data-tip="Abrir para leitura"><Eye size={12} strokeWidth={2} /></button>
          <button className="doc-btn" onClick={openInGallery} data-tip="Localizar na galeria"><FolderOpen size={12} strokeWidth={2} /></button>
          <button className="doc-btn" onClick={download} data-tip="Baixar arquivo"><Download size={12} strokeWidth={2} /></button>
        </div>
      </div>
    </div>
  );
}

/* ════ CARD DE SITE — globo + explicação + iframe ════ */
function SiteCard({ map }: { map: LinkMap }) {
  const { openSite } = useBobby();
  const open = () => {
    if (map.embeddable) openSite(map);
    else window.open(map.url, "_blank", "noopener");
  };
  return (
    <div className="site-card" onClick={open} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") open(); }}>
      <div className="site-globe">
        <Globe size={30} strokeWidth={1.4} />
        <span className="site-orbit" />
        <img className="site-fav" src={map.favicon} alt="" loading="lazy"
          onError={(e) => { (e.currentTarget.style.display = "none"); }} />
      </div>

      <div className="site-body">
        <div className="site-kind">{map.kind}</div>
        <div className="site-title">{map.title}</div>
        <div className="site-host">{map.host}</div>
        <p className="site-summary">{map.summary}</p>

        <div className="site-sections">
          {map.sections.slice(0, 4).map((s) => <span key={s} className="site-tag">{s}</span>)}
        </div>

        <div className="site-foot">
          <span className="site-stack">{map.tech.join(" · ")}</span>
          <span className="site-cta">
            {map.embeddable ? <><PanelRight size={11} strokeWidth={2} />abrir em meia tela</>
              : <><ExternalLink size={11} strokeWidth={2} />abrir em nova aba</>}
          </span>
        </div>
      </div>
    </div>
  );
}

function SearchResults({ results }: { results: WebResult[] }) {
  const { openSite } = useBobby();
  if (!results.length) return null;
  const q = results[0]?.title || "pesquisa";
  return (
    <div className="search-results">
      {results.map((r, i) => (
        <button key={r.link} className="search-result" onClick={() => openSite(mapLink(r.link))}>
          <span className="search-rank">{i + 1}</span>
          <img src={r.favicon} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <span className="search-copy">
            <b>{r.title}</b>
            <i>{r.host}</i>
            <em>{r.snippet}</em>
          </span>
          <ExternalLink size={12} strokeWidth={2} />
        </button>
      ))}
      <a className="search-more" href={`https://www.google.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">
        Ver o restante no Google <ExternalLink size={11} strokeWidth={2} />
      </a>
    </div>
  );
}

/* ════ PROTO CARD ════ */
function ProtoCard({ proto }: { proto: Proto }) {
  const { bumpDocs, t, openGalleryWindow, setDocModal } = useBobby();
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(proto.code); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { /* clipboard negado */ }
  };
  const openInGallery = () => {
    openGalleryWindow();
    setTimeout(() => window.dispatchEvent(new CustomEvent("gallery:focus", { detail: { cat: "proto", query: proto.name } })), 30);
  };
  // Confere pelo ID, não pelo nome: cada protótipo tem confirmação própria,
  // então o segundo pedido não nasce marcado por causa do primeiro.
  const [done, setDone] = useState(() => {
    try { return (JSON.parse(localStorage.getItem("vc_docs") || "[]") as { id: string }[]).some((d) => d.id === proto.id); }
    catch { return false; }
  });
  return (
    <div className="proto-card">
      <div className="proto-card-hd">
        <FileCode2 size={14} strokeWidth={2} style={{ color: "var(--gold)" }} />
        {proto.name}<code>.{proto.lang} · vc-block</code>
      </div>
      <div className="proto-card-bd">
        <button
          className="proto-btn primary"
          onClick={() => setDocModal({
            id: proto.id, name: proto.name, ext: proto.lang, label: proto.lang.toUpperCase(),
            color: "#ea580c", size: proto.code.length, content: proto.code, kind: "code",
          })}
        >
          <Play size={11} strokeWidth={2} />Abrir e executar
        </button>
        <button className="proto-btn" onClick={() => openInTab({ id: proto.id, name: proto.name, cat: "proto", content: proto.code, date: "" })}>
          <ExternalLink size={11} strokeWidth={2} />{t("openTab")}
        </button>
        <button className={`proto-btn${copied ? " done" : ""}`} onClick={copyCode}>
          {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
        <button className="proto-btn" onClick={openInGallery} title="Ver na galeria">
          <FolderOpen size={11} strokeWidth={2} />Galeria
        </button>
        <button className={`proto-btn${done ? " done" : ""}`} onClick={() => { confirmProto(proto); bumpDocs(); setDone(true); }}>
          <CheckCircle2 size={11} strokeWidth={2} />{done ? t("confirmed") : t("confirm")}
        </button>
      </div>
    </div>
  );
}

/* ════ MENSAGEM ════ */
function Message({ m }: { m: Msg }) {
  const { toggleLike, editMessage, resolveConfirmation, flyToGallery, gen } = useBobby();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);

  if (m.meta)
    return (
      <div className="chat-msg meta cascade-in">
        <div className="meta-bubble"><Sparkles size={10} strokeWidth={2} />{m.content}</div>
      </div>
    );

  if (editing)
    return (
      <div className="chat-msg user">
        <div className="edit-box">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus />
          <div className="edit-acts">
            <span className="edit-hint"><GitBranch size={10} strokeWidth={2} /> cria um branch novo</span>
            <button className="edit-btn" onClick={() => { setEditing(false); setDraft(m.content); }}>
              <X size={11} strokeWidth={2} /> Cancelar
            </button>
            <button className="edit-btn go" onClick={() => { setEditing(false); editMessage(m.id, draft); }}>
              <Check size={11} strokeWidth={2} /> Reenviar
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className={`chat-msg ${m.role} cascade-in`}>
      {m.flag && (
        <div className="flag-badge"><ShieldAlert size={11} strokeWidth={2} />Sentinela · pacote bloqueado ({m.flag})</div>
      )}
      {m.branch ? <div className="branch-tag"><GitBranch size={9} strokeWidth={2.5} />branch {m.branch}</div> : null}

      {/* Assinatura: quem está falando */}
      {m.role === "ai" ? (
        <div className="msg-who">
          <img className="who-face" src={bobbyAvatar} alt="" />
          <span className="who-name">Bobby</span>
          <span className="who-role">assistente</span>
        </div>
      ) : (
        <div className="msg-who user"><span className="who-name">Você</span></div>
      )}

      {m.tool && (
        <div className="tool-badge"><Wrench size={10} strokeWidth={2.5} />ação executada na interface</div>
      )}

      {m.content && (
        <div className={`chat-bubble${m.flag ? " flagged" : ""}`}>
          {/* Carimbo do contexto, dentro do balão */}
          {m.ctx && !m.meta && <ContextStamp ctx={m.ctx} ragOnly={m.ragOnly} />}
          {rich(m.content)}
        </div>
      )}
      {/* Anexos vivem fora do balão: juntos, o layout quebrava */}
      {!!m.attachments?.length && (
        <div className="msg-atts">
          {m.attachments.map((a) => <DocCard key={a.id} att={a} />)}
        </div>
      )}

      {m.confirm && (
        <div className={`confirm-card${m.confirm.resolved ? ` resolved ${m.confirm.resolved}` : ""}`}>
          <span className="confirm-lock"><Trash2 size={16} strokeWidth={1.9} /></span>
          <div className="confirm-copy">
            <b>{m.confirm.label}</b>
            <span>
              {m.confirm.resolved === "yes" ? "Confirmado: enviado para a Lixeira do Chat."
                : m.confirm.resolved === "no" ? "Acao cancelada."
                  : "Tem certeza? Chats ativos podem ser restaurados depois pela galeria."}
            </span>
          </div>
          {!m.confirm.resolved && (
            <div className="confirm-buttons">
              <button onClick={() => resolveConfirmation(m.id, false)}>Nao</button>
              <button className="yes" onClick={() => resolveConfirmation(m.id, true)}>Sim, mover</button>
            </div>
          )}
        </div>
      )}
      {m.linkMaps?.map((l) => <SiteCard key={l.url} map={l} />)}
      {m.searchResults && <SearchResults results={m.searchResults} />}

      {m.sources && m.sources.length > 0 && (
        <div className="src-row">
          <span className="src-label"><FileSearch size={10} strokeWidth={2} />fontes</span>
          {m.sources.map((s) => (
            <span key={s.docId + s.score} className="src-chip" title={`similaridade ${(s.score * 100).toFixed(0)}%`}>
              {s.title}<b>{(s.score * 100).toFixed(0)}%</b>
            </span>
          ))}
        </div>
      )}

      {m.proto && <ProtoCard proto={m.proto} />}

      <div className="msg-foot">
        <span className="chat-msg-time">{m.time}</span>
        <button
          className={`msg-act like${m.liked ? " on" : ""}`}
          data-tip={m.role === "user" ? "Salvar como rascunho" : "Salvar nas Curtidas"}
          onClick={(e) => {
            if (!m.liked) flyToGallery(e.currentTarget.getBoundingClientRect(), "#e11d48");
            toggleLike(m);
          }}
        >
          <Heart size={12} strokeWidth={2} fill={m.liked ? "currentColor" : "none"} />
        </button>
        {m.role === "user" && gen === "idle" && (
          <button className="msg-act" data-tip="Editar e criar branch" onClick={() => setEditing(true)}>
            <Pencil size={11} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

const LAYOUT_BTNS: { l: LayoutMode; icon: ReactElement; title: string }[] = [
  { l: "fullscreen", icon: <Maximize size={14} strokeWidth={1.5} />, title: "Fullscreen" },
  { l: "90", icon: <RectangleHorizontal size={14} strokeWidth={1.5} />, title: "90%" },
  { l: "centered", icon: <Square size={13} strokeWidth={1.5} />, title: "Centered" },
];

/* ════════ CHAT ════════ */
export default function Chat() {
  const S = useBobby();
  const {
    expanded, layout, setLayout, active, messages, gen, stream, send, attachFiles,
    renameSession, clearCache, setModal, msgCount, charCount,
    blocked, t, skills, toggleSkill, noteTyping, typing, theme, cycleTheme,
    contextFilter, setContextFilter, visibleMessages,
  } = S;

  const [input, setInput] = useState("");
  const [flying, setFlying] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachKind, setAttachKind] = useState<AttachKind>("all");
  const [pasted, setPasted] = useState<{ id: string; text: string; lang: string | null }[]>([]);
  const msgsRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);

  /** Ajusta o accept e abre o seletor logo em seguida. */
  const pickFiles = (kind: AttachKind) => {
    setAttachKind(kind);
    setAttachOpen(false);
    setTimeout(() => fileRef.current?.click(), 30);
  };

  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, stream, gen, active.id]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const doSend = () => {
    if (gen !== "idle") { send(""); return; }
    if (!input.trim() && !pasted.length) return;
    setFlying(true); setTimeout(() => setFlying(false), 650);

    // Código digitado ou colado no campo vira anexo e passa pela quarentena,
    // mesmo quando vem misturado com uma frase.
    const found = extractCode(input);
    const typedLang = found ? sniffCode(found.code) : null;
    const queue = found && typedLang
      ? [...pasted, { id: Math.random().toString(36).slice(2, 9), text: found.code, lang: typedLang }]
      : pasted;
    const command = found && typedLang
      ? (found.rest || "Enviei um trecho de código para você analisar.")
      : input;

    const atts = queue.map((p) => {
      const L = p.lang ? langOf(`x.${p.lang}`) : null;
      return {
        id: p.id,
        name: p.lang ? `trecho-${p.id}.${p.lang}` : `texto-colado-${p.id}.txt`,
        ext: p.lang || "txt",
        label: L?.label || "Texto",
        color: L?.color || "#64748b",
        size: p.text.length, content: p.text,
        kind: (p.lang ? "code" : "text") as "code" | "text",
      };
    });

    send(command || "Analisa esse conteúdo pra mim.", atts.length ? atts : undefined);
    setInput(""); setPasted([]);
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const empty = messages.length === 0 && gen === "idle";
  const st = RAG.stats();

  // Contexto da última resposta do Bobby — ancora o painel no fim da conversa.
  const lastAiCtx = [...visibleMessages].reverse().find((m) => m.role === "ai" && m.ctx && !m.meta)?.ctx;

  return (
    <div id="render-chat-container">
      {/* Puxador: no mobile, chama o chat por cima do editor */}
      <div className="chat-grip" onClick={() => document.getElementById("bobby-nexus")?.classList.toggle("peek")}>
        Bobby
      </div>

      {/* STATS BAR */}
      <div className="chat-stats-bar">
        <div className="title-wrap">
          <span
            className="session-title" contentEditable suppressContentEditableWarning spellCheck={false}
            key={active.id + active.title}
            onBlur={(e) => renameSession(e.currentTarget.textContent || "")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
          >{active.title || t("newSession")}</span>
          <span className="edit-icon"><Pencil size={11} strokeWidth={2} /></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            className="theme-swap"
            onClick={cycleTheme}
            data-tip={theme === "uva" ? "Tema Uva — clique para o Creme" : "Tema Creme — clique para o Uva"}
          >
            <span className="theme-dot" />
            {theme === "uva" ? "Uva" : "Creme"}
          </button>
          <div className={`layout-btns${expanded ? " visible" : ""}`}>
            {LAYOUT_BTNS.map(({ l, icon, title }) => (
              <button key={l} className={`layout-btn${layout === l ? " active" : ""}`} title={title} onClick={() => setLayout(l)}>{icon}</button>
            ))}
          </div>
          <Clock />
        </div>
      </div>

      {/* AVISO DE FILTRO POR CONTEXTO */}
      {contextFilter && (
        <div className="ctx-banner" style={{ ["--ctx" as string]: CTX[contextFilter].color }}>
          <span className="ctx-banner-glyph"><CtxIcon name={CTX[contextFilter].icon} size={17} /></span>
          <div className="ctx-banner-txt">
            <b>Conversa em contexto “{CTX[contextFilter].label}”</b>
            <span>
              O histórico anterior foi recortado nesse assunto. Mensagens novas entram normalmente
              e podem mudar de contexto — você vai ver a virada acontecer.
            </span>
          </div>
          <span className="ctx-banner-count">{visibleMessages.length}/{messages.length}</span>
          <button className="ctx-banner-off" onClick={() => setContextFilter(null)} title="Voltar à ordem cronológica">
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="editing-flag">
        <Binary size={11} strokeWidth={2.5} />
        Edição de código em andamento — posso comentar o que você está vendo
      </div>

      {/* MENSAGENS */}
      <div className="chat-messages" ref={msgsRef}>
        <div className="chat-date-separator">{t("today")}</div>
        {empty && <WelcomeCard />}
        {empty && (
          <div className="sug-row">
            {SUGGESTIONS.map((x) => <button key={x} className="sug-chip" onClick={() => send(x)}>{x}</button>)}
          </div>
        )}
        {visibleMessages.map((m) => <Message key={m.id} m={m} />)}

        {/* Progresso: no fim da conversa, onde o Sentinela trabalha */}
        <Thinking />

        {gen === "streaming" && (
          <div className="chat-msg ai">
            <div className="msg-who">
              <img className="who-face" src={bobbyAvatar} alt="" />
              <span className="who-name">Bobby</span>
              <span className="who-typing">digitando</span>
            </div>
            <div className="chat-bubble">{rich(stream)}<span className="stream-caret" /></div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="chat-input-zone">
        {/* Seletor de contexto e bolha do Pulso Eterno */}
        <div className="above-input">
          {lastAiCtx && <ContextPanel ctx={lastAiCtx} />}
          <OrbitBubble />
        </div>
        <div className="input-float-container">
          {pasted.length > 0 && (
            <div className="paste-row">
              {pasted.map((p) => (
                <div key={p.id} className={`paste-card${p.lang ? " code" : ""}`}>
                  <span className="paste-ico">
                    {p.lang ? <Binary size={13} strokeWidth={2} /> : <FileText size={13} strokeWidth={2} />}
                  </span>
                  <div className="paste-txt">
                    <b>{p.lang ? `Código ${p.lang.toUpperCase()}` : "Texto colado"}</b>
                    <i>{p.text.length.toLocaleString("pt-BR")} caracteres · {p.text.split("\n").length} linhas</i>
                  </div>
                  <button className="paste-x" onClick={() => setPasted((l) => l.filter((x) => x.id !== p.id))}>
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              <span className="paste-hint">Escreva o comando abaixo e envie — ou cole mais conteúdo.</span>
            </div>
          )}
          <div className="input-row">
            <div className="attach-wrap" ref={attachRef}>
              <button
                className={`attach-btn${attachOpen ? " on" : ""}`}
                data-tip="Anexar foto, documento ou algoritmo"
                onClick={() => setAttachOpen((o) => !o)}
              >
                <Paperclip size={18} strokeWidth={2} />
              </button>
              {attachOpen && (
                <div className="attach-menu">
                  <button className="attach-item" onClick={() => pickFiles("image")}>
                    <span className="attach-ico photo"><ImgIcon size={13} strokeWidth={2} /></span>
                    <span><b>Foto</b><i>png · jpg · webp — leitura por visão</i></span>
                  </button>
                  <button className="attach-item" onClick={() => pickFiles("doc")}>
                    <span className="attach-ico doc"><FileText size={13} strokeWidth={2} /></span>
                    <span><b>Documento</b><i>pdf · txt · md — transcrição</i></span>
                  </button>
                  <button className="attach-item" onClick={() => pickFiles("code")}>
                    <span className="attach-ico algo"><Binary size={13} strokeWidth={2} /></span>
                    <span><b>Algoritmo</b><i>js · py · java · sql — card de código</i></span>
                  </button>
                </div>
              )}
            </div>
            <input
              ref={fileRef} type="file" multiple style={{ display: "none" }}
              accept={ACCEPT[attachKind]}
              onChange={(e) => { if (e.target.files) attachFiles(e.target.files); e.target.value = ""; }}
            />
            <textarea
              ref={taRef} className="chat-textarea" rows={1} placeholder={t("placeholder")} value={input}
              onChange={(e) => {
                setInput(e.target.value);
                noteTyping({ chars: e.target.value.length, backspace: false });
                const ta = taRef.current;
                if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; }
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace" || e.key === "Delete") {
                  noteTyping({ chars: e.currentTarget.value.length, backspace: true });
                }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); }
              }}
              onPaste={(e) => {
                const txt = e.clipboardData.getData("text");
                const lang = sniffCode(txt);
                // Código vira card em QUALQUER tamanho; texto comum só acima de 800.
                if (lang || txt.length > 800) {
                  e.preventDefault();
                  setPasted((p) => [...p, { id: Math.random().toString(36).slice(2, 9), text: txt, lang }]);
                } else {
                  // Colagem não é digitação: não alimenta o metadado de teclado.
                  noteTyping({ chars: (taRef.current?.value.length || 0) + txt.length, backspace: false, keyed: false });
                }
              }}
            />
            <button className={`send-btn${gen !== "idle" ? " stop-mode" : ""}`} onClick={doSend} title={gen !== "idle" ? "Parar geração" : "Enviar"}>
              {gen !== "idle"
                ? <Square size={11} fill="#0d1b2a" stroke="#0d1b2a" />
                : <span className={flying ? "plane-fly" : ""} style={{ display: "flex" }}>
                    <SendHorizonal size={16} strokeWidth={2} style={{ color: "#0d1b2a" }} />
                  </span>}
            </button>
          </div>

          <div className="input-bottom-row">
            <div className="bottom-left-group">
              <button className={`pu-chip${skills.rag ? " on" : ""}`} onClick={() => toggleSkill("rag")} data-tip={`Busca vetorial · ${st.chunks} chunks`}>
                <Database size={11} strokeWidth={2} />RAG
              </button>
              <button className={`pu-chip${skills.sentinela ? " on" : ""}`} onClick={() => toggleSkill("sentinela")} data-tip={t("sentinelTip")}>
                <ShieldCheck size={11} strokeWidth={2} />Sentinela
              </button>
              <button className={`pu-chip${skills.turbo ? " on" : ""}`} onClick={() => toggleSkill("turbo")} data-tip="Resposta com menos latência">
                <Zap size={11} strokeWidth={2} />Turbo
              </button>
            </div>

            <div className="bottom-center-group" ref={dropRef}>
              <button className="pu-icon-btn" onClick={() => setDropOpen(!dropOpen)} title="Mais ações">
                <MoreHorizontal size={14} strokeWidth={2} />
              </button>
              {dropOpen && (
                <div className="pu-overflow-drop">
                  <button className="pu-drop-item" onClick={() => { setModal("renderchat"); setDropOpen(false); }}>
                    <Settings2 size={13} strokeWidth={2} style={{ color: "var(--gold)" }} />RenderLab · Skills
                  </button>
                  <button className="pu-drop-item" onClick={() => { setModal("rag"); setDropOpen(false); }}>
                    <Database size={13} strokeWidth={2} style={{ color: "var(--gold)" }} />Base de Conhecimento
                  </button>
                  <button className="pu-drop-item" onClick={() => {
                    openInTab({ id: "c", name: active.title, cat: "chats", content: "", date: "", _msgs: active.messages });
                    setDropOpen(false);
                  }}>
                    <Download size={13} strokeWidth={2} />Exportar conversa
                  </button>
                  <div className="pu-drop-sep" />
                  <button className="pu-drop-item" onClick={() => { clearCache(); setDropOpen(false); }} style={{ color: "#c2410c" }}>
                    <Trash2 size={13} strokeWidth={2} />Limpar mensagens
                  </button>
                </div>
              )}
            </div>

            <div className="bottom-right-group">
              {skills.links && <span className="pu-chip" style={{ cursor: "default" }} title="Leitor de links ativo"><Link2 size={11} strokeWidth={2} /></span>}
              {typing.cpm > 0 && (
                <span className="pu-chip" style={{ cursor: "default" }} title={`${typing.chars} chars · ${typing.backspaces} correções`}>
                  {typing.cpm} cpm
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="chat-footer">
        <div className="sentinel-wrap">
          <div className="sentinel-dot" style={{ background: skills.sentinela ? "var(--green)" : "var(--text-muted)" }} />
          <span>{t("sentinel")}</span>
          <div className="sentinel-tip">
            <ShieldCheck size={13} strokeWidth={2} style={{ color: "#c9a227" }} />
            <span>{t("sentinelTip")}</span>
          </div>
        </div>
        <span
          className="disclaimer"
          onClick={() => window.dispatchEvent(new CustomEvent("bobby:prank"))}
        >{t("disclaimer")}</span>
        <div className="token-meter">
          <BookOpen size={12} strokeWidth={2} /><span>{msgCount}</span> {t("msgs")}
          <div className="token-tip rich-tip">
            <div className="rt-seal">
              <ShieldCheck size={12} strokeWidth={2.2} />
              <span>Dados protegidos</span>
            </div>
            <div className="rt-rows">
              <div><i>Mensagens</i><b>{msgCount}</b></div>
              <div><i>Caracteres</i><b>{charCount.toLocaleString("pt-BR")}</b></div>
              <div><i>Bloqueios</i><b className={blocked ? "warn" : ""}>{blocked}</b></div>
              <div><i>Base vetorial</i><b>{st.chunks} chunks</b></div>
            </div>
            <div className="rt-note">
              Nesta build local, o histórico fica restrito a este navegador. A camada
              <em>AES-GCM + Firebase</em> já está prevista no contrato, mas só será marcada como ativa
              quando o backend custodiar a chave fora do dispositivo.
            </div>
          </div>
        </div>
      </div>

      <div className="widget-signature">Produção Marcos Eduardo — orquestrando IA Generativa.</div>
    </div>
  );
}
