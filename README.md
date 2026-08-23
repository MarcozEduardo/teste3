# Render Nexus

> Um portfólio que você não lê. Você conversa com ele.

---

## A história

A maioria dos portfólios de desenvolvedor conta a mesma coisa: uma foto, uma lista de tecnologias, três cards de projeto e um formulário de contato que ninguém preenche. O visitante rola, assente com a cabeça e vai embora sem ter visto **nada funcionando**.

Marcos Eduardo trabalha com orquestração de IA generativa. E orquestração é exatamente o tipo de trabalho que não cabe numa lista de tecnologias — porque o valor não está em consumir uma API de chat, está em tudo que se constrói **em volta** do modelo: o filtro que decide o que entra, a memória que decide o que é relevante, a interface que transforma resposta em artefato, a persistência que sobrevive ao recarregamento.

Descrever isso é chato. Então em vez de descrever, ele construiu.

O **Render Nexus** é o portfólio dele — e é também a demonstração dele. Quem chega não lê sobre o sistema: usa o sistema. Pergunta, recebe resposta com fonte citada, anexa um arquivo e vê o firewall reter, pede um protótipo e recebe código executável, cola um algoritmo e é interrogado por um guarda automático que emite um laudo carimbado. Cada peça visível tem contraparte de engenharia, e todas elas podem ser **desligadas ao vivo** para o visitante ver o que muda.

O assistente se chama **Bobby**. Ele tem opinião, sabe se é manhã ou madrugada, percebe quando você está digitando há três minutos e apagando tudo, e diz "não sei" quando não sabe — porque a regra número um do sistema é não florear.

---

## O que existe aqui dentro

### Bobby
Assistente com persona. Cumprimenta pelo horário, calibra o tom pelo seu ritmo de digitação, entende quando você veio da página inicial ou abriu o balão flutuante no meio do portfólio. Não inventa: quando não há fonte na base, ele diz isso com todas as letras.

### Sentinela
Firewall de entrada. Toda mensagem passa por ele antes do modelo. Barra linguagem imprópria, ruído sem sentido, hostilidade, repetição e tentativa de reescrever as instruções do sistema. Quando aprova, monta o pacote: anexa os trechos recuperados e entrega para a geração.

Código colado recebe tratamento especial. Fica **retido em quarentena**, o usuário vê um laudo oficial com protocolo e carimbo, e só é liberado com assinatura explícita. Negou uma vez, fica lacrado para sempre.

### RAG e embeddings
Busca vetorial sobre os cases e READMEs. Chunking com sobreposição, vetorização em 512 dimensões, similaridade de cosseno com diversificação por MMR. Roda inteiro no navegador, sem custo de API — e troca para Gemini, OpenAI ou endpoint próprio mudando uma configuração. Cada resposta mostra de onde veio, com percentual de similaridade.

### GalleryBob
Explorador de arquivos dentro da conversa. Documentos, protótipos, confirmados, mensagens curtidas, chats e lixeira. Seleção múltipla, busca por conteúdo, exclusão em lote com confirmação. Curtida é cópia soberana: apagar o chat não apaga o que você salvou.

### RenderLab
Dez capacidades ligáveis e desligáveis em tempo real. Desligue o RAG e veja o Bobby perder alcance. Desligue o Sentinela e veja o filtro sumir. É a diferença entre afirmar que orquestra IA e mostrar a orquestração acontecendo.

### Contextos
Quinze categorias semânticas. Toda mensagem é carimbada na chegada e a resposta herda o mesmo trilho. Filtrando por um contexto, o histórico anterior é recortado naquele assunto — e o Bobby avisa que perdeu acesso ao resto.

### Artefatos
Protótipos HTML executáveis em sandbox isolado. Editor Monaco com renome e salvamento. PDF gerado como arquivo binário real, com capa, indicadores, tabelas e linha do tempo. Leitura de imagens por visão. Transcrição de PDF. Mapeamento e leitura de páginas web.

---

## Detalhe de acabamento

O que separa um projeto funcional de um projeto bem feito costuma ser invisível até faltar:

- O overlay que não bloqueia cliques onde não deveria
- O cronômetro isolado, porque atualizar o relógio não pode redesenhar a tela inteira
- O binário que vai para IndexedDB, porque imagem grande não pode derrubar a persistência do chat
- O tooltip que inverte de lado quando encosta na borda
- O carimbo de contexto com `float`, para o texto contornar em vez de passar por baixo
- A validação de JSON que é tudo ou nada, para a base nunca ficar pela metade
- O fallback em cada skill desligada, com aviso claro em vez de silêncio

---

## Stack

React · TypeScript · Vite · CSS puro com variáveis de tema
Monaco Editor · jsPDF · lucide-react
localStorage para estrutura · IndexedDB para binários

Sem backend obrigatório. Tudo roda no navegador e sobrevive ao recarregamento.

---

## Rodando

```bash
npm install
npm run dev     # desenvolvimento
npm run build   # gera dist/index.html
```

O build sai como **arquivo único**: um HTML autocontido, pronto para ser servido de qualquer lugar.

---

## Temas

Dois oficiais — **Uva** (violeta e bege, padrão) e **Creme** (papel e dourado).

E doze paletas escondidas. Peça ao Bobby para deixar o chat vermelho, azul, ônix. Ele vai fingir que acabou de descobrir que consegue.

---

## Documentação

- `DOCUMENTACAO.md` — arquitetura, diagramas e referência de funções
- `CASE-STUDY.md` — as decisões de projeto e por que foram tomadas
- `Marcos Eduardo/PENDENCIAS.md` — inventário honesto do que ainda falta

---

*Produção Marcos Eduardo — orquestrando IA generativa.*
