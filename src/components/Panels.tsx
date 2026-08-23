import { useMemo, useState } from "react";
import {
  AlignLeft, LayoutGrid, X, Plus, Search, ChevronRight, Folder, Globe, Settings,
  Expand, ExternalLink, Trash2, CheckSquare, Square, RotateCcw, Heart, MessageSquare,
  FlaskConical, CheckCircle2, FileText, Database, ArrowLeftRight, Maximize2, ShieldCheck,
} from "lucide-react";
import { useBobby } from "../lib/store";
import {
  getObDocs, getVcDocs, openInTab, attachmentFiles, likedFiles, trashFiles,
  protoFiles, chatFiles,
} from "../lib/gallery";
import type { GalleryFile } from "../lib/types";
import FileIcon from "./FileIcon";

/* ══ BOTÕES LATERAIS ══ */
export function SideButtons() {
  const {
    setLeftOpen, leftOpen, setRightOpen, rightOpen, likedNew,
    galleryOpen, setGalleryOpen, swapped, toggleSwap,
  } = useBobby();

  // Com a janela grande aberta, o mesmo botão a fecha — nada de estado morto.
  const clickGallery = () => {
    if (galleryOpen) { setGalleryOpen(false); return; }
    setRightOpen(!rightOpen);
  };

  const canSwap = (leftOpen && rightOpen) || galleryOpen;

  return (
    <>
      <button
        className={`side-btn side-btn-left${leftOpen ? " active" : ""}`}
        title={leftOpen ? "Fechar conversas" : "Conversas"}
        onClick={() => setLeftOpen(!leftOpen)}
      >
        <AlignLeft size={18} strokeWidth={1.5} />
      </button>

      <button
        className={`side-btn side-btn-right${rightOpen || galleryOpen ? " active" : ""}`}
        title={galleryOpen ? "Fechar a janela da galeria" : rightOpen ? "Fechar galeria" : "Galeria"}
        onClick={clickGallery}
      >
        <LayoutGrid size={18} strokeWidth={1.5} />
        {likedNew > 0 && !galleryOpen && <span className="side-badge">{likedNew}</span>}
      </button>

      {canSwap && (
        <button
          className="swap-btn"
          title={swapped ? "Voltar as posições" : "Inverter os lados"}
          onClick={toggleSwap}
        >
          <ArrowLeftRight size={15} strokeWidth={2} />
        </button>
      )}
    </>
  );
}

