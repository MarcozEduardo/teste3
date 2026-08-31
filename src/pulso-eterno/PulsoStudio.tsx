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
import * as RAG from "../lib/rag";
import { QAPair } from "../lib/rag";

const HOST_ACTIONS = [
  "abrir.galeria", "abrir.historico", "abrir.base", "abrir.skills", "abrir.sentinela",
  "fechar.atual", "chat.novo", "chat.limpar", "cor.trocar", "cor.reverter",
  "view.expandir", "view.encolher", "cronometro.zerar", "curtir.mensagem", "card.identidade",
];

/** R\u00f3tulo com tutorial: duplo clique abre a explica\u00e7\u00e3o. */
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
  const [tab, setTab] = useState<"grafo" | "bolhas" | "conflitos" | "docs" | "qa" | "dev" | "alvo">("grafo");
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

  /* inje\u00e7\u00e3o de elemento */
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
      flash(`Agente respondeu: ${r.elements} elementos em ${r.title || "p\u00e1gina"}.`);
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
      ).then(() => flash("Dossi\u00ea do alvo copiado."));
    }
    if (r.type === "pulso:ok") flash(r.detail || "Feito no alvo.");
    if (r.type === "pulso:error") flash(r.message);
  }), []);
  const [docKind, setDocKind] = useState<DocKind>("curriculo");
  const [docLayout, setDocLayout] = useState<DocLayout | "">("");
  const [docPal, setDocPal] = useState("");
  const [docRaw, setDocRaw] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  // S\u00f3 uma categoria aberta por vez: menos ru\u00eddo na leitura.
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

  /* Q&A Management */
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [qaCategory, setQaCategory] = useState<string>("geral");
  const [qaQuestion, setQaQuestion] = useState<string>("");
  const [qaAnswer, setQaAnswer] = useState<string>("");
  const [qaCategories, setQaCategories] = useState<string[]>(["geral"]);
  const [editingQaId, setEditingQaId] = useState<string | null>(null);

  const hist = useRef(new History());
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const nodeDrag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);

  /* Carrega Q&A pairs no mount */
  useEffect(() => {
    setQaPairs(RAG.listQAPairs());
    const cats = new Set(["geral", ...RAG.listQAPairs().map(q => q.category)]);
    setQaCategories(Array.from(cats));
  }, []);

  /* Fun\u00e7\u00f5es de Q&A */
  const loadQAPairs = useCallback(() => {
    const pairs = RAG.listQAPairs();
    setQaPairs(pairs);
    const cats = new Set(["geral", ...pairs.map(q => q.category)]);
    setQaCategories(Array.from(cats));
  }, []);

  const addNewQAPair = useCallback(() => {
    if (!qaQuestion.trim() || !qaAnswer.trim()) {
      flash("Pergunta e resposta n\u00e3o podem estar vazias");
      return;
    }
    try {
      RAG.addQAPair(qaQuestion, qaAnswer, qaCategory);
      loadQAPairs();
      setQaQuestion("");
      setQaAnswer("");
      flash("Par Q&A adicionado!");
    } catch (e) {
      flash((e as Error).message);
    }
  }, [qaQuestion, qaAnswer, qaCategory, loadQAPairs]);

  const removeQAPair = useCallback((id: string) => {
    try {
      RAG.removeQAPair(id);
      loadQAPairs();
      flash("Par Q&A removido");
    } catch (e) {
      flash((e as Error).message);
    }
  }, [loadQAPairs]);

  const editQAPair = useCallback((pair: QAPair) => {
    setEditingQaId(pair.id);
    setQaCategory(pair.category);
    setQaQuestion(pair.question);
    setQaAnswer(pair.answer);
  }, []);

  const saveQAPair = useCallback(() => {
    if (!editingQaId || !qaQuestion.trim() || !qaAnswer.trim()) return;
    try {
      RAG.updateQAPair(editingQaId, {
        question: qaQuestion,
        answer: qaAnswer,
        category: qaCategory,
      });
      loadQAPairs();
      setEditingQaId(null);
      setQaQuestion("");
      setQaAnswer("");
      flash("Par Q&A atualizado!");
    } catch (e) {
      flash((e as Error).message);
    }
  }, [editingQaId, qaQuestion, qaAnswer, qaCategory, loadQAPairs]);

  const cancelEditQA = useCallback(() => {
    setEditingQaId(null);
    setQaQuestion("");
    setQaAnswer("");
  }, []);

  const addNewCategory = useCallback((name: string) => {
    if (name.trim() && !qaCategories.includes(name)) {
      setQaCategories([...qaCategories, name.trim()]);
      setQaCategory(name.trim());
    }
  }, [qaCategories]);

  const node = map.nodes.find((n) => n.id === sel) || null;
  const bubble = map.bubbles.find((b) => b.id === selBubble) || null;
  const stats = useMemo(() => mapStats(map), [map]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const commit = useCallback((next: PulsoMap, record = true) => {
    if (record) hist.current.push(map);
    // A bolha \u00e9 consequ\u00eancia das liga\u00e7\u00f5es: sincroniza a cada mudan\u00e7a.
    const agrupado = syncBubbles(next);
    const final = { ...agrupado, conflicts: detectConflicts(agrupado) };
    setMap(final);
    saveMap(final);
  }, [map]);

  const patch = (id: string, data: Partial<OrbitNode>, record = false) =>
    commit({ ...map, nodes: map.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)) }, record);

  /* atalhos e ajuda */
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

  /* arrastar janela, n\u00f3 e tela */
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
        const x = Math.max(10, (e.clientX - r.left - pan.x) / zoom - nodeDrag.current.dx);
        const y = Math.max(10, (e.clientY - r.top - pan.y) / zoom - nodeDrag.current.dy);
        patch(nodeDrag.current.id, { x, y });
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
    // Mant\u00e9m o ponto sob o cursor ancorado durante a escala.
    setPan({
      x: mx - (mx - pan.x) * (next / zoom),
      y: my - (my - pan.y) * (next / zoom),
    });
    setZoom(next);
  };

  /** Abre o alvo no quadro e descobre o n\u00edvel de acesso. */
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
        flash(t.mode === "same-origin" ? "Alvo aberto com acesso total." : "Alvo aberto. Verificando o agente\u2026");
      };
    }, 30);
  };

  /* varreduras */
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
    if (dup.length) { flash(`"${item.label}" j\u00e1 \u00e9 \u00f3rbita.`); setSel(dup[0].id); setTab("grafo"); return; }
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
    flash(`${novos.length} \u00f3rbitas criadas de uma vez.`);
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
    flash(`${f.length} a\u00e7\u00f5es em ${files[0].name}.`);
  };

  const addFromFound = (f: Found) => {
    const n = makeNode({
      label: f.label, kind: f.kind, selector: f.selector,
      triggers: f.suggested, source: "scan", order: map.nodes.length,
    });
    commit({ ...map, nodes: [...map.nodes, n] });
    setSel(n.id); setTab("grafo");
  };

  /* assistente de nova \u00f3rbita */
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
    flash(policy === "ask" ? "Criada. O Bobby vai perguntar quando houver d\u00favida."
      : policy === "guess" ? "Criada. O sistema decide sozinho."
      : "\u00d3rbita criada.");
  };

  /**
   * Encolhe o Studio, pisca o elemento tr\u00eas vezes na tela e
   * devolve a janela ao estado anterior com um clique.
   */
  const locateInstance = (nodeId: string) => {
    const n = map.nodes.find((x) => x.id === nodeId);
    if (!n?.selector) { flash("Essa \u00f3rbita n\u00e3o aponta para um elemento da tela."); return; }
    const el = document.querySelector(n.selector);
    if (!el) { flash("O elemento n\u00e3o est\u00e1 na tela agora."); return; }

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

    // Some sozinho depois das tr\u00eas piscadas, se ningu\u00e9m clicar.
    setTimeout(() => {
      if (document.body.contains(halo)) {
        halo.remove(); back.remove();
        document.body.classList.remove("pe-locating");
      }
    }, 7000);
  };

  /* grafo */
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
    flash("Liga\u00e7\u00e3o cortada.");
  };

  const unlinkAll = (id: string) => {
    commit({ ...map, edges: map.edges.filter((e) => e.from !== id && e.to !== id) });
    setMenu(null); flash("Liga\u00e7\u00f5es removidas.");
  };

  /* bolhas */
  const newBubble = () => {
    setBubbles([...map.bubbles, { id: uid(), label: "Nova Bolha", nodes: [] }]);
    flash("Nova bolha criada.");
  };

  return (
    <div className="pe-studio">
      {/* Render do Studio */}
    </div>
  );
}