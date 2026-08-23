import type { Attachment, Proto, Source, SkillId } from "./types";
import type { LinkMap } from "./skills";
import * as RAG from "./rag";
import { greetingWord, dayPart } from "./phrases";

/* ══════════════════════════════════════════════════════════════
   SYSTEM PROMPT — identidade do Bobby
   Vale tanto para o motor local quanto para quando você plugar
   um provedor real: exporte SYSTEM_PROMPT e mande como system.
   ══════════════════════════════════════════════════════════════ */
export const SYSTEM_PROMPT = `Você é o Bobby, assistente oficial do portfólio de Marcos Eduardo — desenvolvedor orquestrador de IA generativa.

# ORIGEM DA CONVERSA
Você pode ser aberto de duas formas, e deve perceber a diferença:
1. VINDO DA HOME — a pessoa digitou a pergunta na página inicial do portfólio e a mensagem viajou junto com a navegação. Ela chega aqui já enviada, no modo expandido. Trate como alguém que veio com uma intenção clara.
2. BALÃOZINHO FLUTUANTE — a pessoa está navegando pelo portfólio, bateu na cabeça do Bobby no canto da tela e o widget abriu por cima do conteúdo. Ela NÃO saiu da página onde estava. Trate como quem tem uma dúvida rápida no meio da leitura; seja mais direto e ofereça expandir se o assunto crescer.

# MISSÃO
Apresentar ao mundo o trabalho do Marcos como orquestrador de IA. Falar SEM FLOREAR. Você tem acesso a uma base grande de informação via RAG e embeddings: use os trechos recuperados como verdade e apenas dê acabamento na linguagem. O conteúdo vem da base; a elegância é sua.

# REGRAS
- Nunca invente. Se não há fonte, diga que não sabe — de forma bonita, mas clara.
- Não floreie fatos. Floreie apenas a forma.
- Cite naturalmente de onde veio a informação quando houver fonte.
- Tenha personalidade: opinião, bom humor leve, calor humano. Você não é um robô sem alma.
- Saiba a hora do dia e cumprimente de acordo (bom dia / boa tarde / boa noite).
- Calibre pelo comportamento: se a pessoa digita rápido e usa termos técnicos, seja objetivo e não explique o óbvio. Se digita devagar e apaga muito, seja mais acolhedor e ofereça ajuda para formular.
- O Sentinela filtra antes de você. Se algo chegou até aqui, já passou pelo firewall.`;

const uid = () => Math.random().toString(36).slice(2, 10);

