import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  FolderOpen, X, Search, List, LayoutGrid,
  ChevronLeft, ChevronRight, ExternalLink,
  FileText, FlaskConical, CheckCircle2, MessageSquare, Layers, Heart, Trash2,
  RotateCcw, CheckSquare, Square, MousePointer2, Archive,
} from "lucide-react";
import { useBobby } from "../lib/store";
import {
  getObDocs, getVcDocs, openInTab, catLabel, attachmentFiles, chatFiles,
  likedFiles, protoFiles, trashFiles, removeStoredDocs, removeConfirmedDocs,
} from "../lib/gallery";
import * as RAG from "../lib/rag";
import type { GalleryFile } from "../lib/types";
import FileIcon from "./FileIcon";

type CatKey = "all" | "doc" | "proto" | "final" | "chats" | "liked" | "trash";
const PAGE_SIZE = 50;

export default function GalleryWindow() {
  const {
    galleryOpen, setGalleryOpen, protos, docsVersion, convs, liked, trash, t,
    unlike, restoreConv, purgeTrash, seenLiked, deleteMany,
    removeProtos, removeAttachments, bumpDocs,
  } = useBobby();
  const [cat, setCat] = useState<CatKey>("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; file: GalleryFile } | null>(null);

  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ cat?: CatKey; query?: string }>).detail;
      if (detail?.cat) setCat(detail.cat);
      setQ(detail?.query || "");
      setPage(0);
    };
    window.addEventListener("gallery:focus", focus);
    return () => window.removeEventListener("gallery:focus", focus);
  }, []);

  const files = useMemo(() => {
    void docsVersion;
    const docs = [...getObDocs(), ...attachmentFiles(convs)].filter(
      (f, i, a) => a.findIndex((x) => x.name === f.name && x.date === f.date) === i
    );
    const prot = protoFiles(protos);
    const fin = getVcDocs();
    const chats = chatFiles(convs.filter((c) => c.messages.length));
    const likes = likedFiles(liked);
    const bin = [...trashFiles(trash), ...attachmentFiles(trash, "trash")];
    return [...docs, ...prot, ...fin, ...chats, ...likes, ...bin];
  }, [docsVersion, protos, convs, liked, trash, galleryOpen]);

  /* A galeria vira memoria transitória assim que abre. */
  useEffect(() => {
    if (!galleryOpen) return;
    RAG.syncRuntimeDocs(
      "gallery",
      files.map((f) => ({
        id: f.id,
        title: `Galeria: ${f.name}`,
        body: `${f.name}\nCategoria: ${catLabel(f.cat)}\nData: ${f.date}\n${f.content || "Item sem texto extraivel."}`,
        tags: [f.cat, f.name.split(".").pop() || "arquivo"],
      }))
    );
  }, [galleryOpen, files]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close, { once: true });
    return () => window.removeEventListener("click", close);
  }, [menu]);

  const visible = files
    .filter((f) => (cat === "all" ? true : f.cat === cat))
    .filter((f) => {
      const term = q.toLowerCase().trim();
      return !term || f.name.toLowerCase().includes(term) || f.content.toLowerCase().includes(term);
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const cur = Math.min(page, pageCount - 1);
  const pageFiles = visible.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);

  const counts = useMemo(() => ({
    all: files.length,
    doc: files.filter((f) => f.cat === "doc").length,
    proto: files.filter((f) => f.cat === "proto").length,
    final: files.filter((f) => f.cat === "final").length,
    chats: files.filter((f) => f.cat === "chats").length,
    liked: files.filter((f) => f.cat === "liked").length,
    trash: files.filter((f) => f.cat === "trash").length,
  }), [files]);

  const TREE: { key: CatKey; label: string; icon: ReactElement }[] = [
    { key: "all", label: t("all"), icon: <Layers size={13} strokeWidth={2} /> },
    { key: "doc", label: t("documents"), icon: <FileText size={13} strokeWidth={2} /> },
    { key: "proto", label: t("protos"), icon: <FlaskConical size={13} strokeWidth={2} /> },
    { key: "final", label: t("finals"), icon: <CheckCircle2 size={13} strokeWidth={2} /> },
    { key: "chats", label: t("chats"), icon: <MessageSquare size={13} strokeWidth={2} /> },
    { key: "liked", label: "Curtidas", icon: <Heart size={13} strokeWidth={2} /> },
    { key: "trash", label: "Deletados", icon: <Trash2 size={13} strokeWidth={2} /> },
  ];

  const goCat = (k: CatKey) => {
    setCat(k); setPage(0);
    if (k === "liked") seenLiked();
  };

  const removeFile = (f: GalleryFile) => {
    if (f.cat === "liked") unlike(f.id.replace("like-", ""));
    if (f.cat === "trash" && f.id.startsWith("trash-")) purgeTrash(f.id.replace("trash-", ""));
  };

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const togglePage = () => {
    const ids = pageFiles.map((f) => f.id);
    const all = ids.length > 0 && ids.every((id) => selected.includes(id));
    setSelected((prev) => all ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const deleteSelected = () => {
    const chosen = files.filter((f) => selected.includes(f.id));
    unlikeMany(chosen.filter((f) => f.cat === "liked").map((f) => f.id.replace("like-", "")));
    deleteMany(chosen.filter((f) => f.cat === "chats").map((f) => f.id.replace("chat-", "")));
    chosen.filter((f) => f.cat === "trash" && f.id.startsWith("trash-"))
      .forEach((f) => purgeTrash(f.id.replace("trash-", "")));
    removeProtos(chosen.filter((f) => f.cat === "proto").map((f) => f.id));
    removeStoredDocs(chosen.filter((f) => f.id.startsWith("ob-")).map((f) => f.id));
    removeConfirmedDocs(chosen.filter((f) => f.id.startsWith("vc-")).map((f) => f.id));
    removeAttachments(chosen.filter((f) => f.id.startsWith("att-")).map((f) => f.id));
    bumpDocs();
    setSelected([]); setConfirming(false);
  };

  const unlikeMany = (ids: string[]) => ids.forEach(unlike);

  return (
    <div id="galleryWindow" className={galleryOpen ? "gw-open" : ""}>
      {/* titlebar */}
      <div className="gw-titlebar">
        <div className="gw-titlebar-left">
          <span className="gw-title-icon"><FolderOpen size={17} strokeWidth={2} /></span>
          <span className="gw-breadcrumb">GalleryBob / {cat === "all" ? t("all") : catLabel(cat)}</span>
        </div>
        <div className="gw-titlebar-right">
          <div className="gw-searchbox">
            <Search size={12} strokeWidth={2} />
            <input
              placeholder={t("searchFiles")}
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
            />
          </div>
          <button className="gw-close-btn" onClick={() => setGalleryOpen(false)}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="gw-body">
        {/* sidebar */}
        <aside className="gw-sidebar">
          <div className="gw-sidebar-title">{t("explorer")}</div>
          <div className="gw-tree">
            {TREE.map(({ key, label, icon }) => (
              <button
                key={key}
                className={`gw-tree-item${cat === key ? " active" : ""}`}
                onClick={() => goCat(key)}
              >
                {icon}
                {label}
                <span className="gw-badge">{counts[key]}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* main */}
        <div className="gw-main">
          <div className="gw-toolbar">
            <button className="gw-view-btn" onClick={togglePage} data-tip="Marcar esta pagina">
              {pageFiles.length > 0 && pageFiles.every((f) => selected.includes(f.id))
                ? <CheckSquare size={14} strokeWidth={2.2} />
                : <Square size={14} strokeWidth={2} />}
            </button>
            <div className="gw-view-btns">
              <button
                className={`gw-view-btn${view === "list" ? " active" : ""}`}
                onClick={() => setView("list")}
                title="Lista"
              >
                <List size={14} strokeWidth={2} />
              </button>
              <button
                className={`gw-view-btn${view === "grid" ? " active" : ""}`}
                onClick={() => setView("grid")}
                title="Grade"
              >
                <LayoutGrid size={14} strokeWidth={2} />
              </button>
            </div>
            <span className="gw-count-label">{visible.length} {t("files")}</span>
            <div className="gw-pagination">
              <button className="gw-page-btn" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
                <ChevronLeft size={11} strokeWidth={2} />
              </button>
              <button className="gw-page-btn active">{cur + 1}</button>
              <button className="gw-page-btn" disabled={cur >= pageCount - 1} onClick={() => setPage(cur + 1)}>
                <ChevronRight size={11} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className={`gw-file-area view-${view}`}>
            {pageFiles.length === 0 && (
              <div className="gw-empty" style={view === "grid" ? { gridColumn: "1/-1" } : undefined}>
                {q
                  ? <>Nada encontrado para <b>“{q}”</b>.</>
                  : cat === "all"
                    ? <>A galeria ainda está vazia. Anexe um arquivo ou peça um protótipo ao Bobby.</>
                    : <>Nenhum item em <b>{catLabel(cat)}</b> por enquanto.</>}
              </div>
            )}

            {view === "list" &&
              pageFiles.map((f) => (
                <div
                  key={f.id}
                  className={`gw-row${selected.includes(f.id) ? " selected" : ""}`}
                  onClick={() => openInTab(f)}
                  onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, file: f }); }}
                >
                  <button className="gw-check" onClick={(e) => { e.stopPropagation(); toggle(f.id); }}>
                    {selected.includes(f.id) ? <CheckSquare size={13} strokeWidth={2.3} /> : <Square size={13} strokeWidth={1.8} />}
                  </button>
                  <span className="gw-row-icon"><FileIcon name={f.name} size={15} /></span>
                  <span className="gw-row-name">{f.name}</span>
                  <span className={`gw-row-tag ${f.cat}`}>{catLabel(f.cat)}</span>
                  <span className="gw-row-date">{f.date}</span>
                  <button
                    className="gw-row-open"
                    title="Abrir"
                    onClick={(e) => { e.stopPropagation(); openInTab(f); }}
                  >
                    <ExternalLink size={11} strokeWidth={2} />
                  </button>
                  {f.cat === "trash" && f.id.startsWith("trash-") && (
                    <button
                      className="gw-row-open"
                      title="Restaurar conversa"
                      style={{ opacity: 1 }}
                      onClick={(e) => { e.stopPropagation(); restoreConv(f.id.replace("trash-", "")); }}
                    >
                      <RotateCcw size={11} strokeWidth={2} />
                    </button>
                  )}
                  {(f.cat === "liked" || (f.cat === "trash" && f.id.startsWith("trash-"))) && (
                    <button
                      className="gw-row-open"
                      title="Apagar desta pasta"
                      style={{ opacity: 1 }}
                      onClick={(e) => { e.stopPropagation(); removeFile(f); }}
                    >
                      <Trash2 size={11} strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}

            {view === "grid" &&
              pageFiles.map((f) => (
                <div
                  key={f.id}
                  className={`gw-card${selected.includes(f.id) ? " selected" : ""}`}
                  onClick={() => openInTab(f)}
                  onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, file: f }); }}
                >
                  <button className="gw-card-check" onClick={(e) => { e.stopPropagation(); toggle(f.id); }}>
                    {selected.includes(f.id) ? <CheckSquare size={13} strokeWidth={2.3} /> : <Square size={13} strokeWidth={1.8} />}
                  </button>
                  <span className="gw-card-icon"><FileIcon name={f.name} size={24} /></span>
                  <div className="gw-card-name">{f.name}</div>
                  <span className={`gw-row-tag ${f.cat}`}>{catLabel(f.cat)}</span>
                </div>
              ))}
          </div>

          {selected.length > 0 && (
            <div className="gw-selection">
              <CheckSquare size={14} strokeWidth={2.3} />
              <b>{selected.length}</b> selecionado{selected.length === 1 ? "" : "s"}
              <button onClick={() => setSelected([])}><X size={12} strokeWidth={2.3} />Desmarcar</button>
              <button className="danger" onClick={() => setConfirming(true)}><Trash2 size={12} strokeWidth={2.2} />Excluir</button>
            </div>
          )}
        </div>
      </div>

      {menu && (
        <div className="gw-context" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { openInTab(menu.file); setMenu(null); }}><ExternalLink size={12} />Abrir</button>
          <button onClick={() => { toggle(menu.file.id); setMenu(null); }}><MousePointer2 size={12} />Marcar item</button>
          {menu.file.cat === "chats" && (
            <button className="danger" onClick={() => { deleteMany([menu.file.id.replace("chat-", "")]); setMenu(null); }}>
              <Archive size={12} />Mover para Lixeira do Chat
            </button>
          )}
        </div>
      )}

      {confirming && (
        <div className="gw-confirm-back" onClick={() => setConfirming(false)}>
          <div className="gw-confirm" onClick={(e) => e.stopPropagation()}>
            <span className="gw-confirm-ico"><Trash2 size={20} strokeWidth={1.8} /></span>
            <b>Excluir {selected.length} item{selected.length === 1 ? "" : "s"}?</b>
            <p>
              Chats ativos irão para a Lixeira do Chat. Itens que ja estiverem na lixeira,
              mensagens curtidas e arquivos das pastas serao removidos definitivamente.
            </p>
            <div>
              <button onClick={() => setConfirming(false)}>Nao, voltar</button>
              <button className="danger" onClick={deleteSelected}>Sim, excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
