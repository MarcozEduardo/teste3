# Case Study · Render Nexus

**Um portfólio conversacional para um desenvolvedor que orquestra IA.**

---

## O problema

Existe uma categoria de trabalho que não sobrevive ao formato tradicional de portfólio: aquele em que o valor está na **arquitetura invisível**, não no resultado visual.

Um designer mostra a tela. Um front-end mostra a animação. Mas quem desenha o sistema em volta de um modelo de linguagem — filtro de entrada, recuperação de contexto, geração de artefatos, política de segurança — não tem o que mostrar numa imagem estática. A competência mora em decisões que só aparecem quando o sistema é usado.

O desafio, então, não era construir um portfólio bonito. Era construir um portfólio que **provasse a habilidade ao ser usado**, sem precisar de explicação.

---

## A decisão central

> Em vez de descrever o sistema, entregar o sistema.

Toda escolha de projeto derivou disso. Se uma capacidade não pudesse ser demonstrada ao vivo pelo visitante, ela não entraria — viraria texto, e texto é o que se queria evitar.

Isso trouxe uma consequência incômoda e produtiva: **cada afirmação precisa ser verificável na tela**. Não dá para dizer "uso RAG" se o visitante não consegue ver a busca acontecendo, as fontes citadas e o percentual de similaridade. Não dá para dizer "tenho preocupação com segurança" se colar um script malicioso simplesmente funciona.

---

## Cinco decisões de projeto

### 1. O firewall é personagem, não configuração

**Problema:** moderação costuma ser invisível. Quando funciona, ninguém nota; quando bloqueia, o usuário se sente censurado sem entender.

**Decisão:** transformar o filtro num personagem com nome — o **Sentinela** — e dar a ele presença visual permanente: um ponto verde pulsando no rodapé, etapas nomeadas durante o processamento, e um badge explícito quando algo é retido.

**Consequência inesperada:** quando o bloqueio tem rosto e justificativa, ele deixa de ser atrito e vira demonstração de competência. O visitante que tenta colar um script e recebe um laudo carimbado com protocolo entende, em três segundos, que ali existe engenharia.

**Detalhe que fez diferença:** o Sentinela não decide sozinho o destino do código. Ele retém, apresenta o laudo e devolve a decisão ao usuário — que assina a liberação e assume a responsabilidade. Isso ficou registrado no contexto da conversa: *"o sistema bloqueou, o Bobby liberou porque você confirmou"*.

---

### 2. Honestidade como restrição de design

**Problema:** assistentes tendem a preencher lacunas com texto plausível. Num portfólio, isso é fatal — um recrutador que pega uma invenção perde a confiança em tudo o mais.

**Decisão:** o motor só afirma o que consegue recuperar da base. Sem fonte, a resposta é "não sei" — dita com elegância, mas dita.

**Consequência:** a qualidade do sistema passou a depender diretamente da qualidade da base indexada. Isso empurrou o projeto para construir uma **interface completa de injeção de conhecimento**: editor de conteúdo, upload em lote, editor JSON com validação atômica, e um testador de recuperação que mostra em tempo real quais trechos uma pergunta traria.

O que começou como restrição ética virou funcionalidade central.

---

### 3. Capacidades desligáveis são o argumento

**Problema:** como provar que existe orquestração de verdade, e não uma chamada de API com roupa nova?

**Decisão:** tornar cada capacidade um módulo com interruptor visível. Dez skills, todas ligáveis e desligáveis em tempo real.

**Por que funciona:** desligar o RAG e ver o assistente perder alcance na mesma conversa é uma demonstração que nenhum texto substitui. O sistema fica **auditável**. E o Bobby reage à própria configuração: pedir uma piada com o humor desligado faz ele avisar que a skill está desativada, em vez de agir por fora do que foi configurado.

---

### 4. Sensores de comportamento, não só de conteúdo

**Problema:** um chat comum só sabe o que você mandou. Não sabe **como** você chegou lá.

**Decisão:** instrumentar a digitação — ritmo, pausas, correções, tempo de sessão, retorno após ausência.

**O que emergiu disso:** o assistente passou a calibrar o tom. Quem digita rápido e usa termos técnicos recebe resposta direta, sem explicação do óbvio. Quem apaga muito recebe acolhimento e oferta de ajuda para formular.

