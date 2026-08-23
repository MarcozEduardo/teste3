/* ══════════════════════════════════════════════════════════════
   QUARENTENA DE CÓDIGO — o Sentinela não dorme
   ──────────────────────────────────────────────────────────────
   Código colado nunca entra direto. Fica retido, o usuário vê o
   laudo e precisa assinar a liberação. Negou uma vez, fica
   bloqueado para sempre naquele anexo.
   ══════════════════════════════════════════════════════════════ */

export type Verdict = "quarantine" | "clean";
export type SealState = "held" | "released" | "denied";

export interface CodeRisk {
  id: string;
  label: string;
  detail: string;
  severity: "alta" | "média" | "baixa";
}

/** Padrões que acendem o alerta. Não é antivírus: é triagem. */
const SIGNATURES: { id: string; label: string; detail: string; severity: CodeRisk["severity"]; re: RegExp }[] = [
  { id: "eval", label: "Execução dinâmica", detail: "Uso de eval ou Function() permite rodar texto como código em tempo real.", severity: "alta", re: /\beval\s*\(|new\s+Function\s*\(/ },
  { id: "net", label: "Chamada de rede", detail: "O trecho tenta enviar ou buscar dados fora desta página.", severity: "alta", re: /\b(fetch|XMLHttpRequest|WebSocket|navigator\.sendBeacon)\s*\(/ },
  { id: "storage", label: "Acesso ao armazenamento", detail: "Leitura ou escrita em localStorage, cookies ou IndexedDB.", severity: "alta", re: /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/ },
  { id: "dom", label: "Injeção no documento", detail: "Escrita direta de HTML, caminho clássico de XSS.", severity: "alta", re: /\b(innerHTML|outerHTML|document\.write|insertAdjacentHTML)\b/ },
  { id: "shell", label: "Comando de sistema", detail: "Instrução de terminal que altera a máquina de quem executar.", severity: "alta", re: /\b(rm\s+-rf|sudo\s|chmod\s+777|mkfs|dd\s+if=|:\(\)\{)/ },
  { id: "proc", label: "Processo do sistema", detail: "Acesso a processos, sistema de arquivos ou execução externa.", severity: "alta", re: /\b(child_process|subprocess|os\.system|exec\s*\(|require\s*\(\s*['"]fs['"])/ },
  { id: "obf", label: "Conteúdo ofuscado", detail: "Trecho codificado em base64 ou hexadecimal, comum para esconder intenção.", severity: "média", re: /\b(atob|btoa|fromCharCode|unescape)\s*\(|\\x[0-9a-f]{2}\\x[0-9a-f]{2}/i },
  { id: "crypto", label: "Chave ou credencial", detail: "Aparenta conter chave de API, token ou senha em texto puro.", severity: "média", re: /\b(api[_-]?key|secret|password|token|bearer)\s*[:=]\s*['"][^'"]{8,}/i },
  { id: "redirect", label: "Redirecionamento", detail: "Muda o endereço da página ou abre destino externo.", severity: "média", re: /\b(location\.(href|replace|assign)|window\.open)\s*[=(]/ },
  { id: "timer", label: "Execução adiada", detail: "Agenda código para rodar depois, possivelmente em laço.", severity: "baixa", re: /\b(setTimeout|setInterval)\s*\(\s*['"]/ },
];

export interface Scan {
  verdict: Verdict;
  risks: CodeRisk[];
  lines: number;
  chars: number;
  /** Protocolo do laudo, para o documento oficial. */
  protocol: string;
}

export function scanCode(code: string, lang: string): Scan {
  const risks: CodeRisk[] = [];
  for (const s of SIGNATURES) {
    if (s.re.test(code)) risks.push({ id: s.id, label: s.label, detail: s.detail, severity: s.severity });
  }
  // Todo código colado passa pela quarentena, mesmo sem assinatura:
  // a triagem é preventiva, não reativa.
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return {
    verdict: "quarantine",
    risks,
    lines: code.split("\n").length,
    chars: code.length,
    protocol: `STL-${lang.toUpperCase().slice(0, 3)}-${stamp}`,
  };
}

export function riskLevel(risks: CodeRisk[]): "alta" | "média" | "baixa" | "nenhuma" {
  if (!risks.length) return "nenhuma";
  if (risks.some((r) => r.severity === "alta")) return "alta";
  if (risks.some((r) => r.severity === "média")) return "média";
  return "baixa";
}

/** Texto do laudo oficial exibido no documento carimbado. */
export function laudoText(scan: Scan, lang: string): string {
  const nivel = riskLevel(scan.risks);
  return `A Sentinela interceptou um bloco de código em ${lang.toUpperCase()} com ${scan.lines} linha(s) e ${scan.chars.toLocaleString("pt-BR")} caractere(s).

Todo algoritmo colado nesta interface é retido antes de qualquer leitura ou execução. Não se trata de desconfiança do remetente: é procedimento padrão. Código em texto livre é o vetor mais comum de injeção, e a política do Render Nexus é reter primeiro e perguntar depois.

Nível de atenção apurado: ${nivel.toUpperCase()}.

Enquanto este laudo não for assinado, o conteúdo permanece isolado: o Bobby não lê, o RAG não indexa e nenhum motor externo recebe o trecho. A liberação é um ato do usuário e fica registrada no contexto da conversa.`;
}
