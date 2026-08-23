/* ══════════════════════════════════════════════════════════════
   CONTEXTOS — catalogação semântica das mensagens
   ──────────────────────────────────────────────────────────────
   Toda mensagem recebe um contexto assim que chega. A resposta
   herda o contexto da pergunta, então o par fica no mesmo trilho.
   Filtrar por contexto recorta o prompt: tudo antes do clique
   mantém o mesmo assunto; o que vier depois pode mudar — e a
   pessoa percebe a mudança acontecendo.
   ══════════════════════════════════════════════════════════════ */

export type ContextId =
  | "chat" | "perfil" | "projetos" | "codigo" | "arquitetura"
  | "ia" | "design" | "documento" | "imagem" | "web"
  | "dados" | "config" | "carreira" | "ajuda" | "seguranca";

export interface ContextDef {
  id: ContextId;
  label: string;
  /** Nome do ícone lucide usado no marcador. */
  icon: string;
  color: string;
  desc: string;
  kws: string[];
}

export const CONTEXTS: ContextDef[] = [
  {
    id: "chat", label: "Bate-papo", icon: "MessageCircle", color: "#8b7aa3",
    desc: "Conversa normal, sem consulta à base",
    kws: ["oi", "olá", "tudo bem", "bom dia", "boa tarde", "boa noite", "valeu", "obrigado", "tchau", "piada", "engraçado", "kkk", "haha"],
  },
  {
    id: "perfil", label: "Sobre o Marcos", icon: "UserRound", color: "#7c3aed",
    desc: "Perfil, trajetória e forma de trabalhar",
    kws: ["marcos", "marcão", "você quem", "quem é", "sobre ele", "autor", "criador", "dono", "bio", "trajetória", "experiência"],
  },
  {
    id: "projetos", label: "Projetos", icon: "LayoutGrid", color: "#2563eb",
    desc: "Cases, produtos e portfólio",
    kws: ["projeto", "portfólio", "portfolio", "case", "trabalho", "produto", "fez", "construiu", "criou", "desenvolveu", "readme"],
  },
  {
    id: "codigo", label: "Código", icon: "Code2", color: "#ca8a04",
    desc: "Programação, snippets e protótipos",
    kws: ["código", "codigo", "função", "funcao", "script", "bug", "erro", "javascript", "python", "react", "html", "css", "typescript", "protótipo", "prototipo", "componente", "api rest"],
  },
  {
    id: "arquitetura", label: "Arquitetura", icon: "Boxes", color: "#0891b2",
    desc: "Estrutura do sistema e decisões técnicas",
    kws: ["arquitetura", "estrutura", "como funciona", "pipeline", "fluxo", "sistema", "nexus", "renderlab", "gateway", "backend", "servidor", "integra"],
  },
  {
    id: "ia", label: "IA & Modelos", icon: "Sparkles", color: "#a78bfa",
    desc: "Modelos, orquestração e IA generativa",
    kws: ["ia", "inteligência artificial", "modelo", "llm", "gpt", "claude", "gemini", "prompt", "orquestra", "machine learning", "agente", "generativa"],
  },
  {
    id: "design", label: "Design & UI", icon: "Palette", color: "#ec4899",
    desc: "Interface, tema e experiência",
    kws: ["design", "layout", "tema", "cor", "interface", "ui", "ux", "visual", "bonito", "animação", "css", "fonte", "uva", "creme"],
  },
  {
    id: "documento", label: "Documento", icon: "FileText", color: "#16a34a",
    desc: "Arquivos enviados e transcrições",
    kws: ["documento", "arquivo", "pdf", "anexo", "planilha", "texto", "transcri", "baixar", "download"],
  },
  {
    id: "imagem", label: "Imagem", icon: "Image", color: "#f97316",
    desc: "Leitura e análise visual",
    kws: ["imagem", "foto", "print", "screenshot", "figura", "visão", "visao", "enxerga", "vê isso", "captura"],
  },
  {
    id: "web", label: "Web & Links", icon: "Globe", color: "#06b6d4",
    desc: "Páginas mapeadas e referências externas",
    kws: ["site", "link", "url", "página", "pagina", "web", "http", "domínio", "github.com", "acessa"],
  },
  {
    id: "dados", label: "Base & RAG", icon: "Database", color: "#7c3aed",
    desc: "Conhecimento, embeddings e recuperação",
    kws: ["rag", "base de conhecimento", "embedding", "vetor", "indexar", "injetar", "similaridade", "retrieval", "chunk", "memória"],
  },
  {
    id: "config", label: "Configuração", icon: "Settings2", color: "#64748b",
    desc: "Skills, chaves e ajustes do chat",
    kws: ["configurar", "configuração", "skill", "ativa", "desativa", "liga", "desliga", "ajuste", "api key", "chave", "preferência", "abre o", "abre a"],
  },
  {
    id: "carreira", label: "Oportunidade", icon: "Briefcase", color: "#eab308",
    desc: "Recrutamento, vagas e contato",
    kws: ["vaga", "recrut", "contrat", "currículo", "curriculo", "entrevista", "salário", "freelance", "disponível", "linkedin", "contato", "orçamento"],
  },
  {
    id: "ajuda", label: "Ajuda", icon: "LifeBuoy", color: "#10b981",
    desc: "Dúvidas de uso e orientação",
    kws: ["ajuda", "como faço", "como usar", "não consigo", "nao consigo", "dúvida", "duvida", "tutorial", "explica como", "passo a passo", "onde fica"],
  },
  {
    id: "seguranca", label: "Segurança", icon: "ShieldCheck", color: "#e11d48",
    desc: "Filtro, moderação e integridade",
    kws: ["sentinela", "segurança", "seguranca", "filtro", "bloque", "injection", "privacidade", "proteção", "firewall", "moderação"],
  },
];

export const CTX = Object.fromEntries(CONTEXTS.map((c) => [c.id, c])) as Record<ContextId, ContextDef>;

const strip = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export interface ClassifyHints {
  hasAttachment?: boolean;
  attachmentKind?: "image" | "pdf" | "code" | "text";
  hasLink?: boolean;
  usedRag?: boolean;
  blocked?: boolean;
  isTool?: boolean;
}

/**
 * Classifica a mensagem. Sinais estruturais (anexo, link, bloqueio)
 * têm prioridade sobre palavra-chave, porque são fato e não indício.
 */
export function classify(text: string, hints: ClassifyHints = {}): ContextId {
  if (hints.blocked) return "seguranca";
  if (hints.isTool) return "config";
  if (hints.attachmentKind === "image") return "imagem";
  if (hints.attachmentKind === "pdf" || hints.attachmentKind === "text") return "documento";
  if (hints.attachmentKind === "code") return "codigo";
  if (hints.hasLink) return "web";

  const s = strip(text);
  if (!s.trim()) return hints.hasAttachment ? "documento" : "chat";

  let best: ContextId = "chat";
  let bestScore = 0;

  for (const c of CONTEXTS) {
    let score = 0;
    for (const kw of c.kws) {
      const k = strip(kw);
      if (!s.includes(k)) continue;
      // Termos longos são mais específicos, então pesam mais.
      score += k.length > 8 ? 3 : k.length > 4 ? 2 : 1;
    }
    if (score > bestScore) { bestScore = score; best = c.id; }
  }

  // Sem sinal claro: se houve recuperação na base, é assunto de conteúdo.
  if (bestScore === 0) return hints.usedRag ? "projetos" : "chat";
  return best;
}

/** Etiqueta curta para quando a resposta veio só do RAG, sem modelo. */
export const RAG_ONLY_LABEL = "recuperação direta";
