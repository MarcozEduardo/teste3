/* ══════════════════════════════════════════════════════════════
   TOOLS — funções que a IA pode executar na interface
   ──────────────────────────────────────────────────────────────
   Cada tool tem documentação legível (que entra no RAG) e um
   gatilho por linguagem natural. O executor real é injetado pelo
   store, então esta camada não conhece React.
   ══════════════════════════════════════════════════════════════ */

export type ToolId =
  | "new_chat" | "rename_chat" | "open_history" | "open_gallery"
  | "open_rag" | "open_skills" | "open_apikey" | "expand" | "collapse"
  | "toggle_skill" | "clear_chat" | "set_layout";

export interface ToolDef {
  id: ToolId;
  name: string;
  /** Documentação que vai para a base de conhecimento. */
  doc: string;
  /** Frases que disparam a ação. */
  triggers: RegExp[];
  /** Extrai um argumento livre da frase (ex.: novo nome do chat). */
  arg?: (text: string) => string | undefined;
}

const afterKeyword = (text: string, kws: string[]): string | undefined => {
  for (const k of kws) {
    const i = text.toLowerCase().indexOf(k);
    if (i !== -1) {
      const rest = text.slice(i + k.length).replace(/^[\s:—-]+/, "").replace(/^["']|["']$/g, "").trim();
      if (rest) return rest.slice(0, 60);
    }
  }
  return undefined;
};

export const TOOLS: ToolDef[] = [
  {
    id: "new_chat",
    name: "Abrir novo chat",
    doc: "Cria uma conversa nova e salva a atual no histórico. Pode ser pedido com \"abre um novo chat\", \"começa outra conversa\" ou \"limpa e começa de novo\". O chat anterior não é perdido: fica no painel esquerdo.",
    triggers: [/\b(nov[ao]|outr[ao])\s+(chat|conversa|sess[ãa]o)\b/i, /\bcome[çc]ar?\s+(de novo|outra|nova)\b/i, /\babre?\s+(um\s+)?(chat|conversa)\b/i],
  },
  {
    id: "rename_chat",
    name: "Renomear a conversa",
    doc: "Troca o título da sessão atual, exibido no topo do chat e no histórico. Pode ser pedido com \"renomeia o chat para X\", \"muda o nome da conversa para X\" ou \"chama essa sessão de X\".",
    triggers: [/\b(renomei|renomear|muda[r]?\s+o\s+nome|troca[r]?\s+o\s+nome|chama[r]?\s+ess[ae])\b/i],
    arg: (t) => afterKeyword(t, [" para ", " pra ", " de ", " como "]),
  },
  {
    id: "open_history",
    name: "Abrir o histórico de conversas",
    doc: "Abre o painel esquerdo com a lista de conversas, busca por título e por conteúdo, seleção múltipla e exclusão. Pode ser pedido com \"abre o histórico\", \"mostra minhas conversas\" ou \"abre o menu da esquerda\".",
    triggers: [/\b(hist[óo]rico|minhas conversas|painel (da )?esquerd|menu (da )?esquerd)\b/i],
  },
  {
    id: "open_gallery",
    name: "Abrir a galeria de arquivos",
    doc: "Abre a GalleryBob no painel direito, com as pastas Documentos, DEV Protótipos, DEV Confirmados, Mensagens Curtidas, Chats e Chats Deletados. Pode ser pedido com \"abre a galeria\", \"mostra os arquivos\" ou \"abre o menu da direita\".",
    triggers: [/\b(galeria|gallery|meus arquivos|mostra os arquivos|painel (da )?direit|menu (da )?direit)\b/i],
  },
  {
    id: "open_rag",
    name: "Abrir a Base de Conhecimento",
    doc: "Abre a janela de RAG e embeddings, onde se injeta conteúdo, configura o provedor de vetores, edita o JSON da base e testa o retrieval. Pode ser pedido com \"abre a base de conhecimento\", \"configurar o RAG\" ou \"quero injetar conteúdo\".",
    triggers: [/\b(base de conhecimento|configurar? o rag|abrir? o rag|injetar conte[úu]do|embeddings?)\b/i],
  },
  {
    id: "open_skills",
    name: "Abrir o RenderLab",
    doc: "Abre o painel de skills e motor, onde cada capacidade pode ser ligada ou desligada. Pode ser pedido com \"abre as skills\", \"abre o RenderLab\" ou \"quero ver as configurações do motor\".",
    triggers: [/\b(skills?|renderlab|render lab|configura[çc][õo]es do motor|painel do motor)\b/i],
  },
  {
    id: "open_apikey",
    name: "Abrir o teste de API key",
    doc: "Abre a janela para colar e testar a chave do Gemini, usada pela skill de visão. A chave fica apenas no navegador. Pode ser pedido com \"abre a api key\" ou \"quero testar minha chave\".",
    triggers: [/\b(api ?key|chave (de|da) api|testar (minha )?chave)\b/i],
  },
  {
    id: "expand",
    name: "Expandir o chat",
    doc: "Sai do modo widget flutuante e ocupa a tela inteira. Pode ser pedido com \"expande o chat\" ou \"abre em tela cheia\".",
    triggers: [/\b(expandir?|expande|tela cheia|maximiza[r]?)\b/i],
  },
  {
    id: "collapse",
    name: "Voltar ao modo widget",
    doc: "Retorna o chat ao balão flutuante no canto da tela, liberando a página atrás. Pode ser pedido com \"minimiza\" ou \"volta pro widget\".",
    triggers: [/\b(minimiza[r]?|volta[r]? (pro|para o) (widget|bal[ãa]o)|modo widget)\b/i],
  },
  {
    id: "clear_chat",
    name: "Limpar as mensagens da conversa",
    doc: "Apaga as mensagens da sessão atual sem excluir a conversa do histórico. Pode ser pedido com \"limpa o chat\" ou \"apaga as mensagens\".",
    triggers: [/\b(limpa[r]? (o )?(chat|conversa|mensagens)|apaga[r]? as mensagens)\b/i],
  },
  {
    id: "toggle_skill",
    name: "Ligar ou desligar uma skill",
    doc: "Ativa ou desativa uma capacidade específica: rag, sentinela, metadados, links, doccard, pdf, visão, protótipos, humor ou turbo. Pode ser pedido com \"desliga o sentinela\", \"ativa o turbo\" ou \"desativa o RAG\".",
    triggers: [/\b(liga[r]?|ativa[r]?|desliga[r]?|desativa[r]?)\s+(o|a)?\s*(rag|sentinela|metadados?|links?|doccard|card de documento|pdf|vis[ãa]o|prot[óo]tipos?|humor|turbo)\b/i],
  },
  {
    id: "set_layout",
    name: "Trocar o layout da tela",
    doc: "Alterna entre fullscreen, noventa por cento e centered no modo expandido. Pode ser pedido com \"muda pro layout 90\" ou \"deixa centralizado\".",
    triggers: [/\b(layout|fullscreen|tela inteira|centraliz|90%|noventa)\b/i],
  },
];

export interface ToolMatch { id: ToolId; arg?: string; extra?: string }

/** Detecta intenção de ação numa mensagem do usuário. */
export function matchTool(text: string): ToolMatch | null {
  const t = text.trim();
  if (t.length > 160) return null;

  // Só age se soar como comando, não como pergunta sobre o assunto.
  const isQuestion = /^(o que|oque|como|por que|porque|quando|quem|qual|onde|explica|me fala|conta)\b/i.test(t) || /\?$/.test(t);

  for (const tool of TOOLS) {
    if (!tool.triggers.some((r) => r.test(t))) continue;
    if (isQuestion && tool.id !== "rename_chat") return null;

    if (tool.id === "toggle_skill") {
      const m = t.match(/\b(liga[r]?|ativa[r]?|desliga[r]?|desativa[r]?)\s+(?:o|a)?\s*(rag|sentinela|metadados?|links?|doccard|card de documento|pdf|vis[ãa]o|prot[óo]tipos?|humor|turbo)\b/i);
      if (!m) return null;
      const on = /^(liga|ativa)/i.test(m[1]);
      const raw = m[2].toLowerCase();
      const map: Record<string, string> = {
        rag: "rag", sentinela: "sentinela", metadado: "metadata", metadados: "metadata",
        link: "links", links: "links", doccard: "doccard", "card de documento": "doccard",
        pdf: "pdf", visao: "vision", "visão": "vision", prototipo: "proto", "protótipo": "proto",
        prototipos: "proto", "protótipos": "proto", humor: "humor", turbo: "turbo",
      };
      const skill = map[raw] || map[raw.replace(/s$/, "")];
      if (!skill) return null;
      return { id: "toggle_skill", arg: skill, extra: on ? "on" : "off" };
    }

    if (tool.id === "set_layout") {
      const layout = /90|noventa/.test(t) ? "90" : /centraliz|centered/i.test(t) ? "centered" : "fullscreen";
      return { id: "set_layout", arg: layout };
    }

    return { id: tool.id, arg: tool.arg?.(t) };
  }
  return null;
}

/** Documentação das tools em texto — indexada no RAG. */
export function toolsDoc(): string {
  return TOOLS.map((t) => `${t.name}: ${t.doc}`).join("\n\n");
}
