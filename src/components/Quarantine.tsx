import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { log as slog } from "../lib/sentinelaLog";
import {
  ShieldAlert, Lock, LockOpen, FileWarning, X, Check, Ban,
  Siren, ShieldCheck, Fingerprint,
} from "lucide-react";
import { useBobby } from "../lib/store";
import { laudoText, riskLevel, type Scan, type SealState } from "../lib/quarantine";
import type { Attachment } from "../lib/types";
import sentinelaBadge from "../../public/sentinela.png";

/* ══ Documento oficial com carimbo ══ */
function Laudo({ scan, att, onClose }: { scan: Scan; att: Attachment; onClose: () => void }) {
  const nivel = riskLevel(scan.risks);
  // Portal: a lista de mensagens usa contain/content-visibility e prendia o modal no feed.
  return createPortal(
    <div className="modal-overlay open laudo-back" onClick={onClose}>
      <div className="laudo" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="laudo-x" onClick={onClose}><X size={15} strokeWidth={2} /></button>

        <header className="laudo-hd">
          <img className="laudo-badge" src={sentinelaBadge} alt="" />
          <div className="laudo-hd-txt">
            <div className="laudo-org">República do Render Nexus · Guarda Perimetral</div>
            <h2>Auto de Retenção de Algoritmo</h2>
            <div className="laudo-proto">Protocolo nº {scan.protocol}</div>
          </div>
        </header>

        <div className="laudo-rule" />

        <div className="laudo-meta">
          <div><span>Arquivo</span><b>{att.name}</b></div>
          <div><span>Linguagem</span><b>{att.label}</b></div>
          <div><span>Volume</span><b>{scan.lines} linhas</b></div>
          <div><span>Atenção</span><b className={`lv-${nivel}`}>{nivel}</b></div>
        </div>

        <div className="laudo-body">
          <p className="laudo-lead">
            Pelo presente instrumento, a guarda automática do Render Nexus registra a retenção
            preventiva do material identificado acima, nos termos da política de perímetro vigente.
          </p>
          {laudoText(scan, att.ext).split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {scan.risks.length > 0 && (
          <div className="laudo-risks">
            <div className="laudo-sub"><FileWarning size={12} strokeWidth={2} />Pontos observados</div>
            {scan.risks.map((r) => (
              <div key={r.id} className={`laudo-risk sev-${r.severity}`}>
                <b>{r.label}</b>
                <span>{r.detail}</span>
              </div>
            ))}
          </div>
        )}

        <div className="laudo-foot">
          <div className="laudo-stamp">
            <div className="stamp-ring">
              <ShieldCheck size={20} strokeWidth={1.6} />
              <span>SENTINELA</span>
              <i>RETIDO</i>
            </div>
          </div>
          <div className="laudo-sign">
            <Fingerprint size={13} strokeWidth={2} />
            <div>
              <b>Guarda automática do perímetro</b>
              <span>Emitido em {new Date().toLocaleString("pt-BR")} · sem intervenção humana</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ══ Diálogo de liberação ══ */
function AskBobby({ att, onYes, onNo, onCancel }: {
  att: Attachment; onYes: () => void; onNo: () => void; onCancel: () => void;
}) {
  return createPortal(
    <div className="modal-overlay open laudo-back" onClick={onCancel}>
      <div className="ask-bobby" onClick={(e) => e.stopPropagation()}>
        <div className="ask-icon"><ShieldAlert size={26} strokeWidth={1.6} /></div>
        <b>É arriscado colar algoritmo solto</b>
        <p>
          Por isso existe essa barreira. O Sentinela não para e não dorme — ele retém
          todo código antes de qualquer leitura.
        </p>
        <p className="ask-file">
          <code>{att.name}</code> · {att.label}
        </p>
        <p className="ask-q">Você tem certeza de que esse conteúdo é seguro?</p>
        <div className="ask-btns">
          <button className="ask-no" onClick={onNo}>
            <Ban size={13} strokeWidth={2} />Não — bloquear
          </button>
          <button className="ask-yes" onClick={onYes}>
            <Check size={13} strokeWidth={2.5} />Sim, eu respondo por ele
          </button>
        </div>
        <span className="ask-warn">Escolhendo “não”, o bloqueio é permanente neste arquivo.</span>
      </div>
    </div>,
    document.body
  );
}

/* ══ CARD DE QUARENTENA ══ */
export default function QuarantineCard({ att, scan }: { att: Attachment; scan: Scan }) {
  const { sealOf, setSeal, pushSystem } = useBobby();
  const state: SealState = sealOf(att.id);
  const [showLaudo, setShowLaudo] = useState(false);
  const [asking, setAsking] = useState(false);

  // Registra a retenção uma única vez, quando o card nasce.
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current || state !== "held") return;
    logged.current = true;
    slog("hold", "código retido", `${att.name} (${att.label}) em quarentena. ${scan.risks.length} ponto(s) observado(s). Protocolo ${scan.protocol}.`,
      { sample: att.content, severity: scan.risks.length ? "grave" : "aviso" });
  }, [state, att, scan]);

  const release = () => {
    setSeal(att.id, "released");
    setAsking(false);
    pushSystem(
      `**Liberado sob responsabilidade do usuário.**\n\nO arquivo \`${att.name}\` (${att.label}) estava retido pela Sentinela e foi autorizado por você. O sistema havia bloqueado; o Bobby liberou porque você confirmou que o conteúdo é confiável.\n\nIsso fica registrado no contexto: a partir de agora eu consigo ler esse trecho e comentar sobre ele.`,
      "seguranca"
    );
  };

  const deny = () => {
    setSeal(att.id, "denied");
    setAsking(false);
    pushSystem(
      `**Bloqueio confirmado.** O arquivo \`${att.name}\` fica lacrado nesta conversa e não será lido por mim nem indexado na base.\n\nEssa decisão não tem volta neste anexo. Se precisar do conteúdo, envie de novo em uma mensagem nova.`,
      "seguranca"
    );
  };

  if (state === "released") {
    return (
      <div className="qt-card ok">
        <span className="qt-ico"><LockOpen size={14} strokeWidth={2} /></span>
        <div className="qt-txt">
          <b>Código verificado</b>
          <i>{att.name} · liberado por você</i>
        </div>
        <span className="qt-seal-ok"><ShieldCheck size={13} strokeWidth={2} /></span>
      </div>
    );
  }

  return (
    <>
      <div className={`qt-card${state === "denied" ? " denied" : ""}`}>
        <div className="qt-siren" aria-hidden="true">
          <Siren size={17} strokeWidth={2} />
        </div>

        <div className="qt-main">
          <div className="qt-head">
            <b>{state === "denied" ? "Bloqueado permanentemente" : "Bloqueado pela Sentinela"}</b>
            <span className="qt-proto">{scan.protocol}</span>
          </div>
          <div className="qt-sub">
            {att.label} · {scan.lines} linhas
            {scan.risks.length > 0 && ` · ${scan.risks.length} ponto(s) observado(s)`}
          </div>

          <div className="qt-acts">
            <button className="qt-btn" onClick={() => setShowLaudo(true)}>
              <FileWarning size={11} strokeWidth={2} />Ver o laudo
            </button>
            {state !== "denied" && (
              <button className="qt-btn ask" onClick={() => setAsking(true)}>
                <Lock size={11} strokeWidth={2} />Solicitar permissão ao Bobby
              </button>
            )}
          </div>
        </div>
      </div>

      {showLaudo && <Laudo scan={scan} att={att} onClose={() => setShowLaudo(false)} />}
      {asking && (
        <AskBobby att={att} onYes={release} onNo={deny} onCancel={() => setAsking(false)} />
      )}
    </>
  );
}
