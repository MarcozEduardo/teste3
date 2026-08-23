# Pulso Eterno

> Sistema de contexto orbital. Depois de uma ação, o assunto não morre:
> vira uma bolha que fica em segundo plano esperando o próximo gatilho.

Arquivo: `src/lib/pulso.ts` · Indicador: `src/components/OrbitBubble.tsx`

---

## A ideia

Chat comum trata cada mensagem como se fosse a primeira. Você abre a galeria,
fala "protótipos", e ele não entende — porque isoladamente essa palavra não é
comando nenhum.

O Pulso Eterno resolve isso mantendo o assunto vivo. Abriu a galeria? A bolha
entra em órbita. Enquanto ela estiver acesa, palavra solta ganha significado
dentro daquele contexto. Passou tempo demais sem menção, a bolha estoura e
tudo volta ao normal.

```
abriu galeria ─→ bolha em órbita (vida 5)
                      │
     "prototipos" ────┤ renova para 5 · abre a pasta
     "quantos tem?" ──┤ renova · conta e responde
     "boa tarde" ─────┤ vida 4
     "e o marcos?" ───┤ vida 3
     ...              │
     vida 0 ──────────→ bolha estoura
```

---

## As dez órbitas

| Órbita | Desperta com | Vida |
|---|---|---|
| `galeria` | pasta, arquivo, documento, quantos, primeiro, terceiro | 5 |
| `cor` | cor, tom, tema, balão, botão, fundo, css | 4 |
| `conversa` | chat, nome, título, renomeia, histórico | 4 |
| `sentinela` | guarda, log, bloqueio, regra, quarentena | 4 |
| `base` | rag, embedding, vetor, chunk, memória | 4 |
| `bobby` | bobby, você, card, identidade, erra | 5 |
| `input` | clipe, anexo, botão, enviar, link | 4 |
| `contexto` | contexto, marcador, carimbo, filtro | 4 |
| `cronometro` | cronômetro, tempo, sessão, zera | 3 |
| `skills` | skill, renderlab, liga, desliga, turbo | 4 |

Cada órbita tem `keeps`, que são os termos que a renovam, e algumas têm `items`,
que são os alvos navegáveis dentro dela.

---

## Resolução por prefixo

A malandragem: dentro da órbita, prefixo de três letras já resolve.

```
"prot"     → DEV Protótipos     (só uma pasta começa assim)
"protot"   → DEV Protótipos     (erro de digitação não atrapalha)
"prottipo" → DEV Protótipos     (idem)
"dev"      → ambíguo            (Protótipos e Confirmados)
"de"       → ambíguo            (Documentos, Protótipos, Confirmados)
"curt"     → Mensagens Curtidas
"lix"      → Lixeira do Chat
```

Quando dá ambiguidade, o Bobby devolve a pergunta em vez de chutar:

> "Mas qual dev? Tem 2 aí, uai: **DEV Protótipos** ou **DEV Confirmados**."

E se a pessoa insistir na ambiguidade três vezes, ele muda o tom:

> "Continua ambíguo, hein. Escolhe uma, ou clica direto na galeria, que é mais rápido."

Isso é o `noteRepeat()` — proteção contra repetir a mesma resposta indefinidamente.

---

## Ritual de execução

Nenhuma ação acontece instantaneamente. Toda execução passa por quatro tempos:

```
1. AVISO      "Opa, agora pera aí!"        · mensagem meta
2. TRABALHO   [spinner] Bobby trabalhando  · 2 segundos
3. CHECK      [✓] Concluído                · o progresso vira check
4. PRONTO     "Pronto! Nome trocado."      · confirmação
```

Implementado em `ritual()` dentro do store. A versão curta, `ritualLite()`,
serve para reações da bolha.

O delay de 2s não é enfeite: sem ele a ação parece automação burra. Com ele,
parece alguém indo fazer.

---

## Falas configuráveis

Arquivo: `src/lib/speech.ts`

Cada ação tem quatro momentos editáveis pelo painel, sem tocar em código:

| Momento | Quando aparece |
|---|---|
| `aviso` | Logo que recebe o pedido |
| `trabalho` | Rótulo da barra de progresso |
| `pronto` | Confirmação final |
| `duvida` | Quando precisa desambiguar |

O marcador `{alvo}` é substituído pelo nome do que foi feito.

```js
speechFor("chat.rename", "pronto")
// → "Pronto! Nome trocado para {alvo}."
// → "Tá na mão: {alvo}."
```

Ações já mapeadas: renomear conversa, nova conversa, abrir galeria, abrir
documentos, trocar cor, abrir Sentinela, zerar cronômetro, e um conjunto
genérico para as demais.

---

## Casos já funcionando

