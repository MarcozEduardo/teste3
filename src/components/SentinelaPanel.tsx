import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, ShieldCheck, ScrollText, SlidersHorizontal, Database, Trash2,
  Download, CheckCircle2, AlertTriangle, Ban, Eye, Globe, FileCode2,
  Activity, Lock, ServerCog,
} from "lucide-react";
import {
  entries, stats, clearLog, exportLog, subscribe,
  loadConfig, saveConfig, DEFAULT_CONFIG, type SentinelaConfig, type LogEntry,
} from "../lib/sentinelaLog";
import { useBobby } from "../lib/store";
import badge from "../../public/sentinela.png";

type Tab = "posto" | "regras" | "registro" | "cofre";

const KIND_META: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  pass: { label: "Liberado", icon: CheckCircle2, color: "#10b981" },
  block: { label: "Barrado", icon: Ban, color: "#e11d48" },
  hold: { label: "Retido", icon: Lock, color: "#d4a017" },
  release: { label: "Autorizado", icon: ShieldCheck, color: "#10b981" },
  deny: { label: "Negado", icon: Ban, color: "#7f1d1d" },
  vision: { label: "Visão", icon: Eye, color: "#8b5cf6" },
  web: { label: "Web", icon: Globe, color: "#06b6d4" },
  config: { label: "Ajuste", icon: SlidersHorizontal, color: "#64748b" },
};

const RULE_INFO: Record<string, string> = {
  impróprio: "Ofensa, palavrão e conteúdo tóxico na entrada.",
  injection: "Tentativa de reescrever as instruções do sistema.",
  ruído: "Texto sem conteúdo semântico, teclado amassado.",
  arrogância: "Hostilidade dirigida ao assistente.",
  flood: "Mesma mensagem repetida em sequência.",
  código: "Todo algoritmo colado passa pela quarentena.",
};

