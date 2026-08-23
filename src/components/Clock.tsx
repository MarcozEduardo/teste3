import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

/**
 * Cronômetro da sessão — isolado de propósito.
 * Ele re-renderiza a cada segundo; manter isso dentro do contexto
 * global fazia a árvore inteira redesenhar e travava a interface.
 */
export default function Clock() {
  const start = useRef(Date.now());
  const [txt, setTxt] = useState("00:00");
  const [long, setLong] = useState(false);

  // O Bobby pode zerar o mostrador — o total real fica com o sistema.
  useEffect(() => {
    const reset = () => { start.current = Date.now(); };
    window.addEventListener("clock:reset", reset);
    return () => window.removeEventListener("clock:reset", reset);
  }, []);

  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - start.current) / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setTxt(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      );
      setLong(s > 2700); // 45 min
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div
      className={`clock-badge${long ? " long" : ""}`}
      data-tip={long ? "Sessão longa — considere uma pausa" : "Tempo de sessão aberta"}
    >
      <Timer size={11} strokeWidth={2} />
      <span>{txt}</span>
    </div>
  );
}
