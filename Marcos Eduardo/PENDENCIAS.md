# Bobby / Render Nexus - Inventario de Pendencias

> Proprietario: Marcos Eduardo
> Atualizado nesta rodada
> Regra para a proxima IA: nao alegar que um item esta pronto sem localizar a implementacao e validar o build.

## Legenda

- [x] Implementado e compilando.
- [~] Implementado parcialmente; exige teste real ou integracao externa.
- [ ] Nao implementado.

## Motor de intencoes — como injetar mais

Arquivo: `src/lib/intents.ts`. Nao e lista de frases: e VERBO x ALVO.

- `VERBS` guarda a raiz e todas as flexoes (presente, passado, futuro, imperativo, gerundio).
- `TARGETS` guarda os sinonimos do objeto.
- O cruzamento cobre centenas de frases sem escrever cada uma.

Para ampliar sem tocar em codigo: RenderLab, aba **Comandos**. Escolhe a acao,
cola uma variacao por linha, clica em Treinar. O que entra ali vira atalho de
confianca alta e passa a bater antes de qualquer regra.

Exporte com o botao Exportar; o JSON serve de backup e pode voltar por Importar.

### Funcoes visiveis x ocultas

- Visiveis: cor, galeria, conversa, paineis, expandir.
- Ocultas: troca de fonte, provocacao do rodape, jogo, confirmacoes de fluxo.
- O usuario nao tem botao para as ocultas. So a IA alcanca.

## Ideias que ainda nao foram pensadas

> Levantadas na revisao final. Nenhuma foi implementada.

- [ ] **Memoria do proprio portfolio.** O Bobby nao sabe o que ja aconteceu com ele. Guardar, sem dado pessoal, quais perguntas mais se repetem e quais nao tiveram fonte. Isso vira um painel que diz exatamente o que indexar depois.
- [ ] **Reconhecer visitante que voltou.** Um id anonimo no navegador permitiria "voce esteve aqui semana passada e perguntou sobre orquestracao". Impacto alto em recrutador, custo baixo.
- [ ] **Modo apresentacao.** Um roteiro guiado que demonstra sozinho: retem codigo, mostra o laudo, gera PDF, desliga o RAG. Util quando o Marcos nao esta junto para explicar.
- [ ] **Exportar a conversa como peca.** O visitante sai com um PDF bonito do que conversou. Vira material que circula sozinho.
- [ ] **Sentinela com relatorio publico.** Um contador honesto de quantas tentativas de injecao foram barradas. Prova viva de que o firewall trabalha.
- [ ] **Comparar respostas com e sem RAG lado a lado.** O argumento mais forte de orquestracao, mostrado em uma tela.
- [ ] **Trilha sonora de interface.** Sons discretos em envio, retencao e conclusao. Poucos portfolios ousam; bem feito, marca.
- [ ] **Onboarding de trinta segundos.** Hoje o visitante precisa descobrir tudo sozinho.
- [ ] **Atalhos de teclado com paleta de comandos.** Ctrl+K abrindo acoes; reforca a percepcao de ferramenta seria.
- [ ] **Historico de versoes do artefato.** Ver o que mudou entre duas edicoes do mesmo codigo.

## Pulso Eterno

Documento proprio: `Marcos Eduardo/PULSO-ETERNO.md`.
Codigo: `src/lib/pulso.ts`, `src/lib/speech.ts`, `src/components/OrbitBubble.tsx`.

- [x] Dez orbitas mapeadas com termos que renovam a bolha.
- [x] Vida por turnos: sem mencao, a bolha estoura.
- [x] Resolucao por prefixo de tres letras dentro da orbita.
- [x] Ambiguidade devolve pergunta em vez de chutar.
- [x] Protecao contra insistencia: muda o tom apos tres repeticoes.
- [x] Contagem de arquivos com teatro de contagem.
- [x] Zerar cronometro mantendo o total real no sistema.
- [x] Indicador visual da bolha com anel de vida.
- [x] Ritual de execucao: aviso, trabalho de 2s, check, confirmacao.
- [x] Falas configuraveis por acao em quatro momentos.
- [x] Sensor de presenca: aba aberta sem interacao.
- [x] Toda decisao de orbita vira log do Sentinela.

### Roadmap do Pulso

Detalhado em `PULSO-ETERNO.md`. Resumo do que falta:

