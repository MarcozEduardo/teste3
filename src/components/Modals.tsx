import { useMemo, useState } from "react";
import {
  X, Star, Bot, Cpu, CloudOff, Plus, Trash2, Upload, KeyRound,
  CheckCircle2, AlertTriangle, Loader2, Download, FileCode2, Search,
  RefreshCw, Save,
} from "lucide-react";
import { useBobby, SKILL_META } from "../lib/store";
import * as RAG from "../lib/rag";
import { isPdf, testGeminiKey, transcribePdf, type KeyTest } from "../lib/skills";
import { testEmbedConfig } from "../lib/embedProvider";
import DocViewer from "./DocViewer";
import CommandTrainer from "./CommandTrainer";
import SentinelaPanel from "./SentinelaPanel";
import { googleSearch, loadWebSearch, saveWebSearch } from "../lib/webSearch";
import type { Lang } from "../lib/types";

/* ══ DISCLAIMER ══ */
function DisclaimerModal() {
  const { modal, setModal } = useBobby();
  return (
    <div className={`modal-overlay${modal === "disclaimer" ? " open" : ""}`} onClick={() => setModal(null)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <div className="modal-dot" /><div className="modal-dot" style={{ opacity: .3 }} />
          <span className="modal-title">Aviso</span>
          <button className="modal-close" onClick={() => setModal(null)}><X size={14} strokeWidth={2} /></button>
        </div>
        <div className="modal-body">
          <p>Bobby é uma IA. Pode cometer erros, gerar informações imprecisas ou desatualizadas.</p>
          <p>As respostas vêm da base de conhecimento por busca vetorial. Quando há fonte, ela é citada. Quando não há, ele diz que não sabe.</p>
          <p>Tudo roda no seu navegador: conversas, base e chaves ficam apenas em localStorage.</p>
        </div>
      </div>
    </div>
  );
}

/* ══ CONFIG (idioma) ══ */
function ConfigModal() {
  const { modal, setModal, lang, setLang, t } = useBobby();
  return (
    <div className={`modal-overlay${modal === "config" ? " open" : ""}`} onClick={() => setModal(null)}>
      <div className="modal-box" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <div className="modal-dot" /><span className="modal-title">{t("settings")}</span>
          <button className="modal-close" onClick={() => setModal(null)}><X size={14} strokeWidth={2} /></button>
        </div>
        <div className="modal-body">
          <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--navy)" }}>
            {t("language")}
          </label>
          <select className="modal-select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            <option value="pt">Português (BR)</option><option value="en">English</option>
            <option value="es">Español</option><option value="it">Italiano</option>
          </select>
        </div>
        <button className="modal-btn-close" onClick={() => setModal(null)}>{t("close")}</button>
      </div>
    </div>
  );
}

/* ══ RENDERLAB — provedores + skills ══ */
const PROVIDERS = [
  { id: "bobby", name: "Bobby Motor 1.0", desc: "Motor local · RAG + persona · sem custo de API", stars: 5, on: true, icon: <Bot size={17} strokeWidth={1.8} /> },
  { id: "gemini", name: "Gemini (visão)", desc: "Leitura de imagens — requer chave no botão API", stars: 4, on: true, icon: <Cpu size={17} strokeWidth={1.8} /> },
  { id: "cloud", name: "Gateway multi-provedor", desc: "Descoberta automática via servidor próprio — em breve", stars: 3, on: false, icon: <CloudOff size={17} strokeWidth={1.8} /> },
];

