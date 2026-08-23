import { FileText, FileCode, Image, File } from "lucide-react";
import { extColor } from "../lib/gallery";

export default function FileIcon({ name, size = 14 }: { name: string; size?: number }) {
  const e = (name.split(".").pop() || "").toLowerCase();
  const color = extColor(name);
  if (["html", "js", "ts", "css", "json"].includes(e)) return <FileCode size={size} color={color} strokeWidth={2} />;
  if (["png", "jpg", "jpeg", "gif"].includes(e)) return <Image size={size} color={color} strokeWidth={2} />;
  if (["txt", "md", "doc", "docx", "pdf"].includes(e)) return <FileText size={size} color={color} strokeWidth={2} />;
  return <File size={size} color={color} strokeWidth={2} />;
}
