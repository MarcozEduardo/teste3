import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Lock } from "lucide-react";
import { useBobby } from "../lib/store";

/**
 * O aviso do rodapé em tela cheia, com o botão de fechar travado
 * por cinco segundos. O tempo que a pessoa leva para fechar depois
 * de liberado vira munição para a próxima fala do Bobby.
 */
export default function PrankModal() {
  const { pushSystem } = useBobby();
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(5);
  const [freedAt, setFreedAt] = useState(0);

  useEffect(() => {
    const trigger = () => { setOpen(true); setLeft(5); setFreedAt(0); };
    window.addEventListener("bobby:prank", trigger);
    return () => window.removeEventListener("bobby:prank", trigger);
  }, []);

  useEffect(() => {
    if (!open || left <= 0) return;
    const t = setTimeout(() => {
      setLeft((v) => {
        if (v <= 1) { setFreedAt(Date.now()); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [open, left]);

  if (!open) return null;

  const close = () => {
    const waited = freedAt ? Math.round((Date.now() - freedAt) / 1000) : 0;
    setOpen(false);
    const verdict =
      waited >= 8
        ? `Pelo tempo que você levou pra fechar, leu mesmo. Respeito.\n\nEntão fica combinado: eu erro, você confere. É assim que funciona bem.`
        : waited >= 3
          ? `Uns ${waited} segundos depois de liberar. Leu por cima, mas leu.\n\nO importante ficou: confere o que eu falo. Principalmente número, data e nome.`
          : `Fechou na hora que liberou. Nem leu, né?\n\nTudo bem, eu resumo: eu erro. Confere o que importa antes de usar.`;
    pushSystem(verdict, "chat");
  };

  return createPortal(
    <div className="prank-back">
      <div className="prank" role="alertdialog" aria-modal="true">
        <div className="prank-ico"><AlertTriangle size={30} strokeWidth={1.6} /></div>
        <h2>Sim, eu erro</h2>
        <p className="prank-lead">
          Este é aquele aviso que fica miudinho no rodapé e ninguém abre. Agora ele
          está do tamanho que merece.
        </p>
        <div className="prank-body">
          <p>
            Bobby é uma IA. Pode cometer erros, gerar informações imprecisas ou
            desatualizadas, e ocasionalmente afirmar com convicção algo que não confere.
          </p>
          <p>
            Aqui existe uma trava contra isso: quando há fonte na base, ela é citada com o
            percentual de similaridade. Quando não há, a resposta é <b>não sei</b>. Mas
            trava nenhuma substitui conferência humana.
          </p>
          <p>
            <b>Verifique informações críticas</b> antes de tomar decisão com base nelas.
            Principalmente número, data, nome próprio e qualquer coisa que vá para
            um documento oficial.
          </p>
        </div>
        <button className={`prank-close${left > 0 ? " locked" : ""}`} onClick={close} disabled={left > 0}>
          {left > 0
            ? <><Lock size={13} strokeWidth={2} />Aguarde {left}s</>
            : <><X size={14} strokeWidth={2.4} />Li e entendi</>}
        </button>
        {left > 0 && <span className="prank-hint">O botão libera em {left} segundo{left === 1 ? "" : "s"}. Aproveita e lê.</span>}
      </div>
    </div>,
    document.body
  );
}
