import type { LinkMap } from "./skills";

export interface Proto { id: string; name: string; lang: string; code: string }
export interface Source { title: string; docId: string; score: number }

export interface Attachment {
  id: string;
  /** Chave do binário persistido no IndexedDB. */
  assetId?: string;
  name: string;
  ext: string;
  label: string;
  color: string;
  size: number;
  content: string;
  dataUrl?: string;
  kind: "code" | "pdf" | "image" | "text";
}

export interface Msg {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
  ts: number;
  proto?: Proto;
  sources?: Source[];
  flag?: string;
  liked?: boolean;
  attachments?: Attachment[];
  linkMaps?: LinkMap[];
  /** id do branch a que pertence (mensagens editadas) */
  branch?: number;
  /** marca mensagem de sistema/metadados */
  meta?: boolean;
  /** ação de interface executada pela IA */
  tool?: string;
  /** contexto semântico atribuído na chegada */
  ctx?: import("./contexts").ContextId;
  /** resposta veio direto da base, sem síntese de modelo */
  ragOnly?: boolean;
  /** Card de confirmacao para acao destrutiva. */
  confirm?: {
    id: string;
    kind: "delete-chats";
    targetIds: string[];
    label: string;
    resolved?: "yes" | "no";
  };
  /** Tres primeiros resultados de uma busca Google. */
  searchResults?: import("./webSearch").WebResult[];
}

export interface Conv {
  id: string;
  title: string;
  createdAt: number;
  messages: Msg[];
  /** quantos branches essa conversa já teve */
  branches?: number;
}

export interface LikedMsg {
  id: string;
  content: string;
  convId: string;
  convTitle: string;
  time: string;
  savedAt: number;
  sources?: Source[];
}

export interface DeletedConv extends Conv { deletedAt: number }

export type LayoutMode = "fullscreen" | "90" | "centered";
export type ModalKind = null | "disclaimer" | "config" | "renderchat" | "rag" | "apikey" | "doc" | "sentinela";
export type GenState = "idle" | "thinking" | "streaming";
export type Lang = "pt" | "en" | "es" | "it";

export type SkillId =
  | "rag" | "sentinela" | "proto" | "humor" | "turbo"
  | "links" | "doccard" | "pdf" | "vision" | "metadata";

export interface Stage { id: string; label: string; state: "run" | "ok" | "warn" }

export interface GalleryFile {
  id: string;
  name: string;
  cat: "doc" | "proto" | "final" | "chats" | "liked" | "trash";
  content: string;
  date: string;
  _msgs?: Msg[];
  _liked?: LikedMsg;
  dataUrl?: string;
  assetId?: string;
}
