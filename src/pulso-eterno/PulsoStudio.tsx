import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Crosshair, ScanLine, Plus, Trash2, Download, Upload, Save,
  Link2, Unlink, Scissors, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
  CircleDot, AlertTriangle, Info, ChevronRight, ChevronDown, Search,
  Eye, Lock, LockOpen, MessageSquarePlus, Zap, Clock, Copy, RotateCcw, FileText,
  Globe, PackagePlus, Check, Minimize2, Locate,
} from "lucide-react";
import {
  loadMap, saveMap, makeNode, makeEdge, makeReaction, makeBubble,
  exportMap, importMap, mapStats, detectConflicts, whereUsed, History,
  syncBubbles, bubbleInfo,
  KIND_META, type PulsoMap, type OrbitNode, type OrbitKind, type Bubble,
} from "./core";
import TextWindow from "./TextWindow";
import "./RagConfig.css";
import RagConfigWindow from "./RagConfigWindow";
import RagConfigButton from "./RagConfigButton";
import { scanDom, scanSource, startPicker, type Found } from "./scanner";
import { helpFor } from "./help";
import {
  HIDDEN_ACTIONS, HIDDEN_CATEGORIES, pendingChanges, restoreAll,
  type HiddenCategory,
} from "./hidden";
import {
  buildDocument, parseFreeText, variations, KINDS, LAYOUTS, PALETTES,
  type DocKind, type DocLayout,
} from "./docFactory";
import {
  startInspector, buildDossier, applyCss, edits, revert, revertAll,
  type Locked,
} from "./devMode";
import { buildSite, SITE_KINDS, siteVariations } from "./siteFactory";
import {
  probe, recentTargets, remember, SUGGESTIONS, analyseStatic, staticSummary,
  send as sendAgent, listen as listenAgent, type Target,
} from "./bridge";
import {
  parseBlock, findClashes, inject, injected, removeInjected, removeAllInjected,
  makeDraggable, type Parsed, type Clash, type Position,
} from "./injector";

const HOST_ACTIONS = [
  "abrir.galeria", "abrir.historico", "abrir.base", "abrir.skills", "abrir.sentinela",
  "fechar.atual", "chat.novo", "chat.limpar", "cor.trocar", "cor.reverter",
  "view.expandir", "view.encolher", "cronometro.zerar", "curtir.mensagem", "card.identidade",
];

/** Rótulo com tutorial: duplo clique abre a explicação. */
function Lbl({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <label
      className="pe-lbl pe-help"
      onDoubleClick={() => window.dispatchEvent(new CustomEvent("pe:help", { detail: k }))}
      title="Duplo clique para entender"
    >
      {children}
      <Info size={9} />
    </label>
  );
}