- [ ] Orbita `bobby` injetando o card de identidade.
- [ ] Orbita `input` desambiguando os dois clipes.
- [ ] Demonstracao animada: Bobby digita link sozinho e envia internamente.
- [ ] Oculos de explicacao com botao de cancelar durante a demonstracao.
- [ ] Localizar chat por trecho usando a busca em silencio.
- [ ] "Salva isso pra lembrar" curtindo a mensagem sozinho.
- [ ] Orbita composta com dois assuntos vivos.
- [ ] Memoria eterna atravessando sessoes.
- [ ] Orbita ativa filtrando a busca vetorial.

## Posto do Sentinela

Pasta `sentinela/` — HTML standalone pronto para outra IA trabalhar.
Painel funcional equivalente em `src/components/SentinelaPanel.tsx`.

- [x] Registro de eventos com oito tipos: pass, block, hold, release, deny, vision, web, config.
- [x] Estatisticas: totais, ranking de ameacas, movimento em 24h.
- [x] Regras do firewall ligaveis por classe, com efeito imediato no pipeline.
- [x] Calibragem de ruido e limite de repeticao.
- [x] Lista de termos bloqueados e allowlist com prioridade.
- [x] Aba de registro com filtro por tipo, exportacao e limpeza.
- [x] Aba Cofre com campos de Firebase e endpoint, desligados e sinalizados.
- [x] Aba Pericia listando as dez assinaturas monitoradas.
- [x] Botao Guarda no rodape do painel esquerdo.
- [x] Comando natural: "abre o sentinela", "mostra os logs", "abre a guarda".

### Blocos em preparo dentro do painel standalone

Marcados com `.soon`, estrutura pronta, funcao nao ligada:

- [ ] Linha do tempo por hora.
- [ ] Vigilia programada por faixa horaria.
- [ ] Busca textual e recorte por periodo no registro.
- [ ] Politica de retencao e anonimizacao.
- [ ] Cadastro de assinaturas proprias com regex.
- [ ] Sentinela de saida auditando a resposta do modelo.
- [ ] Assinatura por hash do codigo liberado.

## Implementado nesta rodada

- [x] Motor de intencoes por verbo + alvo, cobrindo conjugacoes e sinonimos.
- [x] Treinador de comandos no RenderLab, com lista de acoes visiveis e ocultas.
- [x] Campo de injecao de variacoes com placeholder de exemplo, export e import.
- [x] Fluxo conversacional de varias etapas: o Bobby pergunta e a resposta seguinte e lida como resposta, nao como comando novo.
- [x] Troca de cor entendendo trocar, mudar, alterar, colocar, deixar, fazer, querer e poder.
- [x] Reversao entendendo voltar, desfazer, reverter, restaurar, cancelar, tirar e remover.
- [x] Sem cor definida, o Bobby sugere tres e espera a escolha por numero ou nome.
- [x] "Um tom de X" devolve vizinhas no circulo cromatico.
- [x] Paleta derivada de matiz: qualquer cor nasce legivel, sem tabela fixa.
- [x] A IA inventa cor nova com nome proprio e salva no catalogo.
- [x] Troca de fonte como funcao oculta, sem botao para o usuario.
- [x] "Abre documentos" desambigua entre galeria e conversa antes de agir.
- [x] Jogo escondido modular: damas de bolso e jogo da velha, em iframe sandboxed.
- [x] Provocacao sobre erro abre o aviso do rodape em tela cheia com trava de cinco segundos.
- [x] O tempo ate fechar vira comentario do Bobby e fica no historico da conversa.
- [x] Curtida voa ate o botao da galeria e acende o contador.
- [x] Botao de inverter no centro vertical, entre as duas janelas.

### Onde adicionar mais

- Novo jogo: `src/lib/games.ts`, registrar no array `GAMES`.
- Nova cor base: `src/lib/colorEngine.ts`, mapa `HUES`.
- Nova acao: `src/lib/intents.ts` em `COMMANDS`, e o caso em `runIntent` no store.
- Novas frases: painel do RenderLab, sem tocar em codigo.

## Urgente

- [ ] Teste manual completo no navegador em desktop e mobile.
- [ ] Integrar o gateway real de provedores de IA do Marcos.
- [ ] Integrar a skill real de internet que o Marcos ainda vai enviar.
- [ ] Auditoria de seguranca antes de publicar: sandbox, chaves, uploads, XSS, CSP e rate limit.
- [ ] Substituir a afirmacao visual de criptografia/Firebase por estado dinamico quando o backend existir. Hoje e apenas texto de interface preparado para a integracao futura.

## Galeria