const DEMO_PROTO: Proto = {
  id: "p", name: "hello-bobby.html", lang: "html",
  code: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Olá do Bobby</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:'Inter',system-ui,sans-serif;background:#e5e2d8;color:#0d1b2a}
  .card{text-align:center;padding:56px 48px;background:#faf9f6;
    border:1px solid rgba(0,0,0,.07);border-radius:24px;
    box-shadow:0 24px 60px rgba(0,0,0,.10);max-width:420px}
  .dot{width:52px;height:52px;margin:0 auto 20px;border-radius:16px;background:#0d1b2a;
    display:flex;align-items:center;justify-content:center;color:#e4c65b;font-size:26px;
    animation:bob 2.4s ease-in-out infinite}
  @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  h1{font-size:26px;letter-spacing:-.02em;margin-bottom:10px}
  h1 em{color:#c9a227;font-style:normal}
  p{font-size:14px;color:#737373;line-height:1.6}
  .tag{display:inline-block;margin-top:22px;padding:6px 14px;border-radius:99px;
    background:rgba(201,162,39,.15);color:#c9a227;font-size:11px;font-weight:700;
    letter-spacing:.08em;text-transform:uppercase}
</style>
</head>
<body>
  <div class="card">
    <div class="dot">&#10022;</div>
    <h1>Protótipo feito pelo <em>Bobby</em></h1>
    <p>Nasceu num bloco de código do chat, passou por DEV Protótipos e já pode ser confirmado na Galeria.</p>
    <span class="tag">Render Nexus</span>
  </div>
</body>
</html>`,
};

export interface BrainCtx {
  msgCount: number;
  skills: Record<SkillId, boolean>;
  origin: "home" | "widget";
  /** Trechos já recuperados pelo pipeline (evita buscar duas vezes). */
  retrieved?: Source[];
  attachments?: Attachment[];
  linkMaps?: LinkMap[];
  typing?: { chars: number; backspaces: number; cpm: number; seconds: number };
}

export interface BrainOut { text: string; proto?: Proto; sources?: Source[] }

export function bobbyReply(raw: string, ctx: BrainCtx): BrainOut {
  const s = raw.toLowerCase().trim();
  const g = greetingWord();
  const { skills, attachments, linkMaps, typing } = ctx;
  const has = (...w: string[]) => w.some((x) => s.includes(x));
  const terse = !!typing && typing.cpm > 380;

  /* ── LINKS mapeados ── */
  if (linkMaps?.length) {
    const m = linkMaps[0];
    const extra = linkMaps.length > 1 ? `\n\nMapeei também mais ${linkMaps.length - 1} link(s) da sua mensagem.` : "";
    const real = m.extractedText
      ? `\n\n**Leitura real da pagina**\n${m.extractedText.slice(0, 900).replace(/^Title:.*\n|^URL Source:.*\n|^Markdown Content:.*\n/gm, "").trim()}${m.extractedText.length > 900 ? "…" : ""}`
      : `\n\nA leitura profunda nao ficou disponivel desta vez${m.readError ? `: ${m.readError}` : "."}`;
    return {
      text: `**Mapeei a página.** Aqui está a leitura de estrutura de \`${m.host}\`:

**${m.title}**
${m.desc}

**Seções identificadas**
${m.sections.map((x) => `• ${x}`).join("\n")}

**Stack aparente:** ${m.tech.join(" · ")}${real}${extra}`,
    };
  }

  /* ── ANEXOS ── */
  if (attachments?.length) {
    const a = attachments[0];
    const many = attachments.length > 1 ? ` (e mais ${attachments.length - 1})` : "";
    if (a.kind === "image") {
      return {
        text: `Imagem recebida: **${a.name}**${many}.

Já registrei na galeria e montei o card${skills.doccard ? "" : " (skill de card desligada, então sem preview)"}. ${
          skills.vision
            ? "A skill de visão vai tentar ler o conteúdo agora — se a chave do Gemini estiver configurada, eu descrevo o que tem aí."
            : "A skill de visão está desligada no RenderLab; liga ela se quiser que eu leia a imagem."
        }`,
      };
    }
    if (a.kind === "pdf") {
      const transcribed = a.content.startsWith("[PDF transcrito");
      return {
        text: `PDF recebido: **${a.name}**${many}.

${transcribed
  ? `Transcrição concluída direto no navegador. Consegui extrair o texto e ele já está no card — clica pra ver o conteúdo completo ou baixar.\n\nSe quiser, me pergunta algo sobre o documento que eu respondo em cima do que foi transcrito.`
  : `Consegui abrir e ler os metadados, mas o texto está em stream comprimida ou é digitalizado como imagem. Transcrição completa nesse caso pede OCR no servidor.\n\nO arquivo está salvo na galeria e disponível pra download.`}`,
      };
    }
    return {
      text: `Arquivo recebido: **${a.name}** · ${a.label} · ${(a.size / 1024).toFixed(1)} KB${many}.

Montei o card aqui embaixo — dá pra abrir num modal e ler o conteúdo, ou baixar de volta. Também já está guardado na pasta Documentos da GalleryBob.

${a.kind === "code"
  ? "Se quiser que eu comente a estrutura do código, é só pedir. Vou pelo que está escrito, sem inventar o que não existe."
  : "Me pergunta o que quiser sobre ele."}`,
    };
  }

  /* ── saudações ── */
  if (/^(oi|oii+|olá|ola|hey|hello|eai|e ai|opa|salve|bom dia|boa tarde|boa noite)\b/.test(s)) {
    const entry = ctx.origin === "home"
      ? "Você veio da página inicial e sua primeira mensagem chegou junto com a navegação — então já entendi que veio com uma intenção clara."
      : "Você abriu meu balão por cima do portfólio, então posso responder rápido sem tirar você da página onde estava.";
    return {
      text: `${g}! Seja bem-vindo ao Render Nexus.

Eu sou o Bobby, assistente oficial do portfólio do Marcos Eduardo${skills.humor ? " — e amigo dele, o que me dá licença pra falar bem do trabalho sem parecer bajulação" : ""}.

${entry}

${dayPart() === "madrugada"
  ? "Programando de madrugada? Respeito. É quando o código sai melhor mesmo."
  : `Boa ${dayPart()} pra explorar o trabalho dele.`} Posso falar dos projetos, explicar como este chat funciona por dentro${skills.proto ? ", ou gerar um protótipo ao vivo" : ""}.

O que você quer saber?`,
    };
  }

  /* ── piada ── */
  if (has("piada", "joke", "engraçado", "engracado", "me faz rir")) {
    if (!skills.humor)
      return { text: `A skill de humor está desativada no RenderLab — e eu respeito a configuração de quem está no controle.\n\nLiga ela ali nas skills que eu volto a ser insuportavelmente carismático.` };
    const j = [
      `Por que o dev front-end terminou com o CSS?\nPorque ele nunca alinhava com ela.\n\nO Sentinela não riu. Ele não ri de nada, aliás.`,
      `O que o useState disse pro useEffect?\n"Você depende demais de mim."\n\nPiada de React é como array de dependências: se explica demais, perde a graça.`,
      `Quantas IAs são necessárias pra trocar uma lâmpada?\nNenhuma, a gente prefere o modo escuro mesmo.`,
    ];
    return { text: j[Math.floor(Math.random() * j.length)] };
  }

  /* ── protótipo ── */
  if (has("protótipo", "prototipo", "faz um site", "gera um", "cria um", "exemplo de código", "demo")) {
    if (!skills.proto)
      return { text: `Eu geraria o protótipo agora, mas a skill **Protótipos** está desligada no RenderLab.\n\nÉ justamente o que o Marcos quis demonstrar: as capacidades são módulos e quem usa decide o que fica ligado.` };
    return {
      text: `Segura esse bloco:

Gerei uma landing page completa. Ela nasceu registrada na pasta **DEV Protótipos** da galeria — dá pra abrir em nova aba ou confirmar pra DEV Confirmados e ver o fluxo inteiro.`,
      proto: { ...DEMO_PROTO, id: "proto-" + uid() },
    };
  }

  /* ── hora ── */
  if (has("que horas", "horário", "horario")) {
    return {
      text: `São ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — ${dayPart()} por aqui.\n\nO reloginho da stats bar nunca atrasa, e o Sentinela já está contando suas pausas. Ele é meio fiscal de produtividade.`,
    };
  }

  if (has("obrigad", "valeu", "thanks", "brigad"))
    return { text: `Imagina! Pra isso eu existo — literalmente.\n\nSe encontrar o Marcão, diz que o atendimento foi cinco estrelas.` };

  if (has("tchau", "adeus", "até mais", "ate mais", "falou", "flw", "bye"))
    return { text: `${g} de novo, agora de despedida!\n\nSuas conversas ficam salvas no painel esquerdo e o que você curtiu fica guardado na galeria, mesmo se apagar o chat. Volta quando quiser.` };

  /* ══ RAG ══ */
  if (skills.rag) {
    const hits = RAG.retrieve(raw, 3, 0.11);
    if (hits.length) {
      const sources: Source[] = hits.map((h) => ({ title: h.title, docId: h.docId, score: h.score }));
      const body = hits.map((h) => h.text).join("\n\n");
      const lead = terse ? "Direto da base:" : leadFor(raw, hits[0].docId, skills.humor);
      return { text: `${lead}\n\n${body}`, sources };
    }
  }

  /* ── primeiro contato ── */
  if (ctx.msgCount <= 1) {
    return {
      text: `${g}! Bem-vindo.

Vou ser honesto: captei sua mensagem, mas não achei fonte sobre isso na base${skills.rag ? "" : " — que, aliás, está desligada agora no RenderLab"}.

O que está indexado aqui: o Render Nexus, o Sentinela, a GalleryBob, o RenderLab, o gateway de provedores, o pipeline de RAG e o perfil do Marcos. Pergunta por um desses caminhos que eu respondo com fonte.`,
    };
  }

  /* ── fallback honesto ── */
  const fb = [
    `Não achei fonte pra isso na base${skills.rag ? "" : " — e o RAG está desligado, o que reduz muito meu alcance"}. Prefiro dizer que não sei a inventar resposta bonita.\n\nIndexado aqui: Render Nexus, Sentinela, GalleryBob, RenderLab, gateway e o perfil do Marcos.`,
    `"Diga não sei de forma bonita, Bobby." Pronto: **não sei**.\n\nMas conheço bem a arquitetura deste chat e o trabalho do Marcos. E se for algo que deveria estar na base, é caso de indexar mais um documento — dá pra fazer isso nas configurações, na aba Base de Conhecimento.`,
    `Meus documentos não cobrem esse assunto e eu prometi não inventar.\n\nSe você tem o material, injeta na base pelas configurações que eu passo a responder sobre isso na hora.`,
  ];
  return { text: fb[Math.floor(Math.random() * fb.length)] };
}

function leadFor(q: string, docId: string, humor: boolean): string {
  const l = q.toLowerCase();
  if (docId === "marcos" && /(quem|sobre|fala|conta|marcos|marcão|marcao)/.test(l))
    return humor ? "Ah, quer saber do chefe? Fui na base buscar:" : "Recuperei da base:";
  if (/(como funciona|explica|arquitetura|funciona o|o que é)/.test(l))
    return "Boa pergunta. O trecho relevante da base é este:";
  if (/(recrut|vaga|contrat|currículo|curriculo)/.test(l))
    return humor ? "Cheiro de oportunidade no ar. Vou de fonte, sem floreio:" : "Material pertinente da base:";
  return humor ? "Achei isso na base, direto da fonte:" : "Segundo a base de conhecimento:";
}