export default function PulsoStudio({ onClose }: { onClose: () => void }) {
  const [map, setMap] = useState<PulsoMap>(loadMap);
  const [sel, setSel] = useState<string | null>(null);
  const [selBubble, setSelBubble] = useState<string | null>(null);
  const [tab, setTab] = useState<"grafo" | "bolhas" | "conflitos" | "docs" | "dev" | "alvo">("grafo");
  const [locked, setLocked] = useState<Locked[]>([]);
  const [inspecting, setInspecting] = useState(false);
  const [devMenu, setDevMenu] = useState<{ x: number; y: number; target: Locked } | null>(null);
  const [pasteFor, setPasteFor] = useState<Locked | null>(null);
  const [pasteCss, setPasteCss] = useState("");
  const [devLog, setDevLog] = useState(0);
  const inspector = useRef<{ stop: () => void } | null>(null);

  /* alvo externo */
  const [target, setTarget] = useState<Target | null>(null);
  const [url, setUrl] = useState("");
  const [agentOk, setAgentOk] = useState(false);
  const [staticSrc, setStaticSrc] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);

  /* injeção de elemento */
  const [addOpen, setAddOpen] = useState(false);
  const [addRaw, setAddRaw] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addPos, setAddPos] = useState<Position>("after");
  const [addRun, setAddRun] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [clashes, setClashes] = useState<Clash[]>([]);
  const [dragging, setDragging] = useState<{ finish: () => void } | null>(null);
  const [injLog, setInjLog] = useState(0);

  /* ouve o agente do projeto alvo */
  useEffect(() => listenAgent((r) => {
    if (r.type === "pulso:pong") {
      setAgentOk(true);
      flash(`Agente respondeu: ${r.elements} elementos em ${r.title || "página"}.`);
    }
    if (r.type === "pulso:found") {
      setFound(r.items.map((i) => ({
        label: i.label, selector: i.selector, kind: "acao" as const,
        origin: "alvo externo", suggested: i.label.toLowerCase().split(/\s+/).filter((w) => w.length > 2).slice(0, 5),
      })));
      setTab("grafo");
      flash(`${r.items.length} elementos vieram do alvo.`);
    }
    if (r.type === "pulso:picked") {
      setLocked((l) => [...l, {
        id: l.length + 1, selector: r.selector, label: r.label,
        tag: r.tag, classes: r.classes, rect: { x: 0, y: 0, w: 0, h: 0 },
      }]);
      flash(`"${r.label}" travado no alvo.`);
    }
    if (r.type === "pulso:dossier") {
      navigator.clipboard.writeText(
        `SELETOR\n${r.selector}\n\nMARKUP\n\`\`\`html\n${r.markup}\n\`\`\`\n\nCSS\n\`\`\`css\n${r.css}\n\`\`\``
      ).then(() => flash("Dossiê do alvo copiado."));
    }
    if (r.type === "pulso:ok") flash(r.detail || "Feito no alvo.");
    if (r.type === "pulso:error") flash(r.message);
  }), []);
  const [docKind, setDocKind] = useState<DocKind>("curriculo");
  const [docLayout, setDocLayout] = useState<DocLayout | "">("");
  const [docPal, setDocPal] = useState("");
  const [docRaw, setDocRaw] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  // Só uma categoria aberta por vez: menos ruído na leitura.
  const [openCat, setOpenCat] = useState<string>("acao");
  const [linking, setLinking] = useState<string | null>(null);
  const [cutting, setCutting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [maximized, setMaximized] = useState(false);
  const panning = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [toast, setToast] = useState("");
  const [pos, setPos] = useState({ x: 50, y: 30 });
  const [q, setQ] = useState("");
  const [help, setHelp] = useState<string | null>(null);
  const [wizard, setWizard] = useState<{ kind?: OrbitKind; label: string; warn: OrbitNode[] } | null>(null);
  const [bigText, setBigText] = useState<{ nodeId: string; rid: string } | null>(null);
  const [expandSat, setExpandSat] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [textWin, setTextWin] = useState<"triggers" | "questions" | "keeps" | "summary" | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const hist = useRef(new History());
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const nodeDrag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);

  const node = map.nodes.find((n) => n.id === sel) || null;
  const bubble = map.bubbles.find((b) => b.id === selBubble) || null;
  const stats = useMemo(() => mapStats(map), [map]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const commit = useCallback((next: PulsoMap, record = true) => {
    if (record) hist.current.push(map);
    // A bolha é consequência das ligações: sincroniza a cada mudança.
    const agrupado = syncBubbles(next);
    const final = { ...agrupado, conflicts: detectConflicts(agrupado) };
    setMap(final);
    saveMap(final);
  }, [map]);

  const patch = (id: string, data: Partial<OrbitNode>, record = false) =>
    commit({ ...map, nodes: map.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)) }, record);

  /* ── atalhos e ajuda ── */
  useEffect(() => {
    const onHelp = (e: Event) => setHelp((e as CustomEvent<string>).detail);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLinking(null); setCutting(false); setMenu(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const prev = hist.current.undo(map);
        if (prev) { setMap(prev); saveMap(prev); flash("Desfeito."); }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        const next = hist.current.redo(map);
        if (next) { setMap(next); saveMap(next); flash("Refeito."); }
      }
    };
    window.addEventListener("pe:help", onHelp);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("pe:help", onHelp); window.removeEventListener("keydown", onKey); };
  }, [map]);

  /* ── arrastar janela, nó e tela ── */
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (drag.current) setPos({ x: e.clientX - drag.current.dx, y: Math.max(0, e.clientY - drag.current.dy) });
      if (panning.current) {
        setPan({
          x: panning.current.px + (e.clientX - panning.current.x),
          y: panning.current.py + (e.clientY - panning.current.y),
        });
      }
      if (nodeDrag.current && canvas.current) {
        const r = canvas.current.getBoundingClientRect();
        patch(nodeDrag.current.id, {
          x: Math.max(10, (e.clientX - r.left - pan.x) / zoom - nodeDrag.current.dx),
          y: Math.max(10, (e.clientY - r.top - pan.y) / zoom - nodeDrag.current.dy),
        });
      }
    };
    const up = () => { drag.current = null; nodeDrag.current = null; panning.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  });

  /** Zoom que persegue o cursor, como nos editores vetoriais. */
  const onWheel = (e: React.WheelEvent) => {
    if (!canvas.current) return;
    e.preventDefault();
    const r = canvas.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const next = Math.min(2.2, Math.max(0.25, zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
    // Mantém o ponto sob o cursor ancorado durante a escala.
    setPan({
      x: mx - (mx - pan.x) * (next / zoom),
      y: my - (my - pan.y) * (next / zoom),
    });
    setZoom(next);
  };

  /** Abre o alvo no quadro e descobre o nível de acesso. */
  const openTarget = (endereco: string) => {
    const clean = endereco.trim();
    if (!clean) return;
    const full = /^https?:\/\//.test(clean) || clean.startsWith("/") ? clean : "http://" + clean;
    setAgentOk(false);
    setTarget({ mode: "offline", url: full, label: full });
    remember(full, full.replace(/^https?:\/\//, "").slice(0, 40));

    // O quadro precisa existir antes de sondar.
    setTimeout(() => {
      if (!frame.current) return;
      frame.current.src = full;
      frame.current.onload = () => {
        const t = probe(frame.current!, full);
        setTarget(t);
        if (t.mode === "agent") sendAgent(t, { type: "pulso:ping" });
        flash(t.mode === "same-origin" ? "Alvo aberto com acesso total." : "Alvo aberto. Verificando o agente…");
      };
    }, 30);
  };

  /* ── varreduras ── */
  const runScan = () => {
    const f = scanDom();
    setFound(f); setTab("grafo"); setOpenCat("acao");
    flash(`${f.length} elementos na tela.`);
  };

  /** Clique simples captura um; segurar abre o modo fila. */
  const pickHold = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickOne = () => startPicker((f) => {
    const item = Array.isArray(f) ? f[0] : f;
    const dup = whereUsed(item.label, map);
    if (dup.length) { flash(`"${item.label}" já é órbita.`); setSel(dup[0].id); setTab("grafo"); return; }
    addFromFound(item);
  }, { known: map.nodes.map((n) => n.label) });

  const pickMany = () => startPicker((f) => {
    const items = Array.isArray(f) ? f : [f];
    const novos = items
      .filter((i) => !whereUsed(i.label, map).length)
      .map((i, k) => makeNode({
        label: i.label, kind: i.kind, selector: i.selector,
        triggers: i.suggested, source: "scan", order: map.nodes.length + k,
        x: 60 + (k % 4) * 172, y: 70 + Math.floor(k / 4) * 118,
      }));
    if (!novos.length) { flash("Nada novo na fila."); return; }
    commit({ ...map, nodes: [...map.nodes, ...novos] });
    setTab("grafo");
    flash(`${novos.length} órbitas criadas de uma vez.`);
  }, { known: map.nodes.map((n) => n.label), queue: true });

  const readFile = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const text = await files[0].text();
    if (files[0].name.endsWith(".json")) {
      try { commit(importMap(text)); flash("Mapa importado."); }
      catch (e) { flash((e as Error).message); }
      return;
    }
    const f = scanSource(text, files[0].name);
    setFound(f); setTab("grafo"); setOpenCat("acao");
    flash(`${f.length} ações em ${files[0].name}.`);
  };

  const addFromFound = (f: Found) => {
    const n = makeNode({
      label: f.label, kind: f.kind, selector: f.selector,
      triggers: f.suggested, source: "scan", order: map.nodes.length,
    });
    commit({ ...map, nodes: [...map.nodes, n] });
    setSel(n.id); setTab("grafo");
  };

  /* ── assistente de nova órbita ── */
  const startWizard = () => setWizard({ label: "", warn: [] });
  const wizardType = (kind: OrbitKind) => setWizard((w) => w && { ...w, kind });
  const wizardCheck = (label: string) =>
    setWizard((w) => w && { ...w, label, warn: label.length > 2 ? whereUsed(label, map) : [] });

  const wizardSave = (policy?: "ask" | "guess") => {
    if (!wizard?.kind || !wizard.label.trim()) return;
    const n = makeNode({
      kind: wizard.kind, label: wizard.label.trim(),
      triggers: [wizard.label.trim().toLowerCase()], order: map.nodes.length,
    });
    let next = { ...map, nodes: [...map.nodes, n] };
    if (policy && wizard.warn.length) {
      const term = wizard.label.trim().toLowerCase();
      next = {
        ...next,
        conflicts: [...next.conflicts.filter((c) => c.term !== term),
          { term, nodeIds: [...wizard.warn.map((w) => w.id), n.id], policy }],
      };
    }
    commit(next);
    setSel(n.id); setWizard(null);
    flash(policy === "ask" ? "Criada. O Bobby vai perguntar quando houver dúvida."
      : policy === "guess" ? "Criada. O sistema decide sozinho."
      : "Órbita criada.");
  };

  /**
   * Encolhe o Studio, pisca o elemento três vezes na tela e
   * devolve a janela ao estado anterior com um clique.
   */
  const locateInstance = (nodeId: string) => {
    const n = map.nodes.find((x) => x.id === nodeId);
    if (!n?.selector) { flash("Essa órbita não aponta para um elemento da tela."); return; }
    const el = document.querySelector(n.selector);
    if (!el) { flash("O elemento não está na tela agora."); return; }

    {" "/>
    {" "/>
    <RagConfigWindow />
    document.body.classList.add("pe-locating");
    el.scrollIntoView({ block: "center", behavior: "smooth" });

    const r = el.getBoundingClientRect();
    const halo = document.createElement("div");
    halo.className = "pe-locate-halo";
    halo.style.cssText = `left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`;
    halo.innerHTML = `<span>${n.label}</span>`;
    document.body.appendChild(halo);

    const back = document.createElement("button");
    back.className = "pe-locate-back";
    back.textContent = "Voltar ao Studio";
    back.onclick = () => { halo.remove(); back.remove(); document.body.classList.remove("pe-locating"); };
    document.body.appendChild(back);

    // Some sozinho depois das três piscadas, se ninguém clicar.
    setTimeout(() => {
      if (document.body.contains(halo)) {
        halo.remove(); back.remove();
        document.body.classList.remove("pe-locating");
      }
    }, 7000);
  };

  /* ── grafo ── */
  const remove = (id: string) => {
    commit({
      ...map,
      nodes: map.nodes.filter((n) => n.id !== id),
      edges: map.edges.filter((e) => e.from !== id && e.to !== id),
    });
    if (sel === id) setSel(null);
    setMenu(null);
  };

  const link = (to: string) => {
    if (!linking || linking === to) { setLinking(null); return; }
    if (!map.edges.some((e) => e.from === linking && e.to === to))
      commit({ ...map, edges: [...map.edges, makeEdge(linking, to)] });
    setLinking(null);
  };

  const cut = (edgeId: string) => {
    commit({ ...map, edges: map.edges.filter((e) => e.id !== edgeId) });
    flash("Ligação cortada.");
  };

  const unlinkAll = (id: string) => {
    commit({ ...map, edges: map.edges.filter((e) => e.from !== id && e.to !== id) });
    setMenu(null); flash("Ligações removidas.");
  };

  /* ── bolhas ── */
  const newBubble = () => {
    const b = makeBubble({ name: `Bolha ${map.bubbles.length + 1}` });
    commit({ ...map, bubbles: [...map.bubbles, b] });
    setSelBubble(b.id); setTab("bolhas");
  };

  const patchBubble = (id: string, data: Partial<Bubble>) =>
    commit({ ...map, bubbles: map.bubbles.map((b) => (b.id === id ? { ...b, ...data } : b)) }, false);

  const assign = (nodeId: string, bubbleId?: string) => patch(nodeId, { bubbleId }, true);

  const download = () => {
    const blob = new Blob([exportMap(map)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pulso-eterno.json"; a.click();
  };

  /* ── derivados ── */
  const lines = map.edges.map((e) => {
    const a = map.nodes.find((n) => n.id === e.from);
    const b = map.nodes.find((n) => n.id === e.to);
    if (!a || !b) return null;
    return { id: e.id, x1: a.x + 72, y1: a.y + 26, x2: b.x + 72, y2: b.y + 26 };
  }).filter(Boolean);

  const visible = q ? map.nodes.filter((n) => n.label.toLowerCase().includes(q.toLowerCase())) : map.nodes;

  const byCat = useMemo(() => {
    const g: Record<string, Found[]> = {};
    found.forEach((f) => { (g[f.kind] ||= []).push(f); });
    return g;
  }, [found]);

  const already = (label: string) => whereUsed(label, map).length > 0;

  /** Caixa da bolha calculada pelos nós que contém. */
  const bubbleBox = (b: Bubble) => {
    const inside = map.nodes.filter((n) => n.bubbleId === b.id);
    if (!inside.length) return null;
    const xs = inside.map((n) => n.x), ys = inside.map((n) => n.y);
    return {
      x: Math.min(...xs) - 26, y: Math.min(...ys) - 34,
      w: Math.max(...xs) - Math.min(...xs) + 190,
      h: Math.max(...ys) - Math.min(...ys) + 122,
    };
  };

  const helpEntry = help ? helpFor(help) : null;
  const reaction = bigText ? map.nodes.find((n) => n.id === bigText.nodeId)?.reactions.find((r) => r.id === bigText.rid) : null;

  return createPortal(
    <div
      className={`pe-studio ctx-${tab}${maximized ? " maximized" : ""}`}
      style={maximized ? undefined : { left: pos.x, top: pos.y }}
    >
      <header
        className="pe-hd"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button,label")) return;
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
        }}
      >
        <span className="pe-orb"><span /><span /><span /></span>
        <div className="pe-hd-txt">
          <b>Pulso Eterno</b>
          <i>{stats.nodes} órbitas · {stats.bubbles} bolhas · {stats.triggers} satélites{stats.conflicts > 0 && ` · ${stats.conflicts} divergências`}</i>
        </div>

        <div className="pe-tools">
          <button className="pe-ico" disabled={!hist.current.canUndo}
            onClick={() => { const p = hist.current.undo(map); if (p) { setMap(p); saveMap(p); } }}
            title="Desfazer"><Undo2 size={13} /></button>
          <button className="pe-ico" disabled={!hist.current.canRedo}
            onClick={() => { const n = hist.current.redo(map); if (n) { setMap(n); saveMap(n); } }}
            title="Refazer"><Redo2 size={13} /></button>
          <span className="pe-div" />
          <button className={`pe-ico${cutting ? " on" : ""}`} onClick={() => setCutting(!cutting)} title="Tesoura"><Scissors size={13} /></button>
          <button
            className="pe-ico"
            title="Mira · clique captura um, segure para abrir a fila"
            onMouseDown={() => { pickHold.current = setTimeout(() => { pickHold.current = null; pickMany(); }, 480); }}
            onMouseUp={() => { if (pickHold.current) { clearTimeout(pickHold.current); pickHold.current = null; pickOne(); } }}
            onMouseLeave={() => { if (pickHold.current) { clearTimeout(pickHold.current); pickHold.current = null; } }}
          ><Crosshair size={13} /></button>
          <button className="pe-ico" onClick={runScan} title="Varrer a tela"><ScanLine size={13} /></button>
          <span className="pe-div" />
          <button className="pe-ico" onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))} title="Afastar"><ZoomOut size={13} /></button>
          <button className="pe-ico" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Centralizar"><Crosshair size={12} /></button>
          <button className="pe-ico" onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))} title="Aproximar"><ZoomIn size={13} /></button>
          <button className="pe-ico" onClick={() => setMaximized(!maximized)} title={maximized ? "Restaurar" : "Maximizar"}>
            {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <span className="pe-div" />
          <label className="pe-ico" title="Abrir tsx ou json">
            <Upload size={13} />
            <input type="file" accept=".tsx,.jsx,.ts,.js,.json" hidden onChange={(e) => readFile(e.target.files)} />
          </label>
          <button className="pe-ico" onClick={download} title="Exportar"><Download size={13} /></button>
          <button className="pe-ico danger" onClick={onClose} title="Fechar"><X size={14} /></button>
        </div>
      </header>

      <div className="pe-body">
        {/* ── lateral ── */}
        <aside className="pe-side">
          <div className="pe-tabs">
            <button className={tab === "grafo" ? "on" : ""} onClick={() => setTab("grafo")}>Órbitas</button>
            <button className={tab === "bolhas" ? "on" : ""} onClick={() => setTab("bolhas")}>Bolhas</button>

            <button className={`${tab === "conflitos" ? "on" : ""}${stats.conflicts ? " alert" : ""}`}
              onClick={() => setTab("conflitos")}>
              Divergências {stats.conflicts > 0 && <em>{stats.conflicts}</em>}
            </button>
            <button className={tab === "docs" ? "on" : ""} onClick={() => setTab("docs")}>Documentos</button>
            <button className={`${tab === "dev" ? "on" : ""} pe-devtab`} onClick={() => setTab("dev")}>
              DEV {locked.length > 0 && <em>{locked.length}</em>}
            </button>
            <button className={tab === "alvo" ? "on" : ""} onClick={() => setTab("alvo")}>
              Alvo {agentOk && <em className="ok">on</em>}
            </button>
          </div>

          {tab === "grafo" && (
            <>
              <div className="pe-search">
                <Search size={11} />
                <input placeholder="filtrar" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>

              <div className="pe-side-acts">
                <button className="pe-add" onClick={startWizard}><Plus size={12} />Nova órbita</button>
                <button className="pe-add" onClick={runScan} title="Varrer a tela"><ScanLine size={12} /></button>
              </div>

              <div className="pe-list">
                {/* Achados por categoria: só uma aberta por vez. */}
                {found.length > 0 && (
                  <div className="pe-found-box">
                    <div className="pe-found-hd">
                      <ScanLine size={10} />ACHADOS
                      <em>{found.length}</em>
                      <button className="pe-mini" onClick={() => setFound([])} title="Limpar"><X size={9} /></button>
                    </div>
                    {Object.entries(byCat).map(([cat, items]) => {
                      const aberta = openCat === cat;
                      const novos = items.filter((f) => !already(f.label)).length;
                      return (
                        <div key={cat} className="pe-cat">
                          <button className="pe-cat-hd"
                            style={{ ["--k" as string]: KIND_META[cat as OrbitKind].color }}
                            onClick={() => setOpenCat(aberta ? "" : cat)}>
                            {aberta ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            <span className="pe-dot" />
                            <b>{KIND_META[cat as OrbitKind].label}</b>
                            <em>{novos > 0 ? `${novos} novos` : "todos"}</em>
                          </button>
                          {aberta && items.map((f, i) => (
                            <button key={i} className={`pe-item found${already(f.label) ? " done" : ""}`}
                              onClick={() => !already(f.label) && addFromFound(f)}>
                              <span className="pe-item-txt">
                                <b>{f.label}</b>
                                <i>{f.origin}</i>
                              </span>
                              {already(f.label) ? <CircleDot size={10} /> : <Plus size={10} />}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Órbitas criadas, abaixo dos achados. */}
                <div className="pe-found-hd plain">
                  <CircleDot size={10} />ÓRBITAS
                  <em>{visible.length}</em>
                </div>

                {visible.map((n) => (
                  <div key={n.id}
                    className={`pe-item${sel === n.id ? " on" : ""}`}
                    style={{ ["--k" as string]: KIND_META[n.kind].color }}
                    onClick={() => (linking ? link(n.id) : setSel(n.id))}
                    onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, id: n.id }); }}>
                    <span className="pe-ord">{n.order}</span>
                    <span className="pe-item-txt">
                      <b>{n.label}</b>
                      <i>{n.triggers.length} satélites · ttl {n.ttl}</i>
                    </span>
                    {n.bubbleId && <span className="pe-in-bubble" title="dentro de uma bolha" />}
                    <Eye size={9} className="pe-watch" />
                  </div>
                ))}
                {!visible.length && <p className="pe-empty">Nada aqui. Use a mira ou crie uma órbita.</p>}
              </div>
            </>
          )}

          {tab === "bolhas" && (
            <>
              <button className="pe-add" onClick={newBubble}><Plus size={12} />Nova bolha</button>
              <div className="pe-bubble-count">
                <span><b>{map.bubbles.filter((b) => b.sealed).length}</b>finalizadas</span>
                <span><b>{map.bubbles.filter((b) => !b.sealed).length}</b>em edição</span>
                <span><b>{map.nodes.filter((n) => !n.bubbleId).length}</b>soltas</span>
              </div>
              <div className="pe-list">
                {map.bubbles.map((b) => {
                  const count = map.nodes.filter((n) => n.bubbleId === b.id).length;
                  return (
                    <button key={b.id}
                      className={`pe-item${selBubble === b.id ? " on" : ""}`}
                      style={{ ["--k" as string]: b.color }}
                      onClick={() => setSelBubble(b.id)}>
                      <span className="pe-dot" />
                      <span className="pe-item-txt">
                        <b>{b.name}</b>
                        <i>{count} órbitas{b.sealed ? " · lacrada" : ""}</i>
                      </span>
                      {b.sealed ? <Lock size={9} /> : <LockOpen size={9} />}
                    </button>
                  );
                })}
                {!map.bubbles.length && (
                  <p className="pe-empty">
                    A bolha agrupa órbitas do mesmo assunto e resolve palavra ambígua.
                  </p>
                )}
              </div>
            </>
          )}



          {tab === "alvo" && (
            <div className="pe-list pe-alvo">
              <Lbl k="alvo">Projeto alvo</Lbl>
              <div className="pe-urlbar">
                <input
                  placeholder="http://localhost:5173 ou index.html"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") openTarget(url); }}
                />
                <button className="pe-mini" onClick={() => openTarget(url)}>Abrir</button>
              </div>

              <div className="pe-chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s.url} className="pe-chip-sm" onClick={() => { setUrl(s.url); openTarget(s.url); }}>
                    {s.label}
                  </button>
                ))}
              </div>

              <label className="pe-btn wide">
                <Upload size={12} />Abrir arquivo do disco
                <input type="file" accept=".html,.htm,.tsx,.jsx,.vue,.svelte" hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const text = await f.text();
                    setStaticSrc(text);
                    setTarget({ mode: "static", url: f.name, label: f.name, source: text });
                    const items = analyseStatic(text);
                    setFound(items.map((i) => ({
                      label: i.label, selector: i.classes[0] ? "." + i.classes[0] : i.tag,
                      kind: "acao" as const, origin: `${f.name}:${i.line}`,
                      suggested: i.label.toLowerCase().split(/\s+/).filter((w) => w.length > 2).slice(0, 5),
                    })));
                    flash(`${items.length} elementos lidos de ${f.name}.`);
                  }} />
              </label>

              {recentTargets().length > 0 && (
                <>
                  <Lbl k="alvo">Recentes</Lbl>
                  {recentTargets().map((t) => (
                    <button key={t.url} className="pe-item" onClick={() => { setUrl(t.url); openTarget(t.url); }}>
                      <span className="pe-item-txt"><b>{t.label}</b><i>{t.url}</i></span>
                    </button>
                  ))}
                </>
              )}

              {target && (
                <div className={`pe-conn mode-${target.mode}`}>
                  <div className="pe-conn-hd">
                    <span className="pe-conn-dot" />
                    <b>{
                      target.mode === "same-origin" ? "Acesso total"
                      : target.mode === "agent" ? (agentOk ? "Agente conectado" : "Aguardando agente")
                      : target.mode === "static" ? "Leitura de arquivo"
                      : "Sem conexão"
                    }</b>
                  </div>
                  <p>{
                    target.mode === "same-origin" ? "Mesma origem: dá para inspecionar, copiar e aplicar direto."
                    : target.mode === "agent" ? (agentOk
                        ? "O agente respondeu. Inspeção e injeção liberadas por mensagem."
                        : "Origem diferente. Instale o agente no alvo para liberar a inspeção.")
                    : target.mode === "static" ? "Arquivo lido como texto. Análise estática, sem execução."
                    : target.error || "Não foi possível conectar."
                  }</p>

                  {target.mode === "static" && staticSrc && (
                    <div className="pe-static">
                      {Object.entries(staticSummary(staticSrc)).map(([k, v]) => (
                        <span key={k}><b>{v}</b>{k}</span>
                      ))}
                    </div>
                  )}

                  {target.mode !== "static" && (
                    <div className="pe-conn-acts">
                      <button className="pe-mini" onClick={() => sendAgent(target, { type: "pulso:ping" })}>
                        Testar
                      </button>
                      <button className="pe-mini" onClick={() => sendAgent(target, { type: "pulso:scan" })}>
                        Varrer alvo
                      </button>
                      <button className="pe-mini" onClick={() => sendAgent(target, { type: "pulso:inspect", on: true })}>
                        Inspecionar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {target?.mode === "agent" && !agentOk && (
                <div className="pe-agent-help">
                  <b>Instalar o agente</b>
                  <p>Copie <code>pulso-agent.js</code> para o projeto e adicione antes do fechamento do corpo:</p>
                  <pre>{`<script src="pulso-agent.js"></script>`}</pre>
                  <button className="pe-mini" onClick={() => {
                    navigator.clipboard.writeText(`<script src="pulso-agent.js"></script>`)
                      .then(() => flash("Linha copiada."));
                  }}><Copy size={9} />Copiar linha</button>
                </div>
              )}

              <div className="pe-tip">
                <Info size={12} />
                <span>
                  Sem servidor também funciona: abra o arquivo do disco e o Studio faz
                  análise estática, encontrando os elementos por leitura de texto.
                </span>
              </div>
            </div>
          )}

          {tab === "dev" && (
            <div className="pe-list pe-dev">
              <div className="pe-dev-warn">
                <AlertTriangle size={13} />
                <div>
                  <b>Zona permanente</b>
                  <span>O que você aplicar aqui não é da sessão do chat. Fica registrado e só sai revertendo.</span>
                </div>
              </div>

              <button className="pe-btn wide" onClick={() => {
                setAddOpen(true); setAddRaw(""); setParsed(null); setClashes([]);
                setAddLabel(locked[0]?.label ? `perto de ${locked[0].label}` : "Elemento novo");
              }}>
                <PackagePlus size={12} />Adicionar elemento
              </button>

              <button className={`pe-btn wide${inspecting ? " primary" : ""}`}
                onClick={() => {
                  if (inspecting) { inspector.current?.stop(); setInspecting(false); return; }
                  setInspecting(true);
                  inspector.current = startInspector(
                    (list) => setLocked(list),
                    (x, y, target) => setDevMenu({ x, y, target }),
                    locked
                  );
                }}>
                <Crosshair size={12} />{inspecting ? "Encerrar inspeção" : "Inspecionar e travar"}
              </button>

              {locked.length > 0 && (
                <>
                  <Lbl k="dev">Alvos travados</Lbl>
                  {locked.map((l) => (
                    <div key={l.id} className="pe-target">
                      <span className="pe-target-n">{l.id}</span>
                      <span className="pe-target-txt">
                        <b>{l.label}</b>
                        <i>{l.tag}{l.classes[0] ? "." + l.classes[0] : ""}</i>
                      </span>
                      <button className="pe-mini" onClick={() => setDevMenu({ x: 320, y: 260, target: l })}>
                        <ChevronRight size={10} />
                      </button>
                    </div>
                  ))}

                  <div className="pe-dev-acts">
                    <button className="pe-btn primary" onClick={() => {
                      const d = buildDossier(locked);
                      navigator.clipboard.writeText(d.full)
                        .then(() => flash(`Dossiê de ${locked.length} alvo(s) copiado.`))
                        .catch(() => flash("O navegador negou o acesso à área de transferência."));
                    }}>
                      <Copy size={12} />Copiar tudo
                    </button>
                    <button className="pe-btn" onClick={() => { setLocked([]); inspector.current?.stop(); setInspecting(false); }}>
                      <Unlink size={12} />Destravar todos
                    </button>
                  </div>
                </>
              )}

              {injected().length > 0 && (
                <>
                  <Lbl k="dev">Elementos inseridos</Lbl>
                  <div className="pe-editlist" data-v={injLog}>
                    {injected().map((i) => (
                      <div key={i.id} className="pe-edit-item">
                        <span className="pe-edit-txt">
                          <b>{i.label}</b>
                          <code>{i.styleId ? "css " : ""}{i.scriptId ? "js " : ""}#{i.hostId}</code>
                        </span>
                        <button className="pe-mini danger"
                          onClick={() => { removeInjected(i.id); setInjLog((v) => v + 1); flash("Elemento removido."); }}>
                          <Trash2 size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="pe-btn wide"
                    onClick={() => { flash(`${removeAllInjected()} elemento(s) removido(s).`); setInjLog((v) => v + 1); }}>
                    <RotateCcw size={12} />Remover todos os inseridos
                  </button>
                </>
              )}

              <Lbl k="dev">Alterações aplicadas</Lbl>
              <div className="pe-editlist" data-v={devLog}>
                {edits().slice(0, 12).map((e) => (
                  <div key={e.id} className="pe-edit-item">
                    <span className="pe-edit-txt">
                      <b>{e.label}</b>
                      <code>{e.css.slice(0, 46)}{e.css.length > 46 ? "…" : ""}</code>
                    </span>
                    <button className="pe-mini danger" onClick={() => { revert(e.id); setDevLog((v) => v + 1); flash("Revertido."); }}>
                      <RotateCcw size={9} />
                    </button>
                  </div>
                ))}
                {!edits().length && <p className="pe-empty small">Nenhuma alteração aplicada ainda.</p>}
              </div>

              {edits().length > 0 && (
                <button className="pe-btn wide" onClick={() => { flash(`${revertAll()} alterações revertidas.`); setDevLog((v) => v + 1); }}>
                  <RotateCcw size={12} />Reverter tudo
                </button>
              )}

              <div className="pe-tip">
                <Info size={12} />
                <span>
                  O dossiê traz markup vivo, CSS autoral, estilo computado e o arquivo provável —
                  além do prompt que proíbe a outra IA de inventar função.
                </span>
              </div>
            </div>
          )}

          {tab === "docs" && (
            <div className="pe-list pe-docs">
              <p className="pe-empty">
                Montagem por combinação: {variations()} arranjos de documento e{" "}
                {siteVariations()} de página, sem nenhuma chamada de IA.
              </p>

              <Lbl k="reacoes">Tipo</Lbl>
              <div className="pe-kinds">
                {KINDS.map((k) => (
                  <button key={k.id} className={`pe-kind${docKind === k.id ? " on" : ""}`}
                    style={{ ["--k" as string]: "#7c3aed" }}
                    onClick={() => setDocKind(k.id)}>{k.name}</button>
                ))}
              </div>

              <Lbl k="tipos">Layout</Lbl>
              <select className="pe-select wide" value={docLayout}
                onChange={(e) => setDocLayout(e.target.value as DocLayout)}>
                <option value="">sorteia na hora</option>
                {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.hint}</option>)}
              </select>

              <Lbl k="tipos">Paleta</Lbl>
              <select className="pe-select wide" value={docPal} onChange={(e) => setDocPal(e.target.value)}>
                <option value="">sorteia na hora</option>
                {PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <Lbl k="perguntas">Conteúdo</Lbl>
              <textarea className="pe-ta" rows={8}
                placeholder={"Cole o texto cru. O sistema separa sozinho:\n\nTÍTULO EM MAIÚSCULAS vira seção\n- linha com traço vira item de lista\nemail@exemplo.com vira contato"}
                value={docRaw} onChange={(e) => setDocRaw(e.target.value)} />

              <button className="pe-btn primary wide" onClick={() => {
                const data = parseFreeText(docRaw || "Documento de exemplo");
                const html = buildDocument({
                  kind: docKind,
                  layout: docLayout || undefined,
                  palette: docPal || undefined,
                  data,
                });
                const w = window.open("", "_blank");
                if (w) { w.document.write(html); w.document.close(); }
                flash("Documento gerado.");
              }}>
                <FileText size={12} />Gerar documento
              </button>

              <Lbl k="tipos">Página web</Lbl>
              <div className="pe-kinds">
                {SITE_KINDS.map((s) => (
                  <button key={s.id} className="pe-kind" style={{ ["--k" as string]: "#16a34a" }}
                    title={s.hint}
                    onClick={() => {
                      const d = parseFreeText(docRaw || "");
                      const html = buildSite(s.id, {
                        title: d.title, tagline: d.summary,
                        about: d.sections?.[0]?.body || d.summary,
                        items: d.sections?.slice(0, 6).map((x) => ({ title: x.title, text: x.body })),
                        contact: d.contact,
                      }, docPal || undefined);
                      const w = window.open("", "_blank");
                      if (w) { w.document.write(html); w.document.close(); }
                      flash(`Site ${s.name} gerado.`);
                    }}>{s.name}</button>
                ))}
              </div>

              <div className="pe-tip">
                <Info size={12} />
                <span>
                  Sem layout e paleta definidos, cada geração sai diferente. Só chame
                  a IA se a pessoa reclamar do resultado.
                </span>
              </div>
            </div>
          )}

          {tab === "conflitos" && (
            <div className="pe-list">
              {map.conflicts.map((c) => (
                <div key={c.term} className="pe-conflict">
                  <div className="pe-conflict-hd">
                    <AlertTriangle size={11} />
                    <b>{c.term}</b>
                  </div>
                  <p>{c.nodeIds.map((id) => map.nodes.find((n) => n.id === id)?.label).filter(Boolean).join(" · ")}</p>
                  <div className="pe-policy">
                    {(["ask", "guess"] as const).map((p) => (
                      <button key={p} className={c.policy === p ? "on" : ""}
                        onClick={() => commit({
                          ...map,
                          conflicts: map.conflicts.map((x) => (x.term === c.term ? { ...x, policy: p } : x)),
                        }, false)}>
                        {p === "ask" ? "Perguntar" : "Chutar"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!map.conflicts.length && (
                <p className="pe-empty">
                  Nenhuma palavra disputada. Quando duas órbitas usarem o mesmo termo, ele aparece aqui.
                </p>
              )}
            </div>
          )}
        </aside>

        {/* ── quadro do alvo externo ── */}
        {tab === "alvo" && (
          <div className="pe-viewport">
            <div className="pe-viewport-bar">
              <span>{target?.label || "nenhum alvo aberto"}</span>
              {target && <button className="pe-mini" onClick={() => openTarget(target.url)}>Recarregar</button>}
            </div>
            <iframe ref={frame} className="pe-frame" title="alvo"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
            {!target && (
              <div className="pe-viewport-empty">
                <Globe size={26} />
                <b>Nenhum alvo aberto</b>
                <span>Digite o endereço do servidor ou abra um arquivo do disco.</span>
              </div>
            )}
          </div>
        )}

        {/* ── canvas ── */}
        <div className={`pe-canvas${cutting ? " cutting" : ""}`} ref={canvas}
          style={tab === "alvo" ? { display: "none" } : undefined}
          onClick={() => setMenu(null)}
          data-far={zoom < 0.7 ? "1" : "0"}
          onWheel={onWheel}
          onMouseDown={(e) => {
            // Botão do meio arrasta a tela, como no CorelDRAW.
            if (e.button === 1) {
              e.preventDefault();
              panning.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            }
          }}>
          <div className="pe-scale"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            {/* bolhas por trás */}
            {map.bubbles.map((b) => {
              const box = bubbleBox(b);
              if (!box) return null;
              return (
                <div key={b.id}
                  className={`pe-bubble${b.sealed ? " sealed" : " editing"}${selBubble === b.id ? " on" : ""}`}
                  style={{ left: box.x, top: box.y, width: box.w, height: box.h, ["--k" as string]: b.color }}
                  onClick={(e) => { e.stopPropagation(); setSelBubble(b.id); setTab("bolhas"); }}>
                  <span className="pe-bubble-tag">
                    {b.sealed ? <Lock size={9} /> : <LockOpen size={9} />}
                    {b.name}
                  </span>
                  {zoom < 0.7 && b.summary && <span className="pe-bubble-sum">{b.summary}</span>}
                </div>
              );
            })}

            <svg className="pe-wires">
              {lines.map((l) => (
                <g key={l!.id} className={cutting ? "cut" : ""}
                  onClick={(e) => { if (cutting) { e.stopPropagation(); cut(l!.id); } }}>
                  <path d={`M ${l!.x1} ${l!.y1} C ${l!.x1 + 60} ${l!.y1}, ${l!.x2 - 60} ${l!.y2}, ${l!.x2} ${l!.y2}`}
                    fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 3" />
                  <path className="pe-hit" d={`M ${l!.x1} ${l!.y1} C ${l!.x1 + 60} ${l!.y1}, ${l!.x2 - 60} ${l!.y2}, ${l!.x2} ${l!.y2}`}
                    fill="none" stroke="transparent" strokeWidth="12" />
                  <circle cx={l!.x2} cy={l!.y2} r="3" fill="currentColor" />
                </g>
              ))}
            </svg>

            {map.nodes.map((n) => {
              const open = expandSat === n.id;
              const semBolha = !n.bubbleId;
              return (
                <div key={n.id}
                  className={`pe-node${sel === n.id ? " on" : ""}${linking === n.id ? " linking" : ""}${semBolha ? " solo" : ""}`}
                  style={{ left: n.x, top: n.y, ["--k" as string]: KIND_META[n.kind].color }}
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    nodeDrag.current = { id: n.id, dx: e.nativeEvent.offsetX, dy: e.nativeEvent.offsetY };
                    setSel(n.id);
                  }}
                  onClick={() => linking && link(n.id)}
                  onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, id: n.id }); }}>
                  <span className="pe-node-ord">{n.order}</span>
                  <span className="pe-node-kind">{KIND_META[n.kind].label}</span>
                  <b>{n.label}</b>
                  <div className="pe-node-meta">
                    <span><MessageSquarePlus size={9} />{n.reactions.length}</span>
                    <span><Clock size={9} />{n.ttl}</span>
                  </div>

                  {/* satélites orbitando com linha */}
                  {n.triggers.length > 0 && (
                    <>
                      <span className="pe-sat-wire" />
                      <button className={`pe-sat${open ? " open" : ""}`}
                        onClick={(e) => { e.stopPropagation(); setExpandSat(open ? null : n.id); }}>
                        <Zap size={8} />{KIND_META[n.kind].label} · {n.triggers.length}
                      </button>
                      {open && (
                        <div className="pe-sat-list">
                          {n.triggers.filter(Boolean).map((t, i) => (
                            <span key={i} className="pe-sat-chip">{t}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <button className="pe-node-link"
                    onClick={(e) => { e.stopPropagation(); setLinking(linking === n.id ? null : n.id); }}
                    title="Ligar a outra órbita">
                    {linking === n.id ? <Unlink size={10} /> : <Link2 size={10} />}
                  </button>
                </div>
              );
            })}
          </div>

          {linking && <div className="pe-hint">Clique na órbita de destino · Esc cancela</div>}
          {cutting && <div className="pe-hint cut">Modo tesoura · clique numa linha para cortar</div>}
          {!map.nodes.length && (
            <div className="pe-canvas-empty">
              <CircleDot size={22} />
              <b>Mapa vazio</b>
              <span>Use a mira para apontar um botão na tela, ou crie uma órbita à mão.</span>
            </div>
          )}
        </div>

        {/* ── editor da órbita ── */}
        {node && !bubble && (
          <aside className="pe-edit">
            <div className="pe-edit-hd">
              <input className="pe-title" value={node.label}
                onChange={(e) => patch(node.id, { label: e.target.value })} />
              <button className="pe-ico danger" onClick={() => remove(node.id)}><Trash2 size={13} /></button>
            </div>

            <div className="pe-watching"><Eye size={10} />Vigiando · camada {node.order}</div>

            {/* Informação da órbita: o que ela é e como se comporta. */}
            <div className="pe-info">
              <div><b>{node.triggers.filter(Boolean).length}</b><span>satélites</span></div>
              <div><b>{node.reactions.length}</b><span>reações</span></div>
              <div><b>{node.ttl}</b><span>turnos</span></div>
              <div><b>{map.edges.filter((e) => e.from === node.id || e.to === node.id).length}</b><span>ligações</span></div>
            </div>
            <div className="pe-info-line">
              <span>Tipo</span><b style={{ color: KIND_META[node.kind].color }}>{KIND_META[node.kind].label}</b>
            </div>
            <div className="pe-info-line">
              <span>Bolha</span>
              <b>{node.bubbleId ? map.bubbles.find((b) => b.id === node.bubbleId)?.name : "solta"}</b>
            </div>
            <div className="pe-info-line">
              <span>Resposta</span><b>{node.explains ? "em sequência" : "sorteada"}</b>
            </div>
            <div className="pe-info-line">
              <span>Origem</span><b>{node.source === "scan" ? "varredura" : "manual"}</b>
            </div>

            <Lbl k="tipos">Tipo</Lbl>
            <div className="pe-kinds">
              {(Object.keys(KIND_META) as OrbitKind[]).map((k) => (
                <button key={k} className={`pe-kind${node.kind === k ? " on" : ""}`}
                  style={{ ["--k" as string]: KIND_META[k].color }}
                  onClick={() => patch(node.id, { kind: k }, true)}>{KIND_META[k].label}</button>
              ))}
            </div>

            <Lbl k="ordem">Ordem</Lbl>
            <div className="pe-row">
              <input type="number" className="pe-num" value={node.order} min={0}
                onChange={(e) => patch(node.id, { order: +e.target.value })} />
              <span className="pe-hintline">0 é o objeto vigiado. Menor vence a disputa.</span>
            </div>

            {map.bubbles.length > 0 && (
              <>
                <Lbl k="bolha">Bolha</Lbl>
                <select className="pe-select wide" value={node.bubbleId || ""}
                  onChange={(e) => assign(node.id, e.target.value || undefined)}>
                  <option value="">solta no mapa</option>
                  {map.bubbles.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </>
            )}

            {node.selector && (<><Lbl k="mira">Elemento</Lbl><code className="pe-sel">{node.selector}</code></>)}

            <Lbl k="satelite">Satélites · camada 1</Lbl>
            <button className="pe-field" onClick={() => setTextWin("triggers")}>
              <span className="pe-field-n">{node.triggers.filter(Boolean).length}</span>
              <span className="pe-field-txt">
                {node.triggers.filter(Boolean).slice(0, 3).join(" · ") || "nenhum satélite ainda"}
              </span>
              <Maximize2 size={11} />
            </button>

            <Lbl k="perguntas">Mensagens do usuário</Lbl>
            <button className="pe-field" onClick={() => setTextWin("questions")}>
              <span className="pe-field-n">{node.questions.filter(Boolean).length}</span>
              <span className="pe-field-txt">
                {node.questions.filter(Boolean)[0] || "nenhuma mensagem cadastrada"}
              </span>
              <Maximize2 size={11} />
            </button>

            <Lbl k="ttl">Tempo de órbita</Lbl>
            <div className="pe-row">
              <input type="range" min={1} max={12} value={node.ttl}
                onChange={(e) => patch(node.id, { ttl: +e.target.value })} />
              <b className="pe-ttl">{node.ttl}</b>
            </div>

            <label className="pe-check" onDoubleClick={() => setHelp("explica")}>
              <input type="checkbox" checked={node.explains}
                onChange={(e) => patch(node.id, { explains: e.target.checked }, true)} />
              Bobby explica em sequência
            </label>

            <div className="pe-lbl-row">
              <Lbl k="reacoes">{node.explains ? "Passos" : "Respostas"} · camada 2+</Lbl>
              <button className="pe-mini"
                onClick={() => patch(node.id, { reactions: [...node.reactions, makeReaction(node.reactions.length)] }, true)}>
                <Plus size={10} />Adicionar
              </button>
            </div>

            {node.reactions.map((r, i) => (
              <div key={r.id} className="pe-reaction">
                <div className="pe-reaction-hd">
                  <span>Camada {i + 2}</span>
                  <button className="pe-mini" onClick={() => setBigText({ nodeId: node.id, rid: r.id })}>
                    <Maximize2 size={9} />Abrir
                  </button>
                  <button className="pe-mini danger"
                    onClick={() => patch(node.id, { reactions: node.reactions.filter((x) => x.id !== r.id) }, true)}>
                    <Trash2 size={9} />
                  </button>
                </div>
                <textarea className="pe-ta small" rows={2} maxLength={10000}
                  placeholder="Uma fala por linha."
                  value={r.messages.join("\n")}
                  onChange={(e) => patch(node.id, {
                    reactions: node.reactions.map((x) => x.id === r.id ? { ...x, messages: e.target.value.split("\n") } : x),
                  })} />
                <div className="pe-actions-pick">
                  {r.actions.map((a) => (
                    <span key={a} className="pe-act">{a}
                      <button onClick={() => patch(node.id, {
                        reactions: node.reactions.map((x) => x.id === r.id ? { ...x, actions: x.actions.filter((y) => y !== a) } : x),
                      }, true)}><X size={8} /></button>
                    </span>
                  ))}
                  {r.actions.length < 2 && (
                    <select className="pe-select" value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        patch(node.id, {
                          reactions: node.reactions.map((x) => x.id === r.id ? { ...x, actions: [...x.actions, e.target.value] } : x),
                        }, true);
                      }}>
                      <option value="">+ ação</option>
                      {HOST_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  )}
                </div>
              </div>
            ))}

            {/* ── ações ocultas ── */}
            <div className="pe-lbl-row">
              <Lbl k="ocultas">Ações ocultas</Lbl>
              <button className="pe-mini" onClick={() => setShowHidden(!showHidden)}>
                {showHidden ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {HIDDEN_ACTIONS.length}
              </button>
            </div>

            {showHidden && (
              <div className="pe-hidden">
                <p className="pe-hidden-note">
                  Sem botão na interface. Só saem daqui, pela conversa. Quem descobre
                  como pedir recebe uma resposta diferente na primeira vez.
                </p>

                {(Object.keys(HIDDEN_CATEGORIES) as HiddenCategory[]).map((cat) => (
                  <div key={cat} className="pe-hcat" style={{ ["--k" as string]: HIDDEN_CATEGORIES[cat].color }}>
                    <div className="pe-hcat-hd">
                      <span className="pe-dot" />
                      <b>{HIDDEN_CATEGORIES[cat].label}</b>
                      <i>{HIDDEN_CATEGORIES[cat].hint}</i>
                    </div>
                    {HIDDEN_ACTIONS.filter((a) => a.category === cat).map((a) => {
                      const on = node.reactions.some((r) => r.actions.includes("oculta:" + a.id));
                      return (
                        <button key={a.id} className={`pe-haction${on ? " on" : ""}`}
                          onClick={() => {
                            const tag = "oculta:" + a.id;
                            const first = node.reactions[0] || makeReaction(0);
                            const rest = node.reactions.slice(1);
                            const has = first.actions.includes(tag);
                            patch(node.id, {
                              reactions: [
                                { ...first, actions: has ? first.actions.filter((x) => x !== tag) : [...first.actions.slice(0, 1), tag] },
                                ...rest,
                              ],
                            }, true);
                          }}>
                          <span className="pe-haction-txt">
                            <b>{a.label}</b>
                            {a.autoRevert && <i>volta em {a.autoRevert / 1000}s</i>}
                          </span>
                          {on ? <CircleDot size={10} /> : <Plus size={10} />}
                        </button>
                      );
                    })}
                  </div>
                ))}

                <div className="pe-restore">
                  <span>{pendingChanges()} alteração(ões) ativa(s)</span>
                  <button onClick={() => flash(`${restoreAll()} alterações desfeitas.`)}>
                    <RotateCcw size={10} />Restaurar tudo
                  </button>
                </div>
              </div>
            )}

            <button className="pe-save" onClick={() => { saveMap(map); flash("Salvo."); }}>
              <Save size={12} />Salvar
            </button>
          </aside>
        )}

        {/* ── editor da bolha ── */}
        {bubble && (
          <aside className="pe-edit">
            <div className="pe-edit-hd">
              <input className="pe-title" value={bubble.name}
                onChange={(e) => patchBubble(bubble.id, { name: e.target.value })} />
              <button className="pe-ico" onClick={() => setSelBubble(null)}><X size={13} /></button>
            </div>

            {/* Retrato da bolha: o que ela contém e o alcance dela. */}
            {(() => {
              const bi = bubbleInfo(map, bubble.id);
              if (!bi) return null;
              return (
                <>
                  <div className="pe-info">
                    <div><b>{bi.nodes.length}</b><span>órbitas</span></div>
                    <div><b>{bi.edges}</b><span>ligações</span></div>
                    <div><b>{bi.triggers}</b><span>satélites</span></div>
                    <div><b>{bi.ttlMedio}</b><span>ttl médio</span></div>
                  </div>

                  <div className="pe-info-line">
                    <span>Estado</span>
                    <b style={{ color: bubble.sealed ? "#16a34a" : "#2563eb" }}>
                      {bubble.sealed ? "lacrada" : "em edição"}
                    </b>
                  </div>
                  <div className="pe-info-line">
                    <span>Reações</span><b>{bi.reactions}</b>
                  </div>
                  <div className="pe-info-line">
                    <span>Composição</span>
                    <b>{Object.entries(bi.kinds).map(([k, n]) => `${n} ${KIND_META[k as OrbitKind].label.toLowerCase()}`).join(", ") || "vazia"}</b>
                  </div>

                  {bi.actions.length > 0 && (
                    <>
                      <Lbl k="reacoes">Ações que dispara</Lbl>
                      <div className="pe-bubble-actions">
                        {bi.actions.map((a) => <code key={a}>{a}</code>)}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            <Lbl k="bolha">Resumo</Lbl>
            <button className="pe-field" onClick={() => setTextWin("summary")}>
              <span className="pe-field-txt">{bubble.summary || "sem resumo — escreva para se orientar no zoom"}</span>
              <Maximize2 size={11} />
            </button>

            <Lbl k="satelite">Palavras que mantêm a bolha viva</Lbl>
            <button className="pe-field" onClick={() => setTextWin("keeps")}>
              <span className="pe-field-n">{bubble.keeps.filter(Boolean).length}</span>
              <span className="pe-field-txt">
                {bubble.keeps.filter(Boolean).slice(0, 3).join(" · ") || "nenhuma palavra"}
              </span>
              <Maximize2 size={11} />
            </button>

            <div className="pe-row">
              <input type="color" className="pe-color" value={bubble.color}
                onChange={(e) => patchBubble(bubble.id, { color: e.target.value })} />
              <span className="pe-hintline">Cor da bolha no mapa</span>
            </div>

            <button className={`pe-seal${bubble.sealed ? " on" : ""}`}
              onClick={() => patchBubble(bubble.id, { sealed: !bubble.sealed })}>
              {bubble.sealed ? <Lock size={12} /> : <LockOpen size={12} />}
              {bubble.sealed ? "Bolha lacrada · assunto fechado" : "Lacrar bolha"}
            </button>

            <Lbl k="ordem">Órbitas dentro</Lbl>
            <div className="pe-inside">
              {map.nodes.filter((n) => n.bubbleId === bubble.id)
                .sort((a, b) => a.order - b.order)
                .map((n) => (
                  <button key={n.id} className="pe-item" onClick={() => { setSel(n.id); setSelBubble(null); }}>
                    <span className="pe-ord">{n.order}</span>
                    <span className="pe-item-txt"><b>{n.label}</b></span>
                  </button>
                ))}
              {!map.nodes.some((n) => n.bubbleId === bubble.id) && (
                <p className="pe-empty small">Vazia. Escolha a bolha no editor de uma órbita.</p>
              )}
            </div>

            <button className="pe-ico danger wide"
              onClick={() => {
                commit({
                  ...map,
                  bubbles: map.bubbles.filter((b) => b.id !== bubble.id),
                  nodes: map.nodes.map((n) => n.bubbleId === bubble.id ? { ...n, bubbleId: undefined } : n),
                });
                setSelBubble(null);
              }}>
              <Trash2 size={12} />Excluir bolha
            </button>
          </aside>
        )}
      </div>

      {/* ── menu do botão direito ── */}
      {menu && (
        <div className="pe-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setSel(menu.id); setMenu(null); }}><Eye size={11} />Editar</button>
          <button onClick={() => { locateInstance(menu.id); setMenu(null); }}>
            <Locate size={11} />Localizar instância
          </button>
          <button onClick={() => {
            const n = map.nodes.find((x) => x.id === menu.id)!;
            const copy = makeNode({ ...n, id: undefined as never, label: n.label + " (cópia)", x: n.x + 24, y: n.y + 24 });
            commit({ ...map, nodes: [...map.nodes, copy] }); setMenu(null);
          }}><Copy size={11} />Duplicar</button>
          <button onClick={() => unlinkAll(menu.id)}><Unlink size={11} />Desligar tudo</button>
          <button className="danger" onClick={() => remove(menu.id)}><Trash2 size={11} />Excluir</button>
        </div>
      )}

      {/* ── menu do modo DEV ── */}
      {devMenu && (
        <div className="pe-devmenu" style={{ left: devMenu.x, top: devMenu.y }}>
          <div className="pe-devmenu-hd">
            <span className="pe-target-n">{devMenu.target.id}</span>
            {devMenu.target.label}
          </div>
          <button onClick={() => {
            const d = buildDossier([devMenu.target]);
            navigator.clipboard.writeText(d.full)
              .then(() => flash("Código-fonte copiado."))
              .catch(() => flash("Área de transferência negada."));
            setDevMenu(null);
          }}><Copy size={11} />Copiar código-fonte</button>

          <button onClick={() => {
            const d = buildDossier(locked);
            navigator.clipboard.writeText(d.full)
              .then(() => flash(`Dossiê de ${locked.length} alvo(s) copiado.`))
              .catch(() => flash("Área de transferência negada."));
            setDevMenu(null);
          }}><Copy size={11} />Copiar todos os travados</button>

          <div className="pe-devmenu-sep" />

          <button onClick={() => { setPasteFor(devMenu.target); setPasteCss(""); setDevMenu(null); }}>
            <Upload size={11} />Colar código novo
          </button>

          <button onClick={() => {
            setLocked((l) => l.filter((x) => x.id !== devMenu.target.id));
            setDevMenu(null);
          }}><Unlink size={11} />Destravar este</button>

          <button className="danger" onClick={() => { setDevMenu(null); }}>
            <Lock size={11} />Manter travado
          </button>
        </div>
      )}

      {/* ── janelas de texto ── */}
      {textWin === "triggers" && node && (
        <TextWindow
          title="Satélites"
          hint="Palavras que acordam esta órbita. Uma por linha."
          value={node.triggers}
          examples={["prototipo", "proto", "dev", "experimento", "aquele codigo"]}
          advice={[
            "Três letras já resolvem: escrevendo prot, o sistema encontra protótipos.",
            "Erro de digitação não atrapalha, o casamento é por prefixo.",
            "Evite palavra genérica: se já for satélite de outra órbita, vira divergência.",
          ]}
          onSave={(l) => patch(node.id, { triggers: l }, true)}
          onClose={() => setTextWin(null)}
        />
      )}

      {textWin === "questions" && node && (
        <TextWindow
          title="Mensagens do usuário"
          hint="Como a pessoa escreveria sobre este assunto."
          value={node.questions}
          examples={[
            "pra que serve esse botão?",
            "o que é isso aqui",
            "não entendi essa parte",
            "como funciona isso",
            "me explica esse negocio",
          ]}
          advice={[
            "Escreva torto, como as pessoas escrevem de verdade.",
            "Inclua abreviação e erro comum: é assim que a mensagem chega.",
            "Não precisa ser pergunta. Serve qualquer frase sobre o tema.",
          ]}
          onSave={(l) => patch(node.id, { questions: l }, true)}
          onClose={() => setTextWin(null)}
        />
      )}

      {textWin === "keeps" && bubble && (
        <TextWindow
          title="Palavras que mantêm a bolha viva"
          hint="Enquanto aparecerem, o assunto não expira."
          value={bubble.keeps}
          examples={["galeria", "pasta", "arquivo", "documento", "abrir", "mostrar"]}
          advice={[
            "São termos amplos do assunto, não gatilhos de ação.",
            "A bolha renova quando qualquer um deles aparece na conversa.",
            "Poucas e certeiras funcionam melhor que muitas e vagas.",
          ]}
          onSave={(l) => patchBubble(bubble.id, { keeps: l })}
          onClose={() => setTextWin(null)}
        />
      )}

      {textWin === "summary" && bubble && (
        <TextWindow
          title="Resumo da bolha"
          hint="Aparece grande quando o zoom afasta e os nós somem."
          value={bubble.summary ? [bubble.summary] : []}
          examples={[
            "Tudo que envolve abrir, fechar e navegar pela galeria de arquivos.",
            "Comandos de aparência: cor, tema, fonte e layout.",
          ]}
          advice={[
            "Escreva em uma frase o que a bolha cobre.",
            "É o que te orienta quando o mapa cresce e você se perde.",
          ]}
          onSave={(l) => patchBubble(bubble.id, { summary: l.join(" ") })}
          onClose={() => setTextWin(null)}
        />
      )}

      {/* ── adicionar elemento ── */}
      {addOpen && (
        <div className="pe-modal-back" onClick={() => setAddOpen(false)}>
          <div className="pe-modal big" onClick={(e) => e.stopPropagation()}>
            <h3><PackagePlus size={14} />Adicionar elemento</h3>
            <p className="pe-modal-lead">
              Cole tudo junto. O sistema separa HTML, CSS e JavaScript sozinho,
              e avisa do que vai colidir antes de inserir.
            </p>

            <input className="pe-title wide" placeholder="Nome do elemento"
              value={addLabel} onChange={(e) => setAddLabel(e.target.value)} />

            <textarea className="pe-ta tall" rows={12}
              placeholder={"<button class=\"meu-btn\">Clique</button>\n\n<style>\n.meu-btn { background: #7c3aed; }\n</style>\n\n<script>\ndocument.querySelector('.meu-btn').onclick = () => alert('oi');\n</script>"}
              value={addRaw}
              onChange={(e) => {
                setAddRaw(e.target.value);
                if (e.target.value.trim().length > 12) {
                  const p = parseBlock(e.target.value);
                  setParsed(p);
                  setClashes(findClashes(p));
                } else { setParsed(null); setClashes([]); }
              }} />

            {parsed && (
              <div className="pe-detect">
                {(["html", "css", "js"] as const).map((k) => (
                  <span key={k} className={parsed.found[k] ? "on" : ""}>
                    {parsed.found[k] ? <Check size={10} /> : <X size={10} />}
                    {k.toUpperCase()}
                  </span>
                ))}
              </div>
            )}

            {clashes.length > 0 && (
              <div className="pe-clashes">
                <b><AlertTriangle size={12} />{clashes.length} conflito(s) encontrado(s)</b>
                {clashes.slice(0, 6).map((c, i) => (
                  <div key={i} className={`pe-clash sev-${c.severity}`}>
                    <code>{c.term}</code>
                    <span>{c.detail}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pe-row">
              <label className="pe-lbl" style={{ margin: 0 }}>Onde inserir</label>
              <select className="pe-select" value={addPos} onChange={(e) => setAddPos(e.target.value as Position)}>
                <option value="before">Antes do alvo</option>
                <option value="after">Depois do alvo</option>
                <option value="inside">Dentro do alvo</option>
              </select>
            </div>

            {parsed?.found.js && (
              <label className="pe-check">
                <input type="checkbox" checked={addRun} onChange={(e) => setAddRun(e.target.checked)} />
                Executar o script agora
              </label>
            )}

            <div className="pe-modal-acts">
              <button className="pe-btn ghost" onClick={() => setAddOpen(false)}>Cancelar</button>
              <button className="pe-btn primary"
                disabled={!parsed || (!parsed.found.html && !parsed.found.css)}
                onClick={() => {
                  if (!parsed) return;
                  const anchor = locked[0]?.selector || "body";
                  const r = inject(parsed, anchor, addPos, addLabel || "Elemento", addRun);
                  flash(r.msg);
                  if (r.ok && r.hostId) {
                    setAddOpen(false);
                    setInjLog((v) => v + 1);
                    const h = makeDraggable(r.hostId, () => {
                      setDragging(null);
                      flash("Posição fixada. CSS e script marcados como do Dev PulsoEterno.");
                    });
                    setDragging({ finish: () => h.finish() });
                  }
                }}>
                <PackagePlus size={12} />Inserir e posicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── barra de posicionamento ── */}
      {dragging && (
        <div className="pe-dragbar">
          <b>Arraste até o lugar</b>
          <span>Botão direito no elemento, ou clique aqui, para finalizar</span>
          <button className="pe-btn primary" onClick={() => dragging.finish()}>
            <Check size={12} />Finalizar
          </button>
        </div>
      )}

      {/* ── colar CSS ── */}
      {pasteFor && (
        <div className="pe-modal-back" onClick={() => setPasteFor(null)}>
          <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Colar código novo</h3>
            <p className="pe-modal-lead">
              Alvo <b>{pasteFor.id}</b> · {pasteFor.label}
            </p>
            <p>
              Cole apenas as declarações de estilo. Seletor e chaves são opcionais —
              o sistema extrai o que está dentro. Markup e script são recusados por segurança.
            </p>
            <textarea className="pe-ta tall" rows={12}
              placeholder={"background: #7c3aed;\nborder-radius: 14px;\npadding: 10px 18px;"}
              value={pasteCss} onChange={(e) => setPasteCss(e.target.value)} />
            <div className="pe-modal-acts">
              <button className="pe-btn ghost" onClick={() => setPasteFor(null)}>Cancelar</button>
              <button className="pe-btn primary" onClick={() => {
                const r = applyCss(pasteFor.selector, pasteFor.label, pasteCss);
                flash(r.msg);
                if (r.ok) { setPasteFor(null); setDevLog((v) => v + 1); }
              }}><Save size={12} />Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── assistente ── */}
      {wizard && (
        <div className="pe-modal-back" onClick={() => setWizard(null)}>
          <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nova órbita</h3>
            {!wizard.kind ? (
              <>
                <p className="pe-modal-lead">Que tipo de coisa você quer vigiar?</p>
                <div className="pe-kinds big">
                  {(Object.keys(KIND_META) as OrbitKind[]).map((k) => (
                    <button key={k} className="pe-kind-card" style={{ ["--k" as string]: KIND_META[k].color }}
                      onClick={() => wizardType(k)}>
                      <b>{KIND_META[k].label}</b>
                      <span>{KIND_META[k].hint}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="pe-modal-lead">
                  Digite a palavra ou o nome. Tipo <b>{KIND_META[wizard.kind].label}</b>.
                </p>
                <input className="pe-title wide" autoFocus placeholder="uva"
                  value={wizard.label} onChange={(e) => wizardCheck(e.target.value)} />

                {wizard.warn.length > 0 && (
                  <div className="pe-warn">
                    <AlertTriangle size={13} />
                    <div>
                      <b>Essa palavra já é satélite</b>
                      <p>Ela orbita {wizard.warn.map((w) => `"${w.label}"`).join(" e ")}. Criando aqui, o sistema fica com duas possibilidades para o mesmo termo.</p>
                    </div>
                  </div>
                )}

                <div className="pe-modal-acts">
                  <button className="pe-btn ghost" onClick={() => setWizard(null)}>Cancelar</button>
                  {wizard.warn.length > 0 ? (
                    <>
                      <button className="pe-btn" onClick={() => wizardSave("guess")}>Deixar chutar</button>
                      <button className="pe-btn primary" onClick={() => wizardSave("ask")}>Gerar dúvida</button>
                    </>
                  ) : (
                    <button className="pe-btn primary" disabled={!wizard.label.trim()} onClick={() => wizardSave()}>
                      Criar e vigiar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── editor grande de mensagens ── */}
      {bigText && reaction && (
        <div className="pe-modal-back" onClick={() => setBigText(null)}>
          <div className="pe-modal big" onClick={(e) => e.stopPropagation()}>
            <h3>Variações de resposta</h3>
            <p className="pe-modal-lead">
              Uma por linha. O Bobby escolhe entre elas — a variação é o que evita
              parecer robô repetindo texto pronto.
            </p>
            <textarea className="pe-ta tall" maxLength={10000}
              value={reaction.messages.join("\n")}
              onChange={(e) => patch(bigText.nodeId, {
                reactions: map.nodes.find((n) => n.id === bigText.nodeId)!.reactions.map((x) =>
                  x.id === bigText.rid ? { ...x, messages: e.target.value.split("\n") } : x),
              })} />
            <div className="pe-modal-foot">
              <span>{reaction.messages.join("\n").length} / 10000</span>
              <button className="pe-btn primary" onClick={() => { saveMap(map); setBigText(null); flash("Salvo."); }}>
                <Save size={12} />Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── tutorial ── */}
      {helpEntry && (
        <div className="pe-modal-back" onClick={() => setHelp(null)}>
          <div className="pe-modal help" onClick={(e) => e.stopPropagation()}>
            <h3><Info size={14} />{helpEntry.title}</h3>
            {helpEntry.body.map((p, i) => <p key={i}>{p}</p>)}
            {helpEntry.example && (
              <>
                <span className="pe-ex-lbl">Exemplo</span>
                <pre className="pe-ex">{helpEntry.example}</pre>
              </>
            )}
            {helpEntry.tip && (
              <div className="pe-tip"><Info size={12} /><span>{helpEntry.tip}</span></div>
            )}
            <button className="pe-btn primary" onClick={() => setHelp(null)}>Entendi</button>
          </div>
        </div>
      )}

      {toast && <div className="pe-toast">{toast}</div>}
      {showRagConfig && (
        <RagConfigWindow 
          isOpen={showRagConfig} 
          onClose={() => setShowRagConfig(false)} 
        />
      )}
    </div>,
    document.body
  );
}
