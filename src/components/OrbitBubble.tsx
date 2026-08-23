import { useEffect, useState } from "react";
import {
  FolderOpen, Palette, MessagesSquare, ShieldCheck, Database,
  Bot, Keyboard, Tag, Timer, Sliders, X,
} from "lucide-react";
import * as Pulso from "../lib/pulso";

const ICONS: Record<Pulso.OrbitId, typeof FolderOpen> = {
  galeria: FolderOpen, cor: Palette, conversa: MessagesSquare,
  sentinela: ShieldCheck, base: Database, bobby: Bot,
  input: Keyboard, contexto: Tag, cronometro: Timer, skills: Sliders,
};

/**
 * Indicador do Pulso Eterno.
 * Mostra qual assunto está orbitando e quanta vida resta.
 * Não é decoração: enquanto ele estiver aceso, palavra solta
 * é interpretada dentro daquele contexto.
 */
export default function OrbitBubble() {
  const [orb, setOrb] = useState(Pulso.current());

  useEffect(() => Pulso.subscribeOrbit(setOrb), []);
  if (!orb) return null;

  const def = Pulso.ORBITS[orb.id];
  const Icon = ICONS[orb.id];
  const pct = (orb.life / def.ttl) * 100;
  const focus = def.items?.find((i) => i.key === orb.focus)?.label;

  return (
    <div className="orbit" title="Pulso Eterno — assunto em órbita">
      <span className="orbit-ring" style={{ ["--pct" as string]: `${pct}%` }}>
        <Icon size={13} strokeWidth={2} />
      </span>
      <span className="orbit-txt">
        <b>{def.label}</b>
        {focus && <i>{focus}</i>}
      </span>
      <span className="orbit-life">{orb.life}</span>
      <button className="orbit-x" onClick={() => Pulso.burst()} title="Encerrar a órbita">
        <X size={10} strokeWidth={3} />
      </button>
    </div>
  );
}