function RenderChatModal() {
  const { modal, setModal, skills, toggleSkill } = useBobby();
  const [provider, setProvider] = useState("bobby");
  const [temp, setTemp] = useState(42);
  const [ctx, setCtx] = useState(60);
  const st = RAG.stats();

  return (
    <div id="modalRenderChat" className={modal === "renderchat" ? "open" : ""} onClick={() => setModal(null)}>
      <div className="renderchat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="renderchat-bar">
          <span className="renderchat-bar-title">RenderLab — Skills & Motor</span>
          <button className="renderchat-close" onClick={() => setModal(null)}><X size={14} strokeWidth={2} /></button>
        </div>
        <div className="rc-body">
          <div>
            <div className="rc-section-title">Provedor</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PROVIDERS.map((p) => (
                <div key={p.id} className={`rc-provider${provider === p.id ? " active" : ""}`}
                  style={!p.on ? { opacity: .5, cursor: "not-allowed" } : undefined}
                  onClick={() => p.on && setProvider(p.id)}>
                  <div className="rc-provider-ico">{p.icon}</div>
                  <div>
                    <div className="rc-provider-name">{p.name}</div>
                    <div className="rc-provider-desc">{p.desc}</div>
                  </div>
                  <div className="rc-stars">
                    {Array.from({ length: p.stars }).map((_, i) => <Star key={i} size={10} fill="currentColor" strokeWidth={0} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="rc-section-title">
              Skills<span className="rc-kb">{st.docs} docs · {st.chunks} chunks · {st.dim}d</span>
            </div>
            <div className="rc-skills">
              {SKILL_META.map((sk) => (
                <div key={sk.id} className={`rc-skill${skills[sk.id] ? " on" : ""}`}>
                  <div className="rc-skill-txt">
                    <div className="rc-skill-name">{sk.name}</div>
                    <div className="rc-skill-desc">{sk.desc}</div>
                  </div>
                  <button className={`rc-toggle${skills[sk.id] ? " on" : ""}`} onClick={() => toggleSkill(sk.id)} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="rc-section-title">Parâmetros</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="rc-row">
                <label>Criatividade</label>
                <input type="range" min={0} max={100} value={temp} className="rc-slider" onChange={(e) => setTemp(+e.target.value)} />
                <span className="rc-value">{(temp / 100).toFixed(2)}</span>
              </div>
              <div className="rc-row">
                <label>Janela de ctx</label>
                <input type="range" min={10} max={100} value={ctx} className="rc-slider" onChange={(e) => setCtx(+e.target.value)} />
                <span className="rc-value">{(ctx * 1.28).toFixed(1)}k tok</span>
              </div>
            </div>
          </div>

          <div className="rc-note">
            As chaves nunca saem do navegador. A persona do Bobby — honesta, sem floreio — faz parte do motor e não é desativável.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ BASE DE CONHECIMENTO — injeção de conteúdo ══ */
function RagModal() {
  const { modal, setModal, bumpRag, ragVersion, embedCfg, setEmbedCfg } = useBobby();
  const [tab, setTab] = useState<"inject" | "commands" | "provider" | "json">("inject");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  /* provedor de embeddings */
  const [cfg, setCfg] = useState(embedCfg);
  const [probe, setProbe] = useState<{ ok: boolean; msg: string } | null>(null);
  const [indexing, setIndexing] = useState<{ done: number; total: number; failed: number } | null>(null);

  /* editor JSON */
  const [json, setJson] = useState("");
  const [jsonMode, setJsonMode] = useState<"replace" | "merge">("replace");

  const loadJson = () => { setJson(RAG.exportJsonText()); setMsg("JSON carregado da base atual."); };

  const applyJson = () => {
    try {
      const n = RAG.importJsonText(json, jsonMode);
      bumpRag();
      setMsg(`${n} documento(s) aplicado(s) via JSON. Índice remoto invalidado — reindexe se usar API.`);
    } catch (e) { setMsg((e as Error).message); }
  };

  const saveProvider = async () => {
    setEmbedCfg(cfg); setBusy(true); setProbe(null);
    const r = await testEmbedConfig(cfg);
    setProbe(r); setBusy(false);
  };

  const reindex = async () => {
    setBusy(true); setIndexing({ done: 0, total: 0, failed: 0 });
    const r = await RAG.buildRemoteIndex(cfg, (p) => setIndexing(p));
    setIndexing(r); setBusy(false); bumpRag();
    setMsg(r.total === 0
      ? "Provedor local ativo: não há índice remoto a construir."
      : `Índice remoto pronto: ${r.done} vetores, ${r.failed} falha(s).`);
  };

  const docs = useMemo(() => { void ragVersion; return RAG.listDocs(); }, [ragVersion]);
  const st = useMemo(() => { void ragVersion; return RAG.stats(); }, [ragVersion]);
  const preview = useMemo(() => (q.trim() ? RAG.retrieve(q, 4, 0.05) : []), [q, ragVersion]);

  const add = () => {
    if (!body.trim()) { setMsg("Cole algum conteúdo antes de indexar."); return; }
    setBusy(true);
    setTimeout(() => {
      try {
        const d = RAG.addDoc(title || "Documento", body, tags.split(",").map((x) => x.trim()).filter(Boolean));
        setTitle(""); setBody(""); setTags("");
        bumpRag();
        setMsg(`"${d.title}" vetorizado e indexado. Total: ${RAG.stats().chunks} chunks.`);
      } catch (e) {
        setMsg((e as Error).message);
      } finally {
        setBusy(false);
      }
    }, 420);
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let added = 0;
    const errors: string[] = [];
    for (const f of Array.from(files).slice(0, 8)) {
      try {
        const txt = isPdf(f.name) ? await transcribePdf(f) : await f.text();
        if (txt.trim()) {
          RAG.addDoc(f.name.replace(/\.[^.]+$/, ""), txt, [f.name.split(".").pop() || "arquivo"]);
          added++;
        }
      } catch (e) {
        errors.push(`${f.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false); bumpRag();
    setMsg(
      `${added} de ${Math.min(files.length, 8)} arquivo(s) indexado(s). Total: ${RAG.stats().chunks} chunks.` +
      (errors.length ? ` Falhas: ${errors.join("; ")}` : "")
    );
  };

  const exportBase = () => {
    const blob = new Blob([JSON.stringify(RAG.listDocs().filter((d) => d.origin === "user"), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "bobby-base.json"; a.click();
  };

  return (
    <div id="modalRenderChat" className={modal === "rag" ? "open" : ""} onClick={() => setModal(null)}>
      <div className="renderchat-modal" style={{ width: "min(880px,95vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="renderchat-bar">
          <span className="renderchat-bar-title">Base de Conhecimento — RAG & Embeddings</span>
          <button className="renderchat-close" onClick={() => setModal(null)}><X size={14} strokeWidth={2} /></button>
        </div>

        <div className="rc-body">
          <div className="rag-stats">
            <div className="rag-stat"><b>{st.docs}</b><span>documentos</span></div>
            <div className="rag-stat"><b>{st.chunks}</b><span>chunks</span></div>
            <div className="rag-stat"><b>{st.userDocs}</b><span>seus docs</span></div>
            <div className="rag-stat"><b style={{ fontSize: 13 }}>{st.provider}</b><span>provedor</span></div>
          </div>

          <div className="rag-tabs">
            {([["inject", "Injetar"], ["commands", "Comandos"], ["provider", "Provedor & API"], ["json", "JSON da base"]] as const).map(([k, l]) => (
              <button key={k} className={`rag-tab${tab === k ? " active" : ""}`}
                onClick={() => { setTab(k); if (k === "json" && !json) loadJson(); }}>{l}</button>
            ))}
          </div>

          {tab === "commands" && <CommandTrainer />}

          {/* ── PROVEDOR ── */}
          {tab === "provider" && (
            <div className="rag-pane">
              <div className="rc-section-title">Motor de embeddings</div>
              <div className="rag-prov-grid">
                {(["local", "gemini", "openai", "custom"] as const).map((p) => (
                  <button key={p} className={`rag-prov${cfg.provider === p ? " active" : ""}`}
                    onClick={() => setCfg({
                      ...cfg, provider: p,
                      model: p === "gemini" ? "text-embedding-004"
                        : p === "openai" ? "text-embedding-3-small" : cfg.model,
                    })}>
                    <b>{p === "local" ? "Local" : p === "custom" ? "Endpoint próprio" : p}</b>
                    <span>
                      {p === "local" ? "512d · offline · sem custo"
                        : p === "gemini" ? "text-embedding-004"
                        : p === "openai" ? "text-embedding-3-*"
                        : "seu servidor / gateway"}
                    </span>
                  </button>
                ))}
              </div>

              {cfg.provider !== "local" && (
                <>
                  <label className="rag-label">Modelo</label>
                  <input className="rag-input" value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} />
                  {cfg.provider === "custom" && (
                    <>
                      <label className="rag-label">Endpoint (POST · recebe {"{input, model}"} · devolve {"{embedding:[]}"})</label>
                      <input className="rag-input" placeholder="https://seu-gateway/embeddings"
                        value={cfg.endpoint} onChange={(e) => setCfg({ ...cfg, endpoint: e.target.value })} />
                    </>
                  )}
                  <label className="rag-label">Chave de API</label>
                  <input className="rag-input" type="password" placeholder="cole a chave"
                    value={cfg.apiKey} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} />
                  <label className="rag-check">
                    <input type="checkbox" checked={cfg.fallbackLocal}
                      onChange={(e) => setCfg({ ...cfg, fallbackLocal: e.target.checked })} />
                    Cair no motor local se a API falhar (recomendado)
                  </label>
                </>
              )}

              <div className="rag-acts">
                <button className="rag-btn primary" onClick={saveProvider} disabled={busy}>
                  {busy ? <Loader2 size={12} className="spin" /> : <CheckCircle2 size={12} strokeWidth={2} />}
                  Salvar e testar
                </button>
                <button className="rag-btn" onClick={reindex} disabled={busy || cfg.provider === "local"}>
                  <RefreshCw size={12} strokeWidth={2} />Reindexar base
                </button>
              </div>

              {probe && (
                <div className={`key-res ${probe.ok ? "ok" : "err"}`}>
                  {probe.ok ? <CheckCircle2 size={13} strokeWidth={2} /> : <AlertTriangle size={13} strokeWidth={2} />}
                  <div>{probe.msg}</div>
                </div>
              )}
              {indexing && indexing.total > 0 && (
                <div className="rag-progress">
                  <div className="rag-progress-bar" style={{ width: `${(indexing.done / indexing.total) * 100}%` }} />
                  <span>{indexing.done}/{indexing.total} vetores · {indexing.failed} falha(s)</span>
                </div>
              )}
              <div className="rc-note">
                A chave fica apenas neste navegador. O índice remoto vive em memória: ao recarregar,
                reindexe ou continue no motor local, que responde na hora.
              </div>
            </div>
          )}

          {/* ── JSON ── */}
          {tab === "json" && (
            <div className="rag-pane">
              <div className="rc-section-title">
                JSON da base
                <span className="rc-kb">seu backup e sua camada de proteção</span>
              </div>
              <textarea className="rag-textarea" rows={14} spellCheck={false}
                value={json} onChange={(e) => setJson(e.target.value)}
                placeholder='{ "version": 1, "docs": [ { "title": "Case X", "tags": ["projeto"], "body": "..." } ] }' />
              <div className="rag-acts">
                <button className="rag-btn" onClick={loadJson}><RefreshCw size={12} strokeWidth={2} />Recarregar</button>
                <button className="rag-btn primary" onClick={applyJson}><Save size={12} strokeWidth={2} />Aplicar JSON</button>
                <button className="rag-btn" onClick={exportBase}><Download size={12} strokeWidth={2} />Baixar arquivo</button>
                <label className="rag-check" style={{ marginLeft: "auto" }}>
                  <input type="checkbox" checked={jsonMode === "merge"}
                    onChange={(e) => setJsonMode(e.target.checked ? "merge" : "replace")} />
                  mesclar em vez de substituir
                </label>
              </div>
              <div className="rc-note">
                Campos aceitos por documento: <code>title</code>, <code>tags</code>, <code>body</code> e
                opcionalmente <code>id</code>. Só <code>body</code> é obrigatório. A validação recusa o lote
                inteiro se algo estiver fora do formato, então a base nunca fica pela metade.
              </div>
            </div>
          )}

          {tab === "inject" && (
          <div className="rag-pane">
            <div className="rc-section-title">Injetar conteúdo</div>
            <input className="rag-input" placeholder="Título — ex: Case: Sistema de Orquestração X"
              value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="rag-input" placeholder="Tags separadas por vírgula (opcional)"
              value={tags} onChange={(e) => setTags(e.target.value)} />
            <textarea className="rag-textarea" rows={7}
              placeholder="Cole aqui o README, o case, a descrição do projeto, sua bio... O sistema quebra em chunks com overlap, vetoriza e indexa automaticamente."
              value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="rag-acts">
              <button className="rag-btn primary" onClick={add} disabled={busy}>
                {busy ? <Loader2 size={12} className="spin" /> : <Plus size={12} strokeWidth={2.5} />}
                Vetorizar e indexar
              </button>
              <label className="rag-btn">
                <Upload size={12} strokeWidth={2} />Subir arquivos
                <input type="file" multiple accept=".txt,.md,.json,.js,.ts,.py,.html,.css,.java,.sql,.pdf" style={{ display: "none" }}
                  onChange={(e) => upload(e.target.files)} />
              </label>
              <button className="rag-btn" onClick={exportBase}><Download size={12} strokeWidth={2} />Exportar</button>
            </div>
            {msg && <div className="rag-msg"><CheckCircle2 size={12} strokeWidth={2} />{msg}</div>}

            <div className="rc-section-title" style={{ marginTop: 18 }}>Testar recuperação</div>
            <div className="search-wrap" style={{ marginBottom: 8 }}>
              <Search size={13} strokeWidth={2} />
              <input placeholder="Digite uma pergunta e veja o que o retrieval devolve..."
                value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {q && preview.length === 0 && <div className="rag-empty">Nenhum chunk acima do limiar. O Bobby diria que não sabe.</div>}
            {preview.map((p, i) => (
              <div key={i} className="rag-hit">
                <div className="rag-hit-hd">
                  <b>{p.title}</b>
                  <span className="rag-score" style={{ opacity: 0.4 + p.score }}>{(p.score * 100).toFixed(1)}%</span>
                </div>
                <div className="rag-hit-txt">{p.text.slice(0, 260)}…</div>
              </div>
            ))}

            <div className="rc-section-title" style={{ marginTop: 18 }}>Documentos indexados</div>
            <div className="rag-docs">
              {docs.map((d) => (
                <div key={d.id} className="rag-doc">
                  <FileCode2 size={13} strokeWidth={2} style={{ color: d.origin === "core" ? "var(--gold)" : "#60a5fa" }} />
                  <div className="rag-doc-txt">
                    <div className="rag-doc-name">{d.title}</div>
                    <div className="rag-doc-tags">{d.tags.slice(0, 5).join(" · ") || "sem tags"}</div>
                  </div>
                  <span className={`rag-origin ${d.origin}`}>{d.origin === "core" ? "núcleo" : "seu"}</span>
                  {d.origin === "user" && (
                    <button className="rag-del" onClick={() => {
                      try { RAG.removeDoc(d.id); bumpRag(); setMsg(`"${d.title}" removido da base.`); }
                      catch (e) { setMsg((e as Error).message); }
                    }}>
                      <Trash2 size={11} strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="rc-note">
              Pipeline: chunking com overlap → vetorização → cosseno + MMR. O provedor de vetores
              é trocável na aba <b>Provedor & API</b>, sem alterar o restante do fluxo.
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ API KEY ══ */
function ApiKeyModal() {
  const { modal, setModal, apiKey, setApiKey, visionUsed } = useBobby();
  const [val, setVal] = useState(apiKey);
  const [res, setRes] = useState<KeyTest | null>(null);
  const [busy, setBusy] = useState(false);
  const [web, setWeb] = useState(loadWebSearch);
  const [webMsg, setWebMsg] = useState("");

  const run = async () => {
    setBusy(true); setRes(null);
    const r = await testGeminiKey(val);
    setRes(r); setBusy(false);
    if (r.ok) setApiKey(val.trim());
  };

  const testSearch = async () => {
    setBusy(true); setWebMsg("");
    const cfg = { ...web, apiKey: web.apiKey || val.trim() };
    try {
      const results = await googleSearch("Render Nexus", cfg);
      saveWebSearch(cfg); setWeb(cfg);
      setWebMsg(`Busca conectada — ${results.length} resultado(s) recebidos.`);
    } catch (e) { setWebMsg((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className={`modal-overlay${modal === "apikey" ? " open" : ""}`} onClick={() => setModal(null)}>
      <div className="modal-box" style={{ maxWidth: 480, maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-bar">
          <div className="modal-dot" />
          <span className="modal-title">Teste de API Key · Gemini</span>
          <button className="modal-close" onClick={() => setModal(null)}><X size={14} strokeWidth={2} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12.5 }}>
            Cole a chave do Google AI Studio. Ela fica só no <code>localStorage</code> deste navegador
            e é usada pela skill de <b>visão</b> para ler imagens enviadas no chat.
          </p>
          <div className="key-row">
            <KeyRound size={14} strokeWidth={2} style={{ color: "var(--gold)", flexShrink: 0 }} />
            <input className="key-input" type="password" placeholder="AIza..." value={val} onChange={(e) => setVal(e.target.value)} />
          </div>
          <div className="rag-acts" style={{ marginTop: 10 }}>
            <button className="rag-btn primary" onClick={run} disabled={busy}>
              {busy ? <Loader2 size={12} className="spin" /> : <CheckCircle2 size={12} strokeWidth={2} />}
              Testar chave
            </button>
            {apiKey && (
              <button className="rag-btn" onClick={() => { setApiKey(""); setVal(""); setRes(null); }}>
                <Trash2 size={12} strokeWidth={2} />Remover
              </button>
            )}
          </div>

          {res && (
            <div className={`key-res ${res.ok ? "ok" : "err"}`}>
              {res.ok ? <CheckCircle2 size={13} strokeWidth={2} /> : <AlertTriangle size={13} strokeWidth={2} />}
              <div>
                <div style={{ fontWeight: 600 }}>{res.msg}</div>
                {res.models && <div className="key-models">{res.models.join(" · ")}</div>}
              </div>
            </div>
          )}

          <div className="key-info">
            Visão usada nesta sessão: <b>{visionUsed}</b> de 3 · limite para não abusar da cota.
          </div>

          <div className="key-divider" />
          <div className="rc-section-title">Google Programmable Search</div>
          <p style={{ fontSize: 11.5 }}>
            Para busca geral, ative a Custom Search JSON API no Google Cloud e informe o
            Search Engine ID (CX). A mesma chave pode funcionar se tiver essa API liberada.
          </p>
          <div className="key-row">
            <KeyRound size={14} strokeWidth={2} style={{ color: "var(--gold)", flexShrink: 0 }} />
            <input className="key-input" type="password" placeholder="Chave Google (vazio = usar a de cima)"
              value={web.apiKey} onChange={(e) => setWeb({ ...web, apiKey: e.target.value })} />
          </div>
          <div className="key-row" style={{ marginTop: 7 }}>
            <Search size={14} strokeWidth={2} style={{ color: "var(--gold)", flexShrink: 0 }} />
            <input className="key-input" placeholder="Search Engine ID (CX)"
              value={web.cx} onChange={(e) => setWeb({ ...web, cx: e.target.value })} />
          </div>
          <div className="rag-acts" style={{ marginTop: 9 }}>
            <button className="rag-btn primary" onClick={testSearch} disabled={busy || !web.cx}>
              {busy ? <Loader2 size={12} className="spin" /> : <Search size={12} strokeWidth={2} />}
              Salvar e testar busca
            </button>
          </div>
          {webMsg && <div className="key-info" style={{ color: webMsg.startsWith("Busca") ? "var(--green)" : "var(--stop-bg)" }}>{webMsg}</div>}
        </div>
        <button className="modal-btn-close" onClick={() => setModal(null)}>Fechar</button>
      </div>
    </div>
  );
}

export default function Modals() {
  return (
    <>
      <DisclaimerModal /><ConfigModal /><RenderChatModal />
      <RagModal /><ApiKeyModal /><DocViewer /><SentinelaPanel />
    </>
  );
}