- [x] Selecao multipla na Gallery Window, com marcar/desmarcar, barra temporaria e exclusao em lote.
- [x] Confirmacao destrutiva em card: Sim / Nao e aviso de irreversibilidade.
- [x] Menu de contexto no clique direito para mover chat para a Lixeira do Chat.
- [ ] Renomear arquivo ou chat direto pela Gallery Window.
- [x] Excluir ou renomear chats por linguagem natural, incluindo referencias ordinais, atual, hoje/ontem e titulo completo.
- [ ] "Exclui tudo da pasta X" via IA com confirmacao explicita.
- [x] Indexar automaticamente no RAG os objetos visiveis da galeria ao abrir a janela.
- [ ] Permitir que a IA localize e abra um item da galeria pelo nome com animacao de procura.
- [x] Pastas de Documentos, Prototipos, Confirmados, Curtidas, Chats e Lixeira.
- [x] Anexos de chats deletados continuam na lixeira.
- [x] Curtidas sao copias independentes do chat original.
- [x] Painel lateral mostra no maximo seis itens e oferece acesso a janela grande.
- [x] Botao lateral vira alternador: com a janela aberta, o mesmo clique fecha.
- [x] Gallery Window abre no lado direito, junto do proprio botao.
- [x] Botao de inverter lados funciona tambem com a Gallery Window aberta.
- [x] Estado vazio da galeria com texto correto por pasta e por busca.
- [x] Painel esquerdo e direito podem inverter de lado quando os dois estao abertos.

## RAG e embeddings

- [x] Vetorizacao local 512d, TF-IDF, bigramas, stemming, cosseno e MMR.
- [x] Configuracao para Gemini, OpenAI e endpoint customizado.
- [x] Editor JSON com replace/merge e validacao atomica.
- [x] Documentacao das tools indexada no corpus.
- [ ] Persistir o indice remoto no IndexedDB para nao reindexar apos reload.
- [ ] Sincronizar a base com servidor ou banco vetorial real.
- [ ] Fazer likes aumentarem peso dos chunks que originaram a resposta.
- [ ] Painel de lacunas: perguntas sem fonte ou com score abaixo do limiar.
- [~] A GalleryBob entra como indice transitorio ao abrir. Falta sincronizacao incremental sem reabrir a janela.
- [ ] Integrar embeddings reais e validar custos, dimensao, lotes e limites do provedor escolhido.

## Internet e pesquisa

- [x] Mapeador, card e leitura real de URL via Jina Reader implementados; texto entra no RAG transitorio.
- [~] SiteViewer em iframe implementado; dominios com X-Frame-Options abrem em nova aba.
- [~] Skill de internet real usa Jina Reader publico; trocar pelo proxy proprio do Marcos em producao.
- [x] Busca Google com os tres primeiros resultados usando API key + CX configuraveis.
- [x] Card de resultados com titulo, snippet, dominio, favicon, SiteViewer e "ver o restante".
- [x] Uma janela pesada por vez: abrir SiteViewer fecha Gallery Window e paineis.

## PDF e documentos

- [x] Transcricao basica de PDFs nao comprimidos.
- [x] Binario original guardado em IndexedDB para leitura/download.
- [x] DocViewer com busca no texto extraido e viewer nativo do PDF.
- [x] Fabrica modular de HTML para impressao: cinco temas e blocos de capa, KPI, tabela, cards, timeline, callout, barras e rodape.
- [x] Entregar um arquivo PDF binario real no chat, sem expor o HTML interno.
- [x] jsPDF gera tres paginas com capa, KPIs, tabela, callout, timeline, barras e rodape.
- [ ] Paginacao e zoom customizados no leitor, sem depender do viewer nativo.
- [ ] OCR para PDFs escaneados ou streams comprimidas.
- [ ] Memoria de exemplos premium de CSS/documentos indexada no RAG para inspirar novos PDFs.

## Codigo e editor

- [x] Deteccao de HTML, JS, TS, Python, Java, SQL, CSS, JSON e Shell em texto colado ou digitado.
- [x] Codigo de qualquer tamanho vira anexo e passa pela quarentena.
- [x] Card escuro de codigo com linguagem, linhas e copiar.
- [x] Monaco Editor carregado sob demanda.
- [x] Renomear, editar, salvar e publicar "Mudancas realizadas" no chat.
- [x] Play HTML em iframe sandboxed sem allow-same-origin.
- [x] Chat lateral durante edicao desktop e balao/puxador no mobile.
- [x] Persistir no card e na galeria a alteracao feita no Monaco.
- [ ] Navegacao de versoes do arquivo e diff antes/depois.
- [ ] Execucao segura de JS, Python, Java e SQL. Hoje somente HTML/SVG tem preview real.
- [ ] Worker/timeout para encerrar algoritmo em loop infinito.

## Sentinela e seguranca