**A regra que salvou o recurso:** só conta como digitação o que passou pelo teclado. Texto colado e abandonado dispara uma reação diferente — *"acho que você se ocupou aí, né? Largou a mensagem pela metade"* — em vez de elogiar um esforço que não existiu. Sem essa distinção, o sistema soaria falso, e falso é pior que ausente.

---

### 5. Contexto como filtro navegável

**Problema:** conversas longas viram sopa. Encontrar o que foi dito sobre um assunto específico exige rolar e reler.

**Decisão:** classificar cada mensagem em uma de quinze categorias no momento da chegada, e permitir filtrar a conversa por assunto.

**A sutileza que fez funcionar:** o filtro usa **âncora temporal**. Tudo que existia antes do clique é recortado no assunto escolhido; o que chega depois aparece sempre. Assim a pessoa vê a conversa mudando de trilho em tempo real, em vez de mensagens sumirem misteriosamente.

E o filtro não é só visual: ele recorta também o pacote enviado ao motor. O Bobby avisa explicitamente que, sob filtro, **não lembra dos outros contextos**.

---

## Problemas reais que apareceram

Documentados porque a solução importa mais que a aparência de facilidade.

| Sintoma | Causa | Solução |
|---|---|---|
| Botões laterais não clicavam | Overlay mobile ativo no desktop, cobrindo a tela com blur | Restringir o overlay à media query correta |
| Interface travando | Relógio dentro do contexto global redesenhava a árvore inteira a cada segundo | Isolar o cronômetro num componente que assina sozinho |
| Chat parava de salvar | Imagens em base64 estourando a cota do localStorage | Binários para IndexedDB, referência por id no histórico |
| Segundo protótipo já nascia confirmado | Deduplicação por nome em vez de identificador | Confirmação por id único |
| Laudo do Sentinela preso no feed | `contain` e `content-visibility` na lista prendiam elementos `fixed` | Renderizar o modal via portal no body |
| Mensagens duplicadas ao editar | Efeito colateral dentro do updater do React, executado duas vezes em StrictMode | Updaters puros, efeitos colaterais fora |
| Visão de imagem falhando | Modelo fixo que a chave do usuário não tinha liberado | Fila de modelos com fallback e erro real exibido |

---

## Arquitetura em uma frase

Uma mensagem entra, é **carimbada** com contexto, **inspecionada** pelo firewall, **enriquecida** com trechos recuperados por similaridade vetorial, **respondida** com fonte citada, e o que sobra vira **artefato** guardado numa galeria navegável.

```
entrada → contexto → sentinela → links → recuperação → geração → artefato
```

Cada etapa é visível durante o processamento, numa barra retrátil que mostra o sistema pensando — inclusive com um desenho ASCII do processador, para quem não é técnico sentir que está vendo a máquina trabalhar.

---

## Números

| | |
|---|---|
| Contextos semânticos | 15 |
| Skills desligáveis | 10 |
| Comandos por linguagem natural | 12 |
| Assinaturas de risco em código | 10 |
| Temas visuais | 2 + 12 paletas ocultas |
| Frases de reação comportamental | 250+ |
| Dimensões do vetor local | 512 |
| Backend obrigatório | nenhum |

---

## O que ficou de fora, e por quê

A lista de pendências é pública e está versionada no repositório. Isso é deliberado.

Um portfólio que se apresenta como perfeito comunica uma coisa. Um portfólio que mostra a própria lista de pendências, priorizada e honesta, comunica outra — e a segunda é mais difícil de fingir.

Entre os itens em aberto: gateway multi-provedor, criptografia com chave custodiada em backend, OCR para documentos digitalizados, auditoria da saída do modelo e testes de acessibilidade. Todos documentados com o motivo de ainda não estarem prontos.

---

## O que este projeto demonstra

Não é domínio de um framework. É **capacidade de desenhar sistema**: escolher o que entra, decidir o que fica visível, tratar falha como parte do fluxo, e cuidar do acabamento onde ninguém olha.

Um chat que conversa é fácil. Um chat que retém código suspeito, emite laudo, pede assinatura, guarda o artefato numa pasta certa, indexa o conteúdo para busca futura e continua funcionando depois de recarregar a página — esse exige projeto.

---

*Produção Marcos Eduardo — orquestrando IA generativa.*