export default function SentinelaPanel() {
  const { modal, setModal } = useBobby();
  const [tab, setTab] = useState<Tab>("posto");
  const [cfg, setCfg] = useState<SentinelaConfig>(loadConfig);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<string>("todos");

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  const s = useMemo(() => { void tick; return stats(); }, [tick]);
  const list = useMemo(() => {
    void tick;
    const all = entries();
    return filter === "todos" ? all : all.filter((e) => e.kind === filter);
  }, [tick, filter]);

  if (modal !== "sentinela") return null;

  const persist = (next: SentinelaConfig) => {
    setCfg(next);
    setMsg(saveConfig(next) ? "Configuração salva." : "Não foi possível salvar.");
    setTimeout(() => setMsg(""), 2200);
  };

  const download = () => {
    const blob = new Blob([exportLog()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sentinela-registro-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const when = (ts: number) => {
    const d = Date.now() - ts;
    if (d < 60_000) return "agora";
    if (d < 3_600_000) return `${Math.round(d / 60_000)} min`;
    if (d < 86_400_000) return `${Math.round(d / 3_600_000)} h`;
    return new Date(ts).toLocaleDateString("pt-BR");
  };

  return createPortal(
    <div className="stl-back" onClick={() => setModal(null)}>
      <div className="stl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* cabeçalho */}
        <header className="stl-hd">
          <img className="stl-badge" src={badge} alt="" />
          <div className="stl-hd-txt">
            <span className="stl-org">Guarda Perimetral</span>
            <h2>Posto do Sentinela</h2>
          </div>
          <div className="stl-live">
            <span className="stl-dot" />
            {cfg.rules.impróprio || cfg.rules.injection ? "em vigília" : "vigília reduzida"}
          </div>
          <button className="stl-x" onClick={() => setModal(null)}><X size={16} strokeWidth={2} /></button>
        </header>

        <nav className="stl-tabs">
          {([
            ["posto", "Posto", Activity],
            ["regras", "Regras", SlidersHorizontal],
            ["registro", "Registro", ScrollText],
            ["cofre", "Cofre", Database],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} className={`stl-tab${tab === k ? " active" : ""}`} onClick={() => setTab(k)}>
              <Icon size={13} strokeWidth={2} />{label}
            </button>
          ))}
        </nav>

        <div className="stl-body">
          {/* ── POSTO ── */}
          {tab === "posto" && (
            <div className="stl-pane">
              <div className="stl-kpis">
                <div className="stl-kpi"><b>{s.total}</b><span>eventos</span></div>
                <div className="stl-kpi danger"><b>{s.block}</b><span>barrados</span></div>
                <div className="stl-kpi warn"><b>{s.hold}</b><span>retidos</span></div>
                <div className="stl-kpi ok"><b>{s.pass}</b><span>liberados</span></div>
              </div>

              <div className="stl-section">Movimento nas últimas 24h</div>
              <div className="stl-bar-wrap">
                <div className="stl-bar" style={{ width: `${Math.min(100, s.last24h * 4)}%` }} />
                <span>{s.last24h} evento(s)</span>
              </div>

              <div className="stl-section">Ameaças mais frequentes</div>
              {Object.keys(s.byReason).length === 0 ? (
                <p className="stl-empty">Nenhuma retenção até agora. O perímetro está calmo.</p>
              ) : (
                Object.entries(s.byReason).sort((a, b) => b[1] - a[1]).map(([reason, n]) => (
                  <div key={reason} className="stl-reason">
                    <span>{reason}</span>
                    <div className="stl-reason-bar">
                      <div style={{ width: `${(n / Math.max(...Object.values(s.byReason))) * 100}%` }} />
                    </div>
                    <b>{n}</b>
                  </div>
                ))
              )}

              <div className="stl-section">Perímetro externo</div>
              <div className="stl-mini-grid">
                <div className="stl-mini"><Eye size={13} /><b>{s.vision}</b><span>leituras de imagem</span></div>
                <div className="stl-mini"><Globe size={13} /><b>{s.web}</b><span>páginas lidas</span></div>
                <div className="stl-mini"><FileCode2 size={13} /><b>{s.release}</b><span>códigos liberados</span></div>
                <div className="stl-mini"><Ban size={13} /><b>{s.deny}</b><span>lacrados</span></div>
              </div>
            </div>
          )}

          {/* ── REGRAS ── */}
          {tab === "regras" && (
            <div className="stl-pane">
              <div className="stl-section">Classes de ameaça</div>
              {Object.entries(cfg.rules).map(([rule, on]) => (
                <div key={rule} className={`stl-rule${on ? " on" : ""}`}>
                  <div>
                    <b>{rule}</b>
                    <span>{RULE_INFO[rule]}</span>
                  </div>
                  <button
                    className={`rc-toggle${on ? " on" : ""}`}
                    onClick={() => persist({ ...cfg, rules: { ...cfg.rules, [rule]: !on } })}
                  />
                </div>
              ))}

              <div className="stl-section">Calibragem</div>
              <div className="rc-row">
                <label>Sensibilidade a ruído</label>
                <input
                  type="range" min={5} max={40} value={cfg.noiseThreshold} className="rc-slider"
                  onChange={(e) => persist({ ...cfg, noiseThreshold: +e.target.value })}
                />
                <span className="rc-value">{cfg.noiseThreshold}%</span>
              </div>
              <div className="rc-row">
                <label>Repetições até barrar</label>
                <input
                  type="range" min={2} max={8} value={cfg.floodLimit} className="rc-slider"
                  onChange={(e) => persist({ ...cfg, floodLimit: +e.target.value })}
                />
                <span className="rc-value">{cfg.floodLimit}x</span>
              </div>

              <div className="stl-switch-row">
                <label className="rag-check">
                  <input type="checkbox" checked={cfg.logEverything}
                    onChange={(e) => persist({ ...cfg, logEverything: e.target.checked })} />
                  Registrar também o que passa
                </label>
                <label className="rag-check">
                  <input type="checkbox" checked={cfg.holdAllCode}
                    onChange={(e) => persist({ ...cfg, holdAllCode: e.target.checked })} />
                  Reter todo código, mesmo sem risco aparente
                </label>
              </div>

              <div className="stl-section">Listas do perímetro</div>
              <label className="rag-label">Termos bloqueados</label>
              <textarea
                className="rag-textarea" rows={3}
                placeholder="Um termo por linha. Qualquer mensagem que contenha é barrada."
                value={cfg.customBlocked.join("\n")}
                onChange={(e) => setCfg({ ...cfg, customBlocked: e.target.value.split("\n") })}
                onBlur={() => persist({ ...cfg, customBlocked: cfg.customBlocked.filter(Boolean) })}
              />
              <label className="rag-label">Termos sempre permitidos</label>
              <textarea
                className="rag-textarea" rows={3}
                placeholder="Um termo por linha. Tem prioridade sobre qualquer bloqueio."
                value={cfg.allowlist.join("\n")}
                onChange={(e) => setCfg({ ...cfg, allowlist: e.target.value.split("\n") })}
                onBlur={() => persist({ ...cfg, allowlist: cfg.allowlist.filter(Boolean) })}
              />

              <div className="rag-acts">
                <button className="rag-btn" onClick={() => persist({ ...DEFAULT_CONFIG })}>
                  Restaurar padrão
                </button>
              </div>
            </div>
          )}

          {/* ── REGISTRO ── */}
          {tab === "registro" && (
            <div className="stl-pane">
              <div className="stl-filters">
                {["todos", "block", "hold", "release", "deny", "vision", "web", "pass"].map((k) => (
                  <button key={k} className={`stl-chip${filter === k ? " on" : ""}`} onClick={() => setFilter(k)}>
                    {k === "todos" ? "Tudo" : KIND_META[k]?.label || k}
                  </button>
                ))}
              </div>

              <div className="stl-log">
                {list.length === 0 && <p className="stl-empty">Nenhum registro nesta categoria.</p>}
                {list.slice(0, 120).map((e: LogEntry) => {
                  const meta = KIND_META[e.kind] || KIND_META.config;
                  const Icon = meta.icon;
                  return (
                    <div key={e.id} className={`stl-entry sev-${e.severity}`}>
                      <span className="stl-entry-ico" style={{ color: meta.color }}>
                        <Icon size={13} strokeWidth={2} />
                      </span>
                      <div className="stl-entry-txt">
                        <div className="stl-entry-hd">
                          <b>{meta.label}</b>
                          <em>{e.reason}</em>
                          <span>{when(e.ts)}</span>
                        </div>
                        <p>{e.detail}</p>
                        {e.sample && <code>{e.sample}</code>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rag-acts">
                <button className="rag-btn" onClick={download}><Download size={12} strokeWidth={2} />Exportar registro</button>
                <button className="rag-btn" onClick={() => { clearLog(); setMsg("Registro zerado."); }}>
                  <Trash2 size={12} strokeWidth={2} />Limpar
                </button>
              </div>
            </div>
          )}

          {/* ── COFRE ── */}
          {tab === "cofre" && (
            <div className="stl-pane">
              <div className="stl-vault">
                <ServerCog size={20} strokeWidth={1.7} />
                <div>
                  <b>Custódia externa não conectada</b>
                  <span>
                    Hoje tudo vive neste navegador. Os campos abaixo estão prontos para o
                    backend do Marcos e não afirmam proteção que ainda não existe.
                  </span>
                </div>
              </div>

              <div className="stl-section">Destino dos registros</div>
              <div className="stl-vault-grid">
                {["Somente local", "Firestore", "Endpoint próprio"].map((opt, i) => (
                  <button key={opt} className={`stl-vault-opt${i === 0 ? " active" : ""}`} disabled={i > 0}>
                    <b>{opt}</b>
                    <span>{i === 0 ? "em uso" : "aguardando integração"}</span>
                  </button>
                ))}
              </div>

              <label className="rag-label">Projeto Firebase</label>
              <input className="rag-input" placeholder="meu-projeto" disabled />
              <label className="rag-label">Coleção do Firestore</label>
              <input className="rag-input" placeholder="sentinela_logs" disabled />
              <label className="rag-label">Endpoint de auditoria</label>
              <input className="rag-input" placeholder="https://seu-servidor/auditoria" disabled />

              <div className="rc-note">
                Contrato previsto: <code>POST</code> com <code>&#123; entries: LogEntry[] &#125;</code> e
                cabeçalho de autorização. A criptografia planejada é AES-GCM com chave derivada do
                UID autenticado, mantida apenas em memória. Nada disso está ligado — o painel
                mostra o estado real, não a promessa.
              </div>
            </div>
          )}
        </div>

        {msg && <div className="stl-toast"><CheckCircle2 size={12} strokeWidth={2} />{msg}</div>}

        <footer className="stl-ft">
          <AlertTriangle size={11} strokeWidth={2} />
          O Sentinela não para e não dorme. Alterações aqui valem imediatamente para as próximas mensagens.
        </footer>
      </div>
    </div>,
    document.body
  );
}
