import { useState } from "react";
import { X, ExternalLink, RefreshCw, Globe, AlertTriangle } from "lucide-react";
import { useBobby } from "../lib/store";

/** Abre o site mapeado em meia tela, sem tirar o usuário da conversa. */
export default function SiteViewer() {
  const { siteView, closeSite } = useBobby();
  const [reloadKey, setReloadKey] = useState(0);
  const [failed, setFailed] = useState(false);

  if (!siteView) return null;
  const s = siteView;

  return (
    <aside className="site-viewer" aria-label={`Pré-visualização de ${s.host}`}>
      <header className="sv-bar">
        <span className="sv-ico"><Globe size={14} strokeWidth={2} /></span>
        <div className="sv-meta">
          <span className="sv-host">{s.host}</span>
          <span className="sv-kind">{s.kind}</span>
        </div>
        <button className="sv-btn" title="Recarregar" onClick={() => { setFailed(false); setReloadKey((k) => k + 1); }}>
          <RefreshCw size={13} strokeWidth={2} />
        </button>
        <button className="sv-btn" title="Abrir em nova aba" onClick={() => window.open(s.url, "_blank", "noopener")}>
          <ExternalLink size={13} strokeWidth={2} />
        </button>
        <button className="sv-btn close" title="Fechar" onClick={closeSite}>
          <X size={14} strokeWidth={2} />
        </button>
      </header>

      <div className="sv-frame">
        {failed ? (
          <div className="sv-blocked">
            <AlertTriangle size={22} strokeWidth={1.6} />
            <strong>Este site recusou a incorporação.</strong>
            <p>
              Muitos domínios enviam <code>X-Frame-Options</code> ou <code>CSP frame-ancestors</code> e
              bloqueiam a exibição dentro de outra página. É uma proteção do próprio site, não uma falha do chat.
            </p>
            <button className="proto-btn primary" onClick={() => window.open(s.url, "_blank", "noopener")}>
              <ExternalLink size={11} strokeWidth={2} />Abrir em nova aba
            </button>
          </div>
        ) : (
          <iframe
            key={reloadKey}
            src={s.url}
            title={s.title}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            onError={() => setFailed(true)}
          />
        )}
      </div>

      <footer className="sv-foot">
        Pré-visualização isolada em sandbox · o chat continua ativo ao lado
      </footer>
    </aside>
  );
}