- [x] Firewall de entrada: flood, injection, linguagem impropria, hostilidade e ruido.
- [x] Quarentena de codigo, analise de assinaturas, laudo oficial, protocolo e liberacao explicita.
- [x] Negacao permanente por anexo e registro da liberacao no contexto.
- [x] Brasao visual do Sentinela.
- [x] Laudo e dialogo de liberacao via portal: nao ficam mais presos no feed.
- [x] Laudo com aparencia de documento oficial: papel pautado, moldura dupla, marca d'agua e carimbo.
- [x] Codigo misturado com frase e separado automaticamente e enviado para quarentena.
- [ ] Sentinela de saida: auditar resposta do modelo antes de renderizar.
- [ ] Hash do codigo retido para garantir que o usuario liberou exatamente aquele conteudo.
- [ ] Limite de CPU/memoria/tempo para qualquer execucao.
- [ ] Criptografia real AES-GCM das conversas; a chave deve vir do backend/Firebase e existir apenas em memoria.
- [ ] Firebase Auth, rotacao de chave e recuperacao de conta.
- [ ] Rate limit server-side para visao, chat, embedding, busca e OCR.
- [ ] CSP de producao e proxy para impedir exposicao de chaves no cliente.

## Contextos

- [x] Quinze contextos com icones Lucide, classificacao automatica e heranca pergunta/resposta.
- [x] Marcador dentro do balao, tooltip tematico, voo ate o seletor e confete pixel art.
- [x] Seletor de contexto junto do input e filtro por ancora temporal.
- [x] Comando natural para focar/remover contexto.
- [ ] Classificacao por modelo real para mensagens ambiguas; hoje usa regras e sinais estruturais.
- [ ] Corrigir contexto de mensagem composta: comando em bate-papo + card de anexo devem poder ter marcadores separados.
- [ ] Exibir historico de mudancas de contexto na sessao.

## Conversas e memoria

- [x] Novo chat preserva o anterior.
- [x] Busca por titulo e conteudo, selecao multipla e lixeira no painel esquerdo.
- [x] Like nas mensagens do usuario e do Bobby.
- [x] Edicao cria branch linear e limita tentativas.
- [ ] Arvore visual navegavel de branches.
- [~] Renomear/apagar por linguagem natural e referencia temporal implementado; restaurar por linguagem natural ainda falta.
- [x] Idade de mensagem relevante entra na resposta: "isso foi ha 2h".
- [ ] Memoria de longo prazo com consentimento e escopo claro.

## Sensores e comportamento

- [x] Tempo de digitacao, caracteres, CPM e backspaces.
- [x] Banter so com teclas reais; colagem nao conta como digitacao.
- [x] Texto parado recebe cutucada especifica.
- [x] Cronometro de sessao isolado para evitar rerender global.
- [x] Sensor de visibilidade/foco da aba.
- [ ] Sensor de scroll em mensagens antigas.
- [ ] Detector de frustracao por reformulacao repetida.
- [~] Idade de mensagem entra no pacote; duracao completa da sessao ainda precisa entrar no RAG/modelo.
- [ ] Painel de telemetria para Marcos, com opt-in e privacidade.

## Mobile e acessibilidade

- [x] Paineis em folha inferior, moldura do body visivel e visualizadores responsivos.
- [x] Puxador para chamar o chat durante edicao no mobile.
- [ ] Testar em iOS Safari, Android Chrome, teclado virtual e safe-area.
- [ ] Evitar conflito entre teclado virtual, input e folha dos paineis.
- [ ] aria-live para novas mensagens, thinking e alertas.
- [ ] Navegacao completa por teclado e foco preso dentro dos modais.
- [ ] Teste WCAG de contraste para todos os temas e paletas secretas.

## Integracoes

- [ ] Gateway real de provedores do Marcos.
- [ ] Modelo real para sintese das respostas; hoje o motor local organiza o RAG.
- [ ] Skill real de internet.
- [ ] Google Programmable Search ou busca via proxy.
- [ ] Firebase e criptografia real.
- [ ] OCR, conversor PDF e armazenamento de artefatos no backend.

## Checklist antes de publicar

- [ ] Teste manual de todos os fluxos em uma sessao limpa.
- [ ] Teste apos reload com conversas, anexos, lixeira, likes e RAG.
- [ ] Teste com localStorage cheio e IndexedDB indisponivel.
- [ ] Teste de API Gemini valida, invalida, sem permissao e sem cota.
- [ ] Teste de prompt injection e codigo malicioso.
- [ ] Teste de loops e HTML agressivo no sandbox.
- [ ] Remover afirmacoes de seguranca que ainda nao tenham backend real.
- [ ] Configurar CSP e nunca publicar chaves reais no bundle.