/* ══ PAINEL ESQUERDO ══ */
export function LeftPanel() {
  const {
    leftOpen, setLeftOpen, convs, activeId, selectConv, deleteConv, deleteMany,
    newChat, setModal, lang, t,
  } = useBobby();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [deep, setDeep] = useState(true);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return convs;
    return convs.filter((c) => {
      if (c.title.toLowerCase().includes(term)) return true;
      if (deep) return c.messages.some((m) => m.content.toLowerCase().includes(term));
      return false;
    });
  }, [convs, q, deep]);

  const allSel = filtered.length > 0 && filtered.every((c) => sel.includes(c.id));
  const toggleAll = () => setSel(allSel ? [] : filtered.map((c) => c.id));
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const wipe = () => { deleteMany(sel); setSel([]); };

  const hitCount = (c: { messages: { content: string }[] }) => {
    const term = q.toLowerCase().trim();
    if (!term || !deep) return 0;
    return c.messages.filter((m) => m.content.toLowerCase().includes(term)).length;
  };

  return (
    <div id="leftPanel" className={`panel panel-left${leftOpen ? " open" : ""}`}>
      <div className="panel-header">
        <span className="panel-title">{t("conversations")}</span>
        <button className="panel-close" onClick={() => setLeftOpen(false)}><X size={12} strokeWidth={2} /></button>
      </div>

      <button className="btn-new-chat" onClick={newChat}>
        <Plus size={14} strokeWidth={2} />{t("newChat")}
      </button>

      <div className="search-wrap" style={{ marginBottom: 8 }}>
        <Search size={14} strokeWidth={2} />
        <input placeholder="Pesquisar títulos e conteúdo..." value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="clr-btn" onClick={() => setQ("")}><X size={11} strokeWidth={2.5} /></button>}
      </div>

      <div className="hist-tools">
        <button className={`hist-tool${deep ? " on" : ""}`} onClick={() => setDeep(!deep)} title="Buscar dentro das mensagens">
          <Search size={10} strokeWidth={2.5} />conteúdo
        </button>
        <button className="hist-tool" onClick={toggleAll}>
          {allSel ? <CheckSquare size={10} strokeWidth={2.5} /> : <Square size={10} strokeWidth={2.5} />}
          {allSel ? "nenhum" : "todos"}
        </button>
        {sel.length > 0 && (
          <button className="hist-tool danger" onClick={wipe}>
            <Trash2 size={10} strokeWidth={2.5} />apagar {sel.length}
          </button>
        )}
      </div>

      <div className="history-list">
        {filtered.length === 0 && <div className="history-empty">{q ? `Nada encontrado para "${q}".` : t("emptyHistory")}</div>}
        {filtered.map((c) => {
          const hits = hitCount(c);
          return (
            <div
              key={c.id}
              className={`history-item${c.id === activeId ? " active" : ""}${sel.includes(c.id) ? " picked" : ""}`}
              onClick={() => selectConv(c.id)}
            >
              <button className="hist-check" onClick={(e) => { e.stopPropagation(); toggle(c.id); }}>
                {sel.includes(c.id) ? <CheckSquare size={12} strokeWidth={2.5} /> : <Square size={12} strokeWidth={2} />}
              </button>
              <span className="hist-name">{c.title || "Nova sessão"}</span>
              {hits > 0 && <span className="hist-hits">{hits}</span>}
              <span className="hist-count">{c.messages.length}</span>
              <button className="hist-del" title="Mover para Chats Deletados" onClick={(e) => { e.stopPropagation(); deleteConv(c.id); }}>
                <Trash2 size={11} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="panel-footer-tools">
        <button className="panel-tool-btn" onClick={() => setModal("config")}>
          <Globe size={13} strokeWidth={1.5} /><span>{lang.toUpperCase()}</span>
        </button>
        <button className="panel-tool-btn" onClick={() => setModal("rag")}>
          <Database size={13} strokeWidth={1.5} />Base
        </button>
        <button className="panel-tool-btn" onClick={() => setModal("renderchat")}>
          <Settings size={13} strokeWidth={1.5} />Skills
        </button>
        <button className="panel-tool-btn sentinela" onClick={() => setModal("sentinela")} title="Posto do Sentinela">
          <ShieldCheck size={13} strokeWidth={1.5} />Guarda
        </button>
      </div>
    </div>
  );
}

/* ══ PAINEL DIREITO — GalleryBob ══ */
type Cat = "doc" | "proto" | "final" | "liked" | "chats" | "trash";

export function RightPanel() {
  const {
    rightOpen, setRightOpen, openGalleryWindow, protos, docsVersion, convs,
    liked, trash, likedNew, seenLiked, unlike, restoreConv, purgeTrash, t,
  } = useBobby();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "doc" | "dev" | "chat">("all");
  const [open, setOpen] = useState<Record<string, boolean>>({ doc: true, liked: true });

  const files = useMemo(() => {
    void docsVersion;
    return {
      doc: [...getObDocs(), ...attachmentFiles(convs)].filter(
        (f, i, a) => a.findIndex((x) => x.name === f.name && x.date === f.date) === i
      ),
      proto: protoFiles(protos),
      final: getVcDocs(),
      liked: likedFiles(liked),
      chats: chatFiles(convs.filter((c) => c.messages.length)),
      // O chat apagado e todos os anexos dele permanecem nesta pasta.
      trash: [...trashFiles(trash), ...attachmentFiles(trash, "trash")],
    };
  }, [docsVersion, protos, convs, liked, trash]);

  const FOLDERS: { cat: Cat; label: string; color: string; icon: typeof Folder; badge?: number }[] = [
    { cat: "doc", label: "Documentos", color: "var(--gold)", icon: Folder },
    { cat: "proto", label: "DEV Protótipos", color: "#60a5fa", icon: FlaskConical },
    { cat: "final", label: "DEV Confirmados", color: "var(--green)", icon: CheckCircle2 },
    { cat: "liked", label: "Mensagens Curtidas", color: "#e11d48", icon: Heart, badge: likedNew },
    { cat: "chats", label: "Chats", color: "#a78bfa", icon: MessageSquare },
    { cat: "trash", label: "Chats Deletados", color: "#94a3b8", icon: Trash2 },
  ];

  const show = (c: Cat) =>
    filter === "all" ? true
      : filter === "doc" ? c === "doc"
      : filter === "dev" ? c === "proto" || c === "final"
      : c === "chats" || c === "trash" || c === "liked";

  const match = (f: GalleryFile) =>
    f.name.toLowerCase().includes(q.toLowerCase()) ||
    (q.length > 2 && f.content.toLowerCase().includes(q.toLowerCase()));

  const openFolder = (cat: Cat) => {
    setOpen({ ...open, [cat]: !open[cat] });
    if (cat === "liked") seenLiked();
  };

  return (
    <div id="rightPanel" className={`panel panel-right${rightOpen ? " open" : ""}`}>
      <div className="panel-header">
        <span className="panel-title">{t("gallery")}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button className="panel-grow" data-tip="Abrir na janela grande" onClick={openGalleryWindow}>
            <Maximize2 size={12} strokeWidth={2.2} />
          </button>
          <button className="panel-close" data-tip="Fechar" onClick={() => setRightOpen(false)}>
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="search-wrap" style={{ marginBottom: 10 }}>
        <Search size={13} strokeWidth={2} />
        <input placeholder="Buscar arquivos e conteúdo..." value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="clr-btn" onClick={() => setQ("")}><X size={11} strokeWidth={2.5} /></button>}
      </div>

      <div className="gb-filter-row">
        {([["all", "Tudo"], ["doc", "Docs"], ["dev", "DEV"], ["chat", "Chats"]] as const).map(([k, lbl]) => (
          <button key={k} className={`gb-filter${filter === k ? " active" : ""}`} onClick={() => setFilter(k)}>{lbl}</button>
        ))}
      </div>

      <div className="gb-explorer">
        {FOLDERS.filter((f) => show(f.cat)).map(({ cat, label, color, icon: Icon, badge }) => {
          const list = files[cat].filter(match);
          const isOpen = !!open[cat];
          return (
            <div key={cat} className={`gb-folder${isOpen ? " open" : ""}`}>
              <div className="gb-folder-hd" onClick={() => openFolder(cat)}>
                <ChevronRight className="gb-chevron" size={12} strokeWidth={2.5} />
                <Icon size={15} strokeWidth={1.8} style={{ color }} />
                <span>{label}</span>
                {!!badge && <span className="gb-new">{badge}</span>}
                <span className="gb-count">{list.length}</span>
              </div>
              <div className="gb-folder-body">
                {list.length === 0 && <div className="gb-folder-empty">{t("emptyFolder")}</div>}
                {list.length > 6 && (
                  <button className="gb-folder-more" onClick={(e) => { e.stopPropagation(); openGalleryWindow(); }}>
                    <Expand size={10} strokeWidth={2.5} />
                    ver os {list.length} na janela grande
                  </button>
                )}
                {list.slice(0, 6).map((f) => (
                  <div key={f.id} className="gb-file" onClick={() => openInTab(f)}>
                    <span className="gb-file-icon">
                      {cat === "liked" ? <Heart size={13} fill="#e11d48" color="#e11d48" />
                        : cat === "chats" || cat === "trash" ? <MessageSquare size={13} color={color} />
                        : <FileIcon name={f.name} />}
                    </span>
                    <span className="gb-file-name">{f.name}</span>
                    <span className="gb-file-meta">{f.date}</span>
                    <div className="gb-file-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="gb-file-action" title="Abrir em nova aba" onClick={() => openInTab(f)}>
                        <ExternalLink size={10} strokeWidth={2} />
                      </button>
                      {cat === "liked" && (
                        <button className="gb-file-action" title="Remover curtida" onClick={() => unlike(f.id.replace("like-", ""))}>
                          <Trash2 size={10} strokeWidth={2} />
                        </button>
                      )}
                      {cat === "trash" && (
                        <>
                          <button className="gb-file-action" title="Restaurar" onClick={() => restoreConv(f.id.replace("trash-", ""))}>
                            <RotateCcw size={10} strokeWidth={2} />
                          </button>
                          <button className="gb-file-action" title="Apagar definitivo" onClick={() => purgeTrash(f.id.replace("trash-", ""))}>
                            <Trash2 size={10} strokeWidth={2} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="gb-note">
        <FileText size={11} strokeWidth={2} />
        Curtidas são cópias soberanas: apagar o chat não remove.
      </div>
    </div>
  );
}
