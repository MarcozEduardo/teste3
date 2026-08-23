import { useEffect, useRef, useState } from "react";
import {
  Check, Filter, X, MessageCircle, UserRound, LayoutGrid, Code2, Boxes,
  Sparkles, Palette, FileText, Image, Globe, Database, Settings2,
  Briefcase, LifeBuoy, ShieldCheck, type LucideIcon,
} from "lucide-react";
import { CONTEXTS, CTX, type ContextId } from "../lib/contexts";
import { useBobby } from "../lib/store";

const ICONS: Record<string, LucideIcon> = {
  MessageCircle, UserRound, LayoutGrid, Code2, Boxes, Sparkles, Palette,
  FileText, Image, Globe, Database, Settings2, Briefcase, LifeBuoy, ShieldCheck,
};

export function CtxIcon({ name, size = 13 }: { name: string; size?: number }) {
  const I = ICONS[name] || MessageCircle;
  return <I size={size} strokeWidth={2.2} />;
}

/* ══ Confete pixel art: quadradinhos que explodem na chegada ══ */
function burst(x: number, y: number, color: string) {
  const N = 18;
  for (let i = 0; i < N; i++) {
    const p = document.createElement("i");
    p.className = "ctx-pixel";
    const angle = (Math.PI * 2 * i) / N + Math.random() * 0.4;
    const dist = 26 + Math.random() * 46;
    p.style.cssText = `left:${x}px;top:${y}px;background:${color};` +
      `--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;` +
      `--rot:${Math.random() * 360}deg;width:${3 + Math.random() * 4}px;` +
      `height:${3 + Math.random() * 4}px;animation-delay:${Math.random() * 70}ms`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

/**
 * MARCADOR — vive dentro do balão. Não é botão: é um carimbo clicável.
 * Ao clicar, um clone voa até o seletor lá embaixo e explode em pixels.
 */
export function ContextStamp({ ctx, ragOnly }: { ctx: ContextId; ragOnly?: boolean }) {
  const { contextFilter, flyToPanel } = useBobby();
  const ref = useRef<HTMLSpanElement>(null);
  const def = CTX[ctx] || CTX.chat;

  const launch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const from = ref.current?.getBoundingClientRect();
    const target = document.querySelector(".ctx-opener")?.getBoundingClientRect();
    if (!from) return;

    if (target) {
      const clone = document.createElement("span");
      clone.className = "ctx-flyer";
      clone.style.cssText =
        `left:${from.left}px;top:${from.top}px;color:${def.color};` +
        `border-color:${def.color}55;background:${def.color}22;` +
        `--tx:${target.left + target.width / 2 - from.left - 11}px;` +
        `--ty:${target.top + target.height / 2 - from.top - 11}px`;
      clone.innerHTML = ref.current!.innerHTML;
      document.body.appendChild(clone);

      setTimeout(() => {
        burst(target.left + target.width / 2, target.top + target.height / 2, def.color);
        clone.remove();
      }, 560);
    }
    flyToPanel(ctx);
  };

  return (
    <span
      ref={ref}
      className={`ctx-stamp${contextFilter === ctx ? " on" : ""}`}
      style={{ ["--ctx" as string]: def.color }}
      onClick={launch}
      data-tip={`${def.label}${ragOnly ? " · da base" : ""}`}
    >
      <CtxIcon name={def.icon} size={12} />
      {ragOnly && <span className="ctx-stamp-dot" />}
    </span>
  );
}

/* ══ SELETOR — logo acima da caixa de digitar ══ */
export function ContextPanel({ ctx }: { ctx: ContextId }) {
  const { contextFilter, setContextFilter, panelHint, clearPanelHint } = useBobby();
  const [open, setOpen] = useState(false);
  const [blink, setBlink] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const shown = contextFilter ? CTX[contextFilter] : CTX[ctx] || CTX.chat;

  // Avisa o último contexto e conta 5 segundos até sumir.
  useEffect(() => {
    setCountdown(5);
    const i = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(i); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [ctx]);

  // O marcador chegou: duas piscadinhas para chamar atenção.
  useEffect(() => {
    if (!panelHint) return;
    const t = setTimeout(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 900);
      clearPanelHint();
    }, 560);
    return () => clearTimeout(t);
  }, [panelHint, clearPanelHint]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (id: ContextId) => {
    setContextFilter(contextFilter === id ? null : id);
    setOpen(false);
  };

  return (
    <div className="ctx-panel-wrap" ref={ref}>
      <button
        className={`ctx-opener${open ? " open" : ""}${contextFilter ? " filtering" : ""}${blink ? " blink" : ""}`}
        style={{ ["--ctx" as string]: shown.color }}
        onClick={() => setOpen((o) => !o)}
        data-tip={contextFilter ? "Filtro ativo — clique para trocar" : "Marcar um contexto para filtrar"}
      >
        <CtxIcon name={shown.icon} size={13} />
        <span className="ctx-opener-txt">
          {contextFilter ? `filtrando: ${shown.label}` : shown.label}
        </span>
        {contextFilter && (
          <span
            className="ctx-opener-off"
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setContextFilter(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setContextFilter(null); } }}
          >
            <X size={10} strokeWidth={3} />
          </span>
        )}
      </button>

      {countdown > 0 && !contextFilter && (
        <span className="ctx-last" key={ctx}>
          Último contexto abordado por Bobby
          <b>{countdown}s</b>
        </span>
      )}

      {open && (
        <div className="ctx-menu">
          <div className="ctx-menu-hd">
            <Filter size={11} strokeWidth={2} />
            Filtrar a conversa por contexto
          </div>
          <div className="ctx-grid">
            {CONTEXTS.map((c) => (
              <button
                key={c.id}
                className={`ctx-item${c.id === ctx ? " current" : ""}${contextFilter === c.id ? " active" : ""}`}
                style={{ ["--ctx" as string]: c.color }}
                onClick={() => pick(c.id)}
                data-tip={c.desc}
              >
                <span className="ctx-item-glyph"><CtxIcon name={c.icon} size={16} /></span>
                <span className="ctx-item-label">{c.label}</span>
                {contextFilter === c.id && <Check className="ctx-check" size={10} strokeWidth={3} />}
              </button>
            ))}
          </div>
          <div className="ctx-menu-ft">
            {contextFilter
              ? "Clique no contexto marcado para voltar à ordem cronológica."
              : "Ao marcar, o histórico anterior é recortado nesse assunto. Mensagens novas seguem livres."}
          </div>
        </div>
      )}
    </div>
  );
}
