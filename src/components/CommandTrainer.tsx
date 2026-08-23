import { useMemo, useState } from "react";
import { Eye, EyeOff, Plus, Trash2, Download, Upload, CheckCircle2 } from "lucide-react";
import {
  COMMANDS, addTraining, getTraining, clearTraining, allTraining, importTraining,
  type IntentId,
} from "../lib/intents";

/**
 * Painel de treino do reconhecedor.
 * Marcos escolhe o comando, cola as variações e o motor passa a
 * reconhecer na hora — sem recompilar nada.
 */
export default function CommandTrainer() {
  const [sel, setSel] = useState<IntentId>("color.change");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [showHidden, setShowHidden] = useState(true);
  const [version, setVersion] = useState(0);

  const groups = useMemo(() => {
    void version;
    const out: Record<string, typeof COMMANDS> = {};
    COMMANDS.filter((c) => showHidden || !c.hidden).forEach((c) => {
      (out[c.group] ||= []).push(c);
    });
    return out;
  }, [showHidden, version]);

  const current = COMMANDS.find((c) => c.id === sel)!;
  const trained = useMemo(() => { void version; return getTraining(sel); }, [sel, version]);
  const total = useMemo(() => {
    void version;
    return Object.values(allTraining()).reduce((n, arr) => n + arr.length, 0);
  }, [version]);

  const save = () => {
    const phrases = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!phrases.length) { setMsg("Cole ao menos uma frase."); return; }
    const n = addTraining(sel, phrases);
    setText(""); setVersion((v) => v + 1);
    setMsg(`${n} variação(ões) adicionadas a "${current.label}".`);
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(allTraining(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "bobby-comandos.json"; a.click();
  };

  const importFile = async (files: FileList | null) => {
    if (!files?.[0]) return;
    try {
      importTraining(JSON.parse(await files[0].text()));
      setVersion((v) => v + 1);
      setMsg("Treinamento importado.");
    } catch { setMsg("JSON inválido."); }
  };

  return (
    <div className="rag-pane">
      <div className="rc-section-title">
        Comandos reconhecidos
        <span className="rc-kb">{COMMANDS.length} ações · {total} variações treinadas</span>
      </div>

      <div className="ct-toolbar">
        <button className={`ct-eye${showHidden ? " on" : ""}`} onClick={() => setShowHidden(!showHidden)}>
          {showHidden ? <Eye size={12} strokeWidth={2} /> : <EyeOff size={12} strokeWidth={2} />}
          {showHidden ? "Mostrando ocultas" : "Só as visíveis"}
        </button>
        <button className="ct-eye" onClick={exportAll}><Download size={12} strokeWidth={2} />Exportar</button>
        <label className="ct-eye">
          <Upload size={12} strokeWidth={2} />Importar
          <input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => importFile(e.target.files)} />
        </label>
      </div>

      <div className="ct-list">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="ct-group">
            <div className="ct-group-name">{group}</div>
            {items.map((c) => {
              const count = getTraining(c.id).length;
              return (
                <button
                  key={c.id}
                  className={`ct-item${sel === c.id ? " active" : ""}${c.hidden ? " hidden-cmd" : ""}`}
                  onClick={() => { setSel(c.id); setMsg(""); }}
                >
                  <span className="ct-item-main">
                    <b>{c.label}</b>
                    <i>“{c.example}”</i>
                  </span>
                  {c.hidden && <span className="ct-badge oculta">oculta</span>}
                  {count > 0 && <span className="ct-badge">{count}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="ct-editor">
        <div className="ct-editor-hd">
          <b>{current.label}</b>
          {current.hidden && <span className="ct-badge oculta">função oculta</span>}
        </div>
        <p className="ct-note">{current.note}</p>

        <textarea
          className="rag-textarea"
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Uma variação por linha. Exemplos para "${current.label}":\n\n${current.example}\n${current.example.replace(/^\w+/, "poderia")}\nqueria que você ${current.example}\nvai lá e ${current.example}\nfaz o seguinte: ${current.example}`}
        />

        <div className="rag-acts">
          <button className="rag-btn primary" onClick={save}>
            <Plus size={12} strokeWidth={2.5} />Treinar
          </button>
          {trained.length > 0 && (
            <button className="rag-btn" onClick={() => { clearTraining(sel); setVersion((v) => v + 1); setMsg("Treinamento limpo."); }}>
              <Trash2 size={12} strokeWidth={2} />Limpar {trained.length}
            </button>
          )}
        </div>

        {msg && <div className="rag-msg"><CheckCircle2 size={12} strokeWidth={2} />{msg}</div>}

        {trained.length > 0 && (
          <div className="ct-trained">
            {trained.slice(-14).map((p, i) => <span key={i} className="ct-chip">{p}</span>)}
          </div>
        )}
      </div>

      <div className="rc-note">
        O motor já combina verbo e alvo sozinho, cobrindo conjugações no presente, passado,
        futuro e imperativo. O que você cola aqui entra como atalho de confiança alta: bate
        exato, executa sem hesitar.
      </div>
    </div>
  );
}
