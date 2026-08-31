import { useEffect, useState } from "react";
import { KeyRound, Brain } from "lucide-react";
import { BobbyProvider, useBobby } from "./lib/store";
import Island from "./components/Island";
import { SideButtons, LeftPanel, RightPanel } from "./components/Panels";
import GalleryWindow from "./components/GalleryWindow";
import SiteViewer from "./components/SiteViewer";
import PrankModal from "./components/PrankModal";
import PulsoStudio from "./pulso-eterno/PulsoStudio";
import RagConfigButton from "./pulso-eterno/RagConfigButton";
import RagConfigWindow from "./pulso-eterno/RagConfigWindow";
import "./pulso-eterno/studio.css";
import Chat from "./components/Chat";
import Modals from "./components/Modals";

/** Overlay — SÓ no mobile (no desktop bloqueava os botões laterais) */
function MobOverlay() {
  const { leftOpen, rightOpen, setLeftOpen, setRightOpen } = useBobby();
  const active = leftOpen || rightOpen;
  return (
    <div
      className={`mob-overlay${active ? " active" : ""}`}
      onClick={() => { setLeftOpen(false); setRightOpen(false); }}
    />
  );
}

/** Botão flutuante temporário para testar a API key */
function ApiFab() {
  const { setModal, apiKey } = useBobby();
  return (
    <button className={`api-fab${apiKey ? " ok" : ""}`} onClick={() => setModal("apikey")} title="Testar chave de API (temporário)">
      <KeyRound size={14} strokeWidth={2} />
      API
      <span className="api-dot" />
    </button>
  );
}

/** Botão flutuante RAG - Configuração completa do RAG */
function RagFab() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button 
        className="rag-fab" 
        onClick={() => setIsOpen(true)} 
        title="Configurar RAG · Memórias e Capacidades"
      >
        <Brain size={14} strokeWidth={2} />
        RAG
        <span className="rag-dot" />
      </button>
      {isOpen && (
        <RagConfigWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}

function StorageWarning() {
  const { storageWarning, dismissStorageWarning } = useBobby();
  if (!storageWarning) return null;
  return (
    <div className="storage-warning" role="alert">
      <span>{storageWarning}</span>
      <button onClick={dismissStorageWarning} aria-label="Fechar aviso">×</button>
    </div>
  );
}

/** Fallback de navegação: Escape sempre devolve o controle da tela. */
function KeyboardSafety() {
  const {
    modal, setModal, galleryOpen, setGalleryOpen,
    leftOpen, setLeftOpen, rightOpen, setRightOpen,
    siteView, closeSite,
  } = useBobby();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modal) setModal(null);
      else if (siteView) closeSite();
      else if (galleryOpen) setGalleryOpen(false);
      else if (leftOpen) setLeftOpen(false);
      else if (rightOpen) setRightOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, setModal, galleryOpen, setGalleryOpen, leftOpen, setLeftOpen, rightOpen, setRightOpen, siteView, closeSite]);

  return null;
}

function Nexus() {
  const { expanded } = useBobby();
  return (
    <div id="bobby-nexus" className={expanded ? "state-expanded" : "state-widget"}>
      <div className="nexus-inner">
        <main className="chat-center"><Chat /></main>
      </div>
    </div>
  );
}

/** Studio do Pulso Eterno — abre pelo botão flutuante. */
function StudioLauncher() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = () => setOpen(true);
    window.addEventListener("pulso:studio", t);
    return () => window.removeEventListener("pulso:studio", t);
  }, []);
  return (
    <>
      <button className="pulso-fab" onClick={() => setOpen(true)} title="Pulso Eterno · Studio">
        <span className="pulso-fab-orb"><i /><i /></span>
        Pulso
      </button>
      {open && <PulsoStudio onClose={() => setOpen(false)} />}
    </>
  );
}

function Shell() {
  return (
    <>
      <MobOverlay />
      <KeyboardSafety />
      <Island />
      <SideButtons />
      <LeftPanel />
      <RightPanel />
      <GalleryWindow />
      <SiteViewer />
      <Nexus />
      <Modals />
      <PrankModal />
      <StudioLauncher />
      <ApiFab />
      <RagFab />
      <StorageWarning />
      <div id="body-signature">Produção Marcos Eduardo — orquestrando IA Generativa.</div>
    </>
  );
}

export default function App() {
  return <BobbyProvider><Shell /></BobbyProvider>;
}
