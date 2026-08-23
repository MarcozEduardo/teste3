import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, ShieldAlert, Cpu } from "lucide-react";
import { useBobby } from "../lib/store";

/* ══ ASCII do "processador" — dá a impressão de ver o chip trabalhando ══ */

const BUS = ["·", "•", "▪", "▫", "◦", "─", "═"];
const CORE = ["▖", "▘", "▝", "▗", "▚", "▞", "▛", "▙"];

/** Gera uma linha de barramento com pulsos caminhando. */
function busLine(tick: number, width: number, seed: number): string {
  let out = "";
  for (let i = 0; i < width; i++) {
    const wave = Math.sin((i + tick * 1.6 + seed * 3) * 0.55);
    out += wave > 0.75 ? "█" : wave > 0.35 ? "▓" : wave > -0.1 ? "▒" : BUS[(i + seed) % BUS.length];
  }
  return out;
}

function AsciiProcessor({ active }: { active: boolean }) {
  const [tick, setTick] = useState(0);
  // Só roda com a gaveta aberta e a aba em foco.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 130) { setTick((v) => v + 1); last = t; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const core = CORE[tick % CORE.length];
  const load = 62 + Math.round(Math.sin(tick * 0.4) * 28);
  const bars = Math.max(1, Math.round(load / 10));

  return (
    <pre className="ascii-cpu" aria-hidden="true">
{`┌─[ BOBBY::CORE ]──────────────────┐
│ ${busLine(tick, 12, 1)}  ${core}  ${busLine(tick, 12, 5)} │
│ ${busLine(tick + 3, 12, 2)}  ${core}  ${busLine(tick + 1, 12, 6)} │
│  load ${String(load).padStart(3)}%  [${"█".repeat(bars)}${"░".repeat(10 - bars)}] │
└──────────────────────────────────┘`}
    </pre>
  );
}

/* ══ Painel retrátil — flutua sobre o input, não empurra a tela ══ */
export default function Thinking() {
  const { gen, stages } = useBobby();
  const [open, setOpen] = useState(false);
  const wasActive = useRef(false);

  const active = gen !== "idle" && stages.length > 0;
  const current = stages[stages.length - 1];

  // Recolhe sozinho ao terminar, pra não ficar sujeira na tela.
  useEffect(() => {
    if (wasActive.current && !active) setOpen(false);
    wasActive.current = active;
  }, [active]);

  if (!active) return null;

  const doneCount = stages.filter((s) => s.state !== "run").length;
  const warned = stages.some((s) => s.state === "warn");

  return (
    <div className={`think-dock${open ? " open" : ""}${warned ? " warned" : ""}`}>
      <button
        className="think-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={open ? "Recolher o processo" : "Ver o processo por dentro"}
      >
        <span className="think-chip"><Cpu size={11} strokeWidth={2} /></span>
        <span className="think-now">{current?.label || "Processando"}</span>
        <span className="think-dots"><i /><i /><i /></span>
        <span className="think-count">{doneCount}/{stages.length}</span>
        <ChevronDown className="think-caret" size={13} strokeWidth={2.5} />
      </button>

      <div className="think-drawer">
        <AsciiProcessor active={open} />
        <div className="think-list">
          {stages.map((s) => (
            <div key={s.id} className={`think-row ${s.state}`}>
              <span className="think-ico">
                {s.state === "run" && <span className="think-spin" />}
                {s.state === "ok" && <Check size={11} strokeWidth={3} />}
                {s.state === "warn" && <ShieldAlert size={11} strokeWidth={2.5} />}
              </span>
              <span className="think-txt">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
