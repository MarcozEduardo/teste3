import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Info, Trash2, Plus } from "lucide-react";

/**
 * Janela de edição de listas de texto.
 * Campo pequeno na lateral serve para conferir; escrever de
 * verdade pede espaço. Toda lista longa abre aqui.
 */
export interface TextWindowProps {
  title: string;
  hint: string;
  /** Exemplos que aparecem quando o campo está vazio. */
  examples?: string[];
  /** Conselhos de uso, no rodapé. */
  advice?: string[];
  value: string[];
  max?: number;
  onSave: (lines: string[]) => void;
  onClose: () => void;
}

export default function TextWindow({
  title, hint, examples = [], advice = [], value, max = 10000, onSave, onClose,
}: TextWindowProps) {
  const [text, setText] = useState(value.join("\n"));
  const [showEx, setShowEx] = useState(false);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        onSave(text.split("\n").map((l) => l.trim()).filter(Boolean));
        onClose();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [text, onSave, onClose]);

  const lines = text.split("\n").filter((l) => l.trim());

  return createPortal(
    <div className="pe-tw-back" onClick={onClose}>
      <div className="pe-tw" onClick={(e) => e.stopPropagation()}>
        <header className="pe-tw-hd">
          <div>
            <b>{title}</b>
            <span>{hint}</span>
          </div>
          <button className="pe-ico" onClick={onClose}><X size={15} /></button>
        </header>

        <div className="pe-tw-body">
          <textarea
            autoFocus
            className="pe-tw-area"
            maxLength={max}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={examples.length ? examples.join("\n") : "Uma por linha."}
          />

          {examples.length > 0 && (
            <aside className="pe-tw-side">
              <button className="pe-tw-toggle" onClick={() => setShowEx(!showEx)}>
                {showEx ? "Ocultar exemplos" : "Ver exemplos"}
              </button>
              {showEx && (
                <div className="pe-tw-ex">
                  {examples.map((ex, i) => (
                    <button key={i} className="pe-tw-exline"
                      onClick={() => setText((t) => (t.trim() ? t + "\n" : "") + ex)}>
                      <Plus size={9} />{ex}
                    </button>
                  ))}
                </div>
              )}
              {advice.length > 0 && (
                <div className="pe-tw-advice">
                  <b><Info size={11} />Conselhos</b>
                  {advice.map((a, i) => <p key={i}>{a}</p>)}
                </div>
              )}
            </aside>
          )}
        </div>

        <footer className="pe-tw-ft">
          <span>{lines.length} linha(s) · {text.length} de {max.toLocaleString("pt-BR")}</span>
          <div>
            <button className="pe-btn ghost" onClick={() => setText("")}>
              <Trash2 size={11} />Limpar
            </button>
            <button className="pe-btn primary" onClick={() => {
              onSave(text.split("\n").map((l) => l.trim()).filter(Boolean));
              onClose();
            }}>
              <Save size={12} />Salvar
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
