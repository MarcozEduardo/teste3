import { useState, useEffect, useRef } from "react";
import { Brain, X } from "lucide-react";
import RagConfigWindow from "./RagConfigWindow";

export default function RagConfigButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Posicionar o botão no canto inferior direito
  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        x: window.innerWidth - rect.width - 20,
        y: window.innerHeight - rect.height - 20
      });
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        className="rag-config-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        }}
        title="Configurar RAG"
      >
        <Brain size={28} />
        {isOpen && (
          <span className="rag-btn-pulse" style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'rgba(102, 126, 234, 0.3)',
            animation: 'rag-pulse 2s infinite',
          }} />
        )}
      </button>

      <RagConfigWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />

      <style jsx>{`
        @keyframes rag-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(1); opacity: 0.5; }
        }
        
        .rag-config-btn:hover {
          transform: scale(1.1);
        }
      `}</style>
    </>
  );
}
