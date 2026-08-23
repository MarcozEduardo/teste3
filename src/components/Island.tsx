import { Expand, Trash2 } from "lucide-react";
import { useBobby } from "../lib/store";

/** ILHA — só aparece no modo WIDGET (CSS esconde quando expandido) */
export default function Island() {
  const { setExpanded, clearCache } = useBobby();
  return (
    <nav id="bobby-island">
      <button className="island-btn" title="Expandir" onClick={() => setExpanded(true)}>
        <Expand size={15} strokeWidth={1.8} />
      </button>
      <button className="island-btn" title="Limpar cache do chat (temporário)" onClick={clearCache}>
        <Trash2 size={14} strokeWidth={2} />
      </button>
    </nav>
  );
}
