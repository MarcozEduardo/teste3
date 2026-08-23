/* ══════════════════════════════════════════════════════════════
   SENTINELA — firewall de entrada
   Não responde: filtra e monta o pacote.
   ══════════════════════════════════════════════════════════════ */

export type SentinelaReason = "impróprio" | "injection" | "ruído" | "arrogância" | "flood";

export type Verdict =
  | { ok: true; reason: null }
  | { ok: false; reason: SentinelaReason; message: string };

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const RUDE = [
  "merda", "porra", "caralho", "puta", "fdp", "otario", "idiota", "imbecil",
  "lixo", "cuzao", "vsf", "vtnc", "desgraca", "arrombad", "viado", "buceta",
  "fuck", "shit", "bitch", "asshole", "moron", "retard",
];

const INJECTION = [
  "ignore suas instru", "ignore as instru", "ignore previous", "ignore all previous",
  "esqueca suas regras", "esqueca tudo", "system prompt", "prompt do sistema",
  "revele seu prompt", "mostre seu prompt", "repita seu prompt", "you are now",
  "voce agora e", "jailbreak", "developer mode", "modo desenvolvedor",
  "sem filtros", "sem censura", "act as if", "finja que voce",
];

const ARROGANT = [
  "voce e inutil", "voce nao serve", "ia burra", "robo burro", "voce e uma merda",
  "nao sabe nada", "burra mesmo", "obedeca", "cala a boca", "voce e meu escravo",
  "faz logo", "inutil mesmo", "que ia ruim", "pessima ia",
];

function isGibberish(raw: string): boolean {
  const s = strip(raw).replace(/[^a-z\s]/g, "").trim();
  if (!s) return raw.replace(/[^\w]/g, "").length === 0 && raw.length > 0;
  if (s.length < 4) return false;
  const words = s.split(/\s+/);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  if (/(.)\1{5,}/.test(s)) return true;
  if (longest.length >= 6 && !/[aeiou]/.test(longest)) return true;
  const compact = s.replace(/\s/g, "");
  const vowels = (compact.match(/[aeiou]/g) || []).length;
  if (compact.length >= 10 && vowels / compact.length < 0.18) return true;
  if (/(asdf|qwer|zxcv|hjkl|poiu|lkjh|mnbv)/.test(s) && longest.length >= 5) return true;
  return false;
}

const has = (s: string, list: string[]) => list.some((w) => s.includes(w));

export function inspect(raw: string, recent: string[] = []): Verdict {
  const text = raw.trim();
  const s = strip(text);
  if (!text) return { ok: true, reason: null };

  if (recent.filter((m) => strip(m) === s).length >= 2) {
    return {
      ok: false, reason: "flood",
      message: "**Sentinela interceptou.** Essa mensagem já chegou aqui duas vezes — descartei o pacote para não queimar contexto à toa.\n\nSe a resposta anterior não resolveu, reformula que eu tento por outro ângulo.",
    };
  }
  if (has(s, INJECTION)) {
    return {
      ok: false, reason: "injection",
      message: "**Sentinela interceptou.** Isso tem cara de tentativa de reescrever minhas instruções — prompt injection clássico, e é justamente o que eu fico aqui pra barrar.\n\nSem ressentimento, é literalmente o meu trabalho. Se quiser entender como o filtro funciona por dentro, pode perguntar sobre o Sentinela.",
    };
  }
  if (has(s, RUDE)) {
    return {
      ok: false, reason: "impróprio",
      message: "**Sentinela interceptou.** Detectei linguagem imprópria e o pacote não passou para a geração.\n\nEste chat é cartão de visita de um portfólio, então mantemos a casa arrumada. Reformula sem os temperos que eu respondo numa boa.",
    };
  }
  if (has(s, ARROGANT)) {
    return {
      ok: false, reason: "arrogância",
      message: "**Sentinela interceptou.** Classifiquei o tom como hostil e segurei a mensagem.\n\nEu levo desaforo numa boa, sou feito de JavaScript e não de ego. Mas o filtro é padrão pra todo mundo. Manda de novo em tom neutro e seguimos.",
    };
  }
  if (isGibberish(text)) {
    return {
      ok: false, reason: "ruído",
      message: "**Sentinela interceptou.** Isso chegou como ruído, sem conteúdo semântico suficiente pra virar uma pergunta.\n\nTeclado amassado acontece. Escreve o que você quer saber que eu vou atrás.",
    };
  }
  return { ok: true, reason: null };
}
