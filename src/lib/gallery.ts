import type { Conv, DeletedConv, GalleryFile, LikedMsg, Msg, Proto } from "./types";
import { getAsset } from "./blobStore";

export function todayStr(): string { return new Date().toLocaleDateString("pt-BR"); }

export function catLabel(c: string): string {
  return {
    doc: "Docs", proto: "Protótipo", final: "Confirmado",
    chats: "Chat", liked: "Curtida", trash: "Deletado",
  }[c] || c;
}

export function extColor(name: string): string {
  const e = (name.split(".").pop() || "").toLowerCase();
  return ({
    html: "#ea580c", js: "#ca8a04", jsx: "#22d3ee", ts: "#2563eb", tsx: "#2563eb",
    css: "#2563eb", json: "#64748b", pdf: "#dc2626", doc: "#2563eb", docx: "#2563eb",
    xls: "#16a34a", xlsx: "#16a34a", png: "#8b5cf6", jpg: "#8b5cf6", jpeg: "#8b5cf6",
    gif: "#8b5cf6", webp: "#8b5cf6", txt: "#64748b", md: "#64748b", py: "#16a34a",
    java: "#ea580c", sql: "#0891b2", sh: "#334155", go: "#0891b2", php: "#7c3aed",
  } as Record<string, string>)[e] || "#64748b";
}

interface ObDoc { id: string; name: string; content: string; meta?: string }

export function getObDocs(): GalleryFile[] {
  try {
    return (JSON.parse(localStorage.getItem("ob_docs") || "[]") as ObDoc[]).map((d) => ({
      id: "ob-" + d.id, name: d.name || "documento", cat: "doc" as const,
      content: d.content || "", date: d.meta || todayStr(),
    }));
  } catch { return []; }
}

export function getVcDocs(): GalleryFile[] {
  try {
    return (JSON.parse(localStorage.getItem("vc_docs") || "[]") as ObDoc[]).map((d) => ({
      id: "vc-" + d.id, name: d.name || "arquivo", cat: "final" as const,
      content: d.content || "", date: d.meta || todayStr(),
    }));
  } catch { return []; }
}

export function removeStoredDocs(ids: string[]): void {
  try {
    const docs = JSON.parse(localStorage.getItem("ob_docs") || "[]") as ObDoc[];
    const raw = ids.map((id) => id.replace(/^ob-/, ""));
    localStorage.setItem("ob_docs", JSON.stringify(docs.filter((d) => !raw.includes(String(d.id)))));
  } catch { /* armazenamento corrompido */ }
}

export function removeConfirmedDocs(ids: string[]): void {
  try {
    const docs = JSON.parse(localStorage.getItem("vc_docs") || "[]") as ObDoc[];
    const raw = ids.map((id) => id.replace(/^vc-/, ""));
    localStorage.setItem("vc_docs", JSON.stringify(docs.filter((d) => !raw.includes(String(d.id)))));
  } catch { /* armazenamento corrompido */ }
}

export const protoFiles = (protos: Proto[]): GalleryFile[] =>
  protos.map((p) => ({ id: p.id, name: p.name, cat: "proto", content: p.code, date: todayStr() }));

export const chatFiles = (convs: Conv[]): GalleryFile[] =>
  convs.map((c) => ({
    id: "chat-" + c.id, name: (c.title || "Chat") + ".chat", cat: "chats",
    content: c.messages.map((m) => m.content).join("\n"),
    date: new Date(c.createdAt).toLocaleDateString("pt-BR"), _msgs: c.messages,
  }));

export const trashFiles = (trash: DeletedConv[]): GalleryFile[] =>
  trash.map((c) => ({
    id: "trash-" + c.id, name: (c.title || "Chat") + ".chat", cat: "trash",
    content: c.messages.map((m) => m.content).join("\n"),
    date: new Date(c.deletedAt).toLocaleDateString("pt-BR"), _msgs: c.messages,
  }));

