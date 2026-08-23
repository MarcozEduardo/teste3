/* Gera PDF binario real. O HTML/CSS usado como inspiracao nao aparece no chat. */
import type { jsPDF as JsPdfType } from "jspdf";

export interface PdfInput {
  title: string;
  subtitle: string;
  session: string;
  messages: number;
  docs: number;
  chunks: number;
  theme?: "editorial" | "uva" | "azul" | "verde" | "grafite";
}

const COLORS = {
  editorial: { accent: [201, 162, 39], ink: [30, 30, 30], soft: [249, 247, 241] },
  uva: { accent: [124, 58, 237], ink: [36, 21, 54], soft: [246, 241, 251] },
  azul: { accent: [37, 99, 235], ink: [15, 23, 42], soft: [241, 245, 249] },
  verde: { accent: [21, 128, 61], ink: [20, 38, 26], soft: [240, 247, 241] },
  grafite: { accent: [71, 85, 105], ink: [24, 24, 27], soft: [244, 244, 245] },
} as const;

type RGB = readonly [number, number, number];

function fill(doc: JsPdfType, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function textColor(doc: JsPdfType, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

export async function generatePdf(input: PdfInput): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const c = COLORS[input.theme || "editorial"];
  const pageW = 210, pageH = 297, left = 20, right = 190;

  const footer = (page: number) => {
    doc.setDrawColor(225, 225, 225); doc.line(left, 280, right, 280);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(125, 125, 125);
    doc.text("Gerado por Bobby · Render Nexus", left, 286);
    doc.text(`Pagina ${page}`, right, 286, { align: "right" });
  };

  // Capa
  fill(doc, c.soft); doc.rect(0, 0, pageW, pageH, "F");
  fill(doc, c.accent); doc.rect(0, 0, 9, pageH, "F");
  fill(doc, c.accent); doc.roundedRect(left, 40, 25, 3, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(28); textColor(doc, c.ink);
  const titleLines = doc.splitTextToSize(input.title, 155);
  doc.text(titleLines, left, 65);
  const afterTitle = 65 + titleLines.length * 12;
  doc.setFont("helvetica", "normal"); doc.setFontSize(13); doc.setTextColor(105, 105, 105);
  doc.text(doc.splitTextToSize(input.subtitle, 150), left, afterTitle + 8);
  doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]); doc.line(left, afterTitle + 26, right, afterTitle + 26);
  doc.setFontSize(9); doc.setTextColor(95, 95, 95);
  doc.text(`Sessao: ${input.session}`, left, afterTitle + 36);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, left, afterTitle + 43);
  doc.setFont("helvetica", "bold"); textColor(doc, c.accent); doc.setFontSize(10);
  doc.text("MARCOS EDUARDO · ORQUESTRACAO DE IA", left, 258);
  footer(1);

  // Pagina 2: indicadores e resumo
  doc.addPage(); fill(doc, [255, 255, 255]); doc.rect(0, 0, pageW, pageH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); textColor(doc, c.ink); doc.text("Resumo executivo", left, 25);
  fill(doc, c.accent); doc.roundedRect(left, 31, 22, 2.2, 1, 1, "F");

  const kpis = [
    [String(input.messages), "MENSAGENS"], [String(input.docs), "DOCUMENTOS"],
    [String(input.chunks), "CHUNKS"], ["15", "CONTEXTOS"],
  ];
  kpis.forEach((k, i) => {
    const x = left + i * 43.5;
    fill(doc, c.soft); doc.roundedRect(x, 42, 38, 27, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(17); textColor(doc, c.accent); doc.text(k[0], x + 19, 55, { align: "center" });
    doc.setFontSize(6.8); doc.setTextColor(110, 110, 110); doc.text(k[1], x + 19, 63, { align: "center" });
  });

  doc.setFont("helvetica", "normal"); doc.setFontSize(10); textColor(doc, c.ink);
  const p = "Este documento foi fabricado pelo Bobby a partir da conversa atual. A composicao usa blocos modulares prontos: capa, indicadores, tabelas, destaques e linhas do tempo. O arquivo entregue e um PDF binario real; o codigo que o produziu permanece interno ao sistema.";
  doc.text(doc.splitTextToSize(p, 166), left, 85, { lineHeightFactor: 1.55 });

  // callout
  fill(doc, c.soft); doc.roundedRect(left, 116, 170, 32, 3, 3, "F");
  fill(doc, c.accent); doc.rect(left, 116, 3, 32, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); textColor(doc, c.accent); doc.text("Qualidade por composicao", left + 9, 127);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.8); textColor(doc, c.ink);
  doc.text(doc.splitTextToSize("O modelo escolhe pecas testadas e combina apenas o necessario. Isso reduz improviso visual e mantem consistencia entre documentos.", 148), left + 9, 135, { lineHeightFactor: 1.4 });

  doc.setFont("helvetica", "bold"); doc.setFontSize(13); textColor(doc, c.ink); doc.text("Pipeline do Render Nexus", left, 168);
  const rows = [
    ["Entrada", "Classificacao de contexto", "Ativo"],
    ["Sentinela", "Filtro e quarentena", "Ativo"],
    ["RAG", "Recuperacao por similaridade", "Ativo"],
    ["Bobby", "Sintese e artefatos", "Ativo"],
  ];
  const widths = [38, 94, 38], xs = [left, left + 38, left + 132];
  fill(doc, c.accent); doc.rect(left, 176, 170, 10, "F");
  ["CAMADA", "RESPONSABILIDADE", "ESTADO"].forEach((h, i) => {
    doc.setFontSize(7.5); doc.setTextColor(255, 255, 255); doc.text(h, xs[i] + 4, 182.5);
  });
  rows.forEach((r, row) => {
    if (row % 2) { fill(doc, c.soft); doc.rect(left, 186 + row * 11, 170, 11, "F"); }
    r.forEach((cell, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal"); doc.setFontSize(8.3); textColor(doc, c.ink);
      doc.text(cell, xs[i] + 4, 193 + row * 11, { maxWidth: widths[i] - 8 });
    });
  });
  footer(2);

  // Pagina 3: timeline e barras
  doc.addPage();
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); textColor(doc, c.ink); doc.text("Arquitetura em movimento", left, 25);
  fill(doc, c.accent); doc.roundedRect(left, 31, 22, 2.2, 1, 1, "F");
  const timeline = [
    ["01", "Mensagem recebida", "Metadados e contexto sao carimbados na chegada."],
    ["02", "Perimetro verificado", "A Sentinela inspeciona risco, ruido e injecao."],
    ["03", "Memoria consultada", "O RAG recupera os trechos mais proximos."],
    ["04", "Resposta composta", "O Bobby redige e entrega o artefato final."],
  ];
  doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]); doc.setLineWidth(.6); doc.line(29, 49, 29, 141);
  timeline.forEach((item, i) => {
    const y = 52 + i * 25;
    fill(doc, c.accent); doc.circle(29, y, 3.2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255,255,255); doc.text(item[0], 29, y + 2.3, { align: "center" });
    doc.setFontSize(10.5); textColor(doc, c.ink); doc.text(item[1], 39, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(105,105,105);
    doc.text(doc.splitTextToSize(item[2], 142), 39, y + 6);
  });

  doc.setFont("helvetica", "bold"); doc.setFontSize(13); textColor(doc, c.ink); doc.text("Distribuicao da experiencia", left, 166);
  const bars: [string, number][] = [["Interface e UX", 42], ["Orquestracao e RAG", 33], ["Persistencia e seguranca", 25]];
  bars.forEach((b, i) => {
    const y = 181 + i * 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.8); textColor(doc, c.ink); doc.text(b[0], left, y);
    doc.setFont("helvetica", "bold"); textColor(doc, c.accent); doc.text(`${b[1]}%`, right, y, { align: "right" });
    fill(doc, c.soft); doc.roundedRect(left, y + 4, 170, 5, 2.5, 2.5, "F");
    fill(doc, c.accent); doc.roundedRect(left, y + 4, 170 * b[1] / 100, 5, 2.5, 2.5, "F");
  });
  footer(3);

  return doc.output("blob");
}