import { useState, useCallback } from "react";
import { Brain, X, Minimize2, Maximize2 } from "lucide-react";
import RagConfig from "./RagConfig";

export interface RagConfigWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RagConfigWindow({ isOpen, onClose }: RagConfigWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="rag-window-container">
      {!isMinimized && (
        <div className="rag-window-overlay" onClick={onClose} />
      )}
      
      <div className={`rag-window ${isMinimized ? 'minimized' : ''}`}>
        {!isMinimized ? (
          <RagConfig
            onClose={onClose}
            onMinimize={() => setIsMinimized(true)}
          />
        ) : (
          <div className="rag-minimized-bar" onClick={() => setIsMinimized(false)}>
            <Brain size={16} />
            <span>Configuração do RAG</span>
            <button className="rag-close-btn" onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
