import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

/** Extensão do arquivo → linguagem do Monaco */
const MONACO_LANG: Record<string, string> = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  html: "html", htm: "html", css: "css", json: "json", md: "markdown",
  py: "python", java: "java", sql: "sql", sh: "shell", go: "go",
  rb: "ruby", php: "php", c: "c", cpp: "cpp", cs: "csharp", xml: "xml", yml: "yaml",
};
import {
  X, Download, Copy, Check, Search, Play, Pencil, Save,
  ChevronUp, ChevronDown, ExternalLink, Eye, Code2,
} from "lucide-react";
import { useBobby } from "../lib/store";
import { getAsset } from "../lib/blobStore";

const RUNNABLE = ["html", "htm", "svg"];

/** Marca as ocorrências da busca no texto exibido. */
function highlight(text: string, term: string, active: number) {
  if (!term.trim()) return text;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  let hit = -1;
  return parts.map((p, i) => {
    if (p.toLowerCase() !== term.toLowerCase()) return <span key={i}>{p}</span>;
    hit++;
    return <mark key={i} className={`dv-hit${hit === active ? " on" : ""}`} data-hit={hit}>{p}</mark>;
  });
}

export default function DocViewer() {
  const { docModal, setDocModal, pushSystem, updateAttachment } = useBobby();
  const [mode, setMode] = useState<"read" | "edit" | "run">("read");
  const [term, setTerm] = useState("");
  const [hit, setHit] = useState(0);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const a = docModal;

  useEffect(() => {
    if (!a) return;
    setMode("read"); setTerm(""); setHit(0);
    setDraft(a.content); setName(a.name);
  }, [a]);

  // PDF: usa o binário salvo para renderizar no viewer nativo.
  useEffect(() => {
    if (!a || a.kind !== "pdf" || !a.assetId) { setPdfUrl(null); return; }
    let url = "";
    void getAsset(a.assetId).then((b) => { if (b) { url = URL.createObjectURL(b); setPdfUrl(url); } });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [a]);

  const hits = useMemo(() => {
    if (!a || !term.trim()) return 0;
    return (a.content.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
  }, [a, term]);

  useEffect(() => {
    const el = bodyRef.current?.querySelector(`.dv-hit[data-hit="${hit}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [hit, term]);

  const dirty = mode === "edit" && (draft !== a?.content || name !== a?.name);

  // Sinaliza edição em andamento: o chat encolhe e a IA sabe do contexto.
  useEffect(() => {
    document.body.classList.toggle("code-editing", mode === "edit");
    return () => document.body.classList.remove("code-editing");
  }, [mode]);

  const tryClose = () => {
    if (dirty) { setAsking(true); return; }
    setDocModal(null);
  };

  if (!a) return null;

  const runnable = RUNNABLE.includes(a.ext);
  const isImage = a.kind === "image";
  const isPdfDoc = a.kind === "pdf";

  const copy = async () => {
    try { await navigator.clipboard.writeText(mode === "edit" ? draft : a.content); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { /* negado */ }
  };

  const download = async () => {
    const el = document.createElement("a");
    const persisted = a.assetId ? await getAsset(a.assetId) : null;
    const obj = persisted ? URL.createObjectURL(persisted) : "";
    el.href = a.dataUrl || obj || URL.createObjectURL(new Blob([draft], { type: "text/plain" }));
    el.download = name || a.name; el.click();
    if (obj) setTimeout(() => URL.revokeObjectURL(obj), 1000);
  };

  const save = () => {
    updateAttachment(a.id, name, draft);
    pushSystem(
      `**Mudanças realizadas** em \`${name}\`.\n\nO arquivo foi atualizado no card e segue disponível na galeria. Se quiser, me pergunta sobre o que você mudou — eu leio o novo conteúdo.`,
      "codigo"
    );
    setDocModal({ ...a, name, content: draft });
    setMode("read");
  };

  const step = (d: number) => setHit((h) => (hits ? (h + d + hits) % hits : 0));

  return (
    <div className="modal-overlay open" onClick={tryClose}>
      {asking && (
        <div className="dv-ask" onClick={(e) => e.stopPropagation()}>
          <b>Você tem alterações não salvas</b>
          <p>O que fazer com o que você editou em <code>{name}</code>?</p>
          <div className="dv-ask-btns">
            <button className="rag-btn" onClick={() => { setAsking(false); setDraft(a.content); setName(a.name); setDocModal(null); }}>
              Descartar
            </button>
            <button className="rag-btn" onClick={() => setAsking(false)}>Continuar editando</button>
            <button className="rag-btn primary" onClick={() => { setAsking(false); save(); setDocModal(null); }}>
              <Save size={12} strokeWidth={2} />Salvar
            </button>
          </div>
        </div>
      )}
      <div className="dv-shell" onClick={(e) => e.stopPropagation()}>
        {/* barra superior */}
        <header className="dv-bar">
          {mode === "edit" ? (
            <input className="dv-name" value={name} onChange={(e) => setName(e.target.value)} spellCheck={false} />
          ) : (
            <span className="dv-title">
              {a.name} <b style={{ color: a.color }}>{a.label}</b>
            </span>
          )}

          <div className="dv-tools">
            {!isImage && (
              <div className="dv-search">
                <Search size={12} strokeWidth={2} />
                <input
                  placeholder="Buscar no texto…"
                  value={term}
                  onChange={(e) => { setTerm(e.target.value); setHit(0); }}
                  onKeyDown={(e) => { if (e.key === "Enter") step(e.shiftKey ? -1 : 1); }}
                />
                {term && (
                  <>
                    <span className="dv-count">{hits ? hit + 1 : 0}/{hits}</span>
                    <button className="dv-mini" onClick={() => step(-1)}><ChevronUp size={11} strokeWidth={2.5} /></button>
                    <button className="dv-mini" onClick={() => step(1)}><ChevronDown size={11} strokeWidth={2.5} /></button>
                  </>
                )}
              </div>
            )}

            {runnable && (
              <button className={`dv-btn${mode === "run" ? " on" : ""}`} onClick={() => setMode(mode === "run" ? "read" : "run")} title="Executar">
                <Play size={13} strokeWidth={2} />
              </button>
            )}
            {!isImage && !isPdfDoc && (
              <button className={`dv-btn${mode === "edit" ? " on" : ""}`} onClick={() => setMode(mode === "edit" ? "read" : "edit")} title="Editar">
                {mode === "edit" ? <Eye size={13} strokeWidth={2} /> : <Pencil size={13} strokeWidth={2} />}
              </button>
            )}
            {mode === "edit" && (
              <button className="dv-btn save" onClick={save} title="Salvar"><Save size={13} strokeWidth={2} /></button>
            )}
            <button className="dv-btn" onClick={copy} title="Copiar">
              {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
            </button>
            <button className="dv-btn" onClick={download} title="Baixar"><Download size={13} strokeWidth={2} /></button>
            {runnable && (
              <button className="dv-btn" title="Abrir em nova aba" onClick={() => {
                const w = window.open("", "_blank");
                if (w) { w.document.write(draft); w.document.close(); }
              }}><ExternalLink size={13} strokeWidth={2} /></button>
            )}
            <button className="dv-btn close" onClick={tryClose} data-tip="Fechar"><X size={14} strokeWidth={2} /></button>
          </div>
        </header>

        {/* corpo */}
        <div className="dv-body" ref={bodyRef}>
          {isImage && a.dataUrl && <img className="dv-img" src={a.dataUrl} alt={a.name} />}

          {isPdfDoc && (
            pdfUrl
              ? <iframe className="dv-pdf" src={`${pdfUrl}#view=FitH`} title={a.name} />
              : <pre className="dv-pre">{highlight(a.content, term, hit)}</pre>
          )}

          {!isImage && !isPdfDoc && mode === "read" && (
            <pre className="dv-pre">{highlight(a.content, term, hit)}</pre>
          )}

          {mode === "edit" && (
            <Suspense fallback={<div className="dv-loading">Carregando editor…</div>}>
              <MonacoEditor
                height="100%"
                language={MONACO_LANG[a.ext] || "plaintext"}
                theme="vs-dark"
                value={draft}
                onChange={(v) => setDraft(v ?? "")}
                options={{
                  fontSize: 13,
                  fontFamily: "'Fira Code', ui-monospace, monospace",
                  minimap: { enabled: true, scale: 1 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  padding: { top: 16, bottom: 16 },
                  tabSize: 2,
                  wordWrap: "on",
                  folding: true,
                  bracketPairColorization: { enabled: true },
                }}
              />
            </Suspense>
          )}

          {mode === "run" && (
            /* Sandbox sem same-origin: o código do usuário não alcança o app. */
            <iframe className="dv-run" title="execução isolada" sandbox="allow-scripts allow-modals" srcDoc={draft} />
          )}
        </div>

        <footer className="dv-foot">
          <Code2 size={11} strokeWidth={2} />
          {mode === "run"
            ? "Execução isolada em sandbox — sem acesso ao chat nem aos seus dados"
            : mode === "edit"
              ? "Editor aberto · salve para registrar a mudança no chat"
              : `${a.content.length.toLocaleString("pt-BR")} caracteres · ${(a.size / 1024).toFixed(1)} KB`}
        </footer>
      </div>
    </div>
  );
}