**Contagem com teatro**
> — Quantos arquivos tem na galeria?
> — Vixe, peraí que eu conto… *[contando 1,5s]* São **12 arquivos**. Quer detalhe por pasta?

**Cronômetro com sacanagem honesta**
> — Zera o cronômetro.
> — *[zerando 1,8s]* Zerado! Mas entre nós: o tempo real de casa era **47 min**. Eu só reiniciei o mostrador.

**Cor puxando o resto da aparência**
> — E o balão, dá pra mudar também?
> — Tudo aqui é variável de tema. Balão, borda, fundo, botão. O de enviar eu mexo, mas ele volta sozinho.

---

## Sensor de presença

Diferente do sensor de ausência. Aqui a aba está **aberta e visível**, mas
ninguém mexe. A pessoa está lá, só se distraiu.

| Tempo parado | Reação |
|---|---|
| 100s | "Opa, demorando pra aparecer… deve ter se ocupado aí." |
| 320s | "Já é bastante tempo. Vou dar uma relaxada aqui até você voltar." |

Qualquer movimento — mouse, tecla, clique, scroll — zera o contador.

---

## Roadmap do Pulso

O que está desenhado e ainda não foi construído. Ordem sugerida.

### Órbitas a completar

- [ ] `bobby` — falar do card de identidade injeta o próprio card no chat:
      *"Esse card né? Minha identidade."*
- [ ] `input` — perguntar do clipe desambigua entre os dois:
      *"Qual dos dois? O do lado esquerdo ou o perto do enviar?"*
- [ ] `input` — demonstração animada: o Bobby digita um link na caixa
      sozinho, envia internamente e mostra o card aparecendo
- [ ] `contexto` — explicar o marcador e destacá-lo visualmente
- [ ] `skills` — explicar cada chip ao ser mencionado
- [ ] `conversa` — localizar chat por trecho de mensagem, usando a barra
      de busca em silêncio e devolvendo as opções

### Comportamentos

- [ ] Óculos de explicação: enquanto explica, o botão de enviar vira
      quadrado de cancelar e a caixa fica ocupada
- [ ] Ação demonstrada em vez de descrita — mostrar fazendo
- [ ] "Salva isso pra lembrar depois" → curte a mensagem sozinho
- [ ] Órbita composta: dois assuntos vivos ao mesmo tempo, com prioridade
- [ ] Memória eterna: bolha que atravessa sessões

### Integração com o RAG

- [ ] A órbita ativa filtra a busca vetorial antes de consultar
- [ ] Conteúdo da bolha entra como RAG temporário, junto do filtro de contexto
- [ ] Log de órbita alimenta o painel de lacunas

---

## Catálogo de ações para orbitar

Tudo que tem efeito no sistema deveria ter órbita. Levantamento completo:

**Aparência** — trocar cor, reverter, sugerir, inventar, trocar fonte,
tema uva, tema creme, layout fullscreen, layout 90, layout centered

**Galeria** — abrir janela, cada uma das seis pastas, selecionar, excluir
em lote, restaurar, mover para lixeira, buscar, alternar lista e grade,
paginar, inverter os lados

**Conversa** — nova, renomear, apagar, limpar, buscar no histórico,
selecionar várias, curtir mensagem, editar mensagem, criar branch

**Arquivos** — anexar foto, documento, algoritmo, abrir no olho, baixar,
copiar, indexar no RAG, executar HTML, editar no Monaco, salvar edição

**Sentinela** — abrir posto, ligar regra, desligar regra, calibrar ruído,
calibrar flood, bloquear termo, permitir termo, exportar log, limpar log,
liberar código retido, negar código

**Base** — abrir painel, injetar texto, subir arquivo, testar retrieval,
trocar provedor, reindexar, editar JSON, exportar, remover documento

**Interface** — expandir, encolher, abrir histórico, abrir galeria,
abrir skills, abrir API, trocar tema, zerar cronômetro, filtrar contexto,
remover filtro

**Bobby** — card de identidade, avatar, persona, humor, erro, provocação
do rodapé, jogo escondido, piada, saudação por horário

---

## Como replicar em outro projeto

O Pulso é agnóstico. Precisa de três coisas:

1. **Catálogo de órbitas** — assuntos do seu domínio com seus termos
2. **Estado único** — uma bolha viva por vez, com contador de vida
3. **Reator** — função que roda antes do fluxo normal e intercepta

```js
if (orbitReact(texto)) return;  // a bolha resolveu
Pulso.pulse(texto);             // não resolveu, consome vida
```

Para um CLI em cima de sistema em produção: as órbitas seriam módulos do
sistema, e os itens seriam arquivos ou funções. Falou "auth", a bolha entra
em órbita no módulo de autenticação. Depois disso, "login" já é o arquivo
certo, sem precisar repetir o caminho inteiro.