export const likedFiles = (liked: LikedMsg[]): GalleryFile[] =>
  liked.map((l) => ({
    id: "like-" + l.id,
    name: (l.content.slice(0, 34).replace(/\n/g, " ").trim() || "mensagem") + ".md",
    cat: "liked", content: l.content,
    date: new Date(l.savedAt).toLocaleDateString("pt-BR"), _liked: l,
  }));

/** Arquivos anexados dentro das conversas, inclusive as que foram apagadas. */
export function attachmentFiles(convs: Conv[], cat: "doc" | "trash" = "doc"): GalleryFile[] {
  const out: GalleryFile[] = [];
  for (const c of convs)
    for (const m of c.messages)
      for (const a of m.attachments || [])
        out.push({
          id: `att-${cat}-${a.id}`,
          name: cat === "trash" ? `${a.name} · ${c.title}` : a.name,
          cat,
          content: a.content, date: new Date(m.ts).toLocaleDateString("pt-BR"),
          dataUrl: a.dataUrl, assetId: a.assetId,
        });
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function printDoc(inner: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title><style>
     body{font-family:Inter,system-ui,sans-serif;max-width:820px;margin:40px auto;padding:20px;color:#2b2b2b;background:#faf9f6}
     h2{margin-bottom:22px;font-size:20px}
     pre{white-space:pre-wrap;font-family:'Fira Code',monospace;font-size:13px}
     </style></head><body>${inner}</body></html>`
  );
  w.document.close();
}

function chatHtml(name: string, msgs: Msg[]) {
  const rows = msgs.filter((m) => !m.meta).map((m) =>
    `<div style="margin-bottom:14px;padding:12px 14px;background:${m.role === "user" ? "#f0ede5" : "#fff"};border:1px solid rgba(0,0,0,.06);border-radius:10px">
      <strong style="font-size:12px;color:${m.role === "user" ? "#0d1b2a" : "#c9a227"}">${m.role === "user" ? "Você" : "Bobby"}</strong>
      <span style="font-size:11px;color:#999;margin-left:6px">${m.time}</span>
      <pre style="margin-top:8px">${esc(m.content)}</pre>
    </div>`
  ).join("");
  return `<h2>${esc(name)}</h2>${rows || "<p style='color:#999'>Conversa vazia.</p>"}`;
}

export async function openInTab(f: GalleryFile): Promise<void> {
  if (f._msgs) { printDoc(chatHtml(f.name, f._msgs), f.name); return; }
  if (f.assetId && /\.(pdf|png|jpe?g|gif|webp)$/i.test(f.name)) {
    const w = window.open("", "_blank");
    const blob = await getAsset(f.assetId);
    if (blob && w) {
      const url = URL.createObjectURL(blob);
      w.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else if (w) {
      w.document.write("<p>O binário deste arquivo não está mais disponível no navegador.</p>");
      w.document.close();
    }
    return;
  }
  if (f.dataUrl) { const w = window.open("", "_blank"); w?.document.write(`<img src="${f.dataUrl}" style="max-width:100%">`); w?.document.close(); return; }
  if (f.cat === "liked") {
    printDoc(
      `<h2>Mensagem curtida</h2><div style="padding:16px;background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:12px"><pre>${esc(f.content)}</pre></div>
       <p style="margin-top:14px;font-size:12px;color:#999">Origem: ${esc(f._liked?.convTitle || "-")} · ${f.date}</p>`,
      f.name
    );
    return;
  }
  if (/\.html?$/i.test(f.name)) {
    const w = window.open("", "_blank");
    if (w) { w.document.write(f.content); w.document.close(); }
    return;
  }
  printDoc(`<h2>${esc(f.name)}</h2><pre>${esc(f.content)}</pre>`, f.name);
}

export function confirmProto(p: Proto): void {
  try {
    const arr = JSON.parse(localStorage.getItem("vc_docs") || "[]") as ObDoc[];
    // Dedup por id: protótipos homônimos continuam independentes.
    if (!arr.some((d) => d.id === p.id)) arr.push({ id: p.id, name: p.name, content: p.code, meta: todayStr() });
    localStorage.setItem("vc_docs", JSON.stringify(arr));
  } catch { /* noop */ }
}
