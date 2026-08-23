# Pulso Eterno · Módulo

> Sistema de contexto orbital com editor visual.
> Copie esta pasta inteira para levar a outro projeto.

```
pulso-eterno/
  core.ts             lógica pura · zero React
  scanner.ts          varredura de DOM e código · mira
  PulsoStudio.tsx     janela do editor
  studio.css          visual
  tools/
    scan_actions.py   varredura do projeto inteiro
  README.md
```

---

## Os três níveis

Separados de propósito, porque confundir os três é o que gera bagunça.

| Nível | O que é | Camada |
|---|---|---|
| **Órbita** | O objeto vigiado. Um botão, uma palavra, um projeto | 0 |
| **Satélite** | A palavra que chama a órbita | 1 |
| **Bolha** | O limite do assunto. Agrupa órbitas | envolve tudo |

As reações vêm depois, nas camadas 2, 3, 4 — na sequência que você definir.

Criou a órbita, o sistema já está vigiando. O editor mostra isso: *"Vigiando · camada 0"*.

---

## Por que a bolha existe

Para resolver a palavra ambígua.

"Fecha" sozinho não quer dizer nada. Mas dentro da bolha da galeria, significa
fechar a galeria. A bolha dá fronteira ao assunto: enquanto uma órbita dela
está viva, as outras órbitas da mesma bolha respondem antes do mapa inteiro.

Lacrar a bolha fecha o assunto e transforma o grupo numa unidade que pode
ligar a outras bolhas.

---

## Divergências

Quando a mesma palavra está em duas órbitas, o sistema encontra sozinho e lista
na aba de divergências. Duas políticas:

**Perguntar** — o Bobby devolve a dúvida: *"tem 2 coisas com esse nome, qual delas?"*
**Chutar** — ele escolhe a de ordem menor e segue.

Ao criar uma órbita com palavra já usada, o aviso aparece na hora, antes de salvar.

---

## A ideia

Chat comum trata cada mensagem como se fosse a primeira. Você abre a galeria,
fala "protótipos", e ele não entende — isolada, essa palavra não é comando.

O Pulso mantém o assunto vivo. Executou uma ação? O tema entra em órbita.
Enquanto a bolha estiver acesa, palavra solta ganha significado. Passou tempo
sem menção, ela estoura.

```
abriu galeria ─→ órbita viva (ttl 5)
   "prot"      ─┤ renova · abre Protótipos
   "quantos?"  ─┤ renova · conta e responde
   "boa tarde" ─┤ ttl 4
   ...
   ttl 0       ─→ estoura
```

---

## Instalar em outro projeto

```tsx
import PulsoStudio from "./pulso-eterno/PulsoStudio";
import { PulsoRuntime, loadMap } from "./pulso-eterno/core";
import "./pulso-eterno/studio.css";

const pulso = new PulsoRuntime(loadMap(), {
  say: (texto) => enviarMensagem(texto),
  run: (acao) => executarAcao(acao),
});

// No pipeline, antes do fluxo normal:
if (pulso.handle(mensagem)) return;
```

O runtime não conhece o hospedeiro. Ele fala por `say` e age por `run` —
duas funções que você fornece.

---

## O Studio

Janela flutuante, arrastável pelo cabeçalho. Abre pelo botão **Pulso**.

### Três colunas

**Esquerda** — lista de órbitas e resultados de varredura
**Centro** — grafo de nós com ligações curvas, arrastáveis
**Direita** — editor da órbita selecionada

### Barra de ferramentas

| Ícone | O que faz |
|---|---|
| Mira | Aponta na tela e captura o elemento sob o cursor |
| Varredura | Encontra tudo que é clicável na tela atual |
| Upload | Abre `.tsx` para parsear, ou `.json` para importar mapa |
| Download | Exporta o mapa |

### A mira

Ativa o modo alvo. O elemento sob o mouse ganha contorno e etiqueta com o
nome. Clique captura, `Esc` cancela. O rótulo e os gatilhos vêm prontos.

---

## Anatomia de uma órbita

| Campo | Para que serve |
|---|---|
| `label` | Nome legível |
| `kind` | Ação, Texto, Pessoa, Produto ou Janela |
| `selector` | Onde o elemento vive na tela |
| `triggers` | Palavras que acordam e renovam |
| `questions` | Perguntas que a pessoa costuma fazer |
| `ttl` | Turnos de vida sem menção |
| `explains` | Responde em sequência em vez de sortear |
| `reactions` | O que o Bobby fala e faz |

### Reações

Cada reação tem mensagens e até duas ações. Com `explains` desligado, o Bobby
sorteia entre as variações. Ligado, ele percorre passo a passo — serve para
explicar algo em etapas.

O campo de mensagem aceita 10 mil caracteres, uma variação por linha.

---

## Casamento por prefixo

Dentro de uma órbita viva, três letras bastam:

```
"prot"     → Protótipos
"prottipo" → Protótipos    (erro de digitação não atrapalha)
"dev"      → ambíguo       (Protótipos e Confirmados)
```

Na ambiguidade, o runtime devolve pergunta em vez de chutar. E se a pessoa
insistir mais de três vezes na mesma coisa, ele corta:

> "Isso eu já mostrei. Se quiser, clica direto que é mais rápido."

---

## Grafo de ligações

Ligar duas órbitas cria vizinhança. Quando a bolha ativa não reconhece o
texto, os vizinhos têm prioridade sobre nós distantes — o salto acompanha
o raciocínio de quem está conversando.

Botão de corrente no nó, clique no destino.

---

## Varredura pelo Python

Para mapear o projeto inteiro de uma vez:

```bash
cd src/pulso-eterno/tools
python scan_actions.py ../../.. -o pulso-eterno.json
```

Reconhece React, Vue, Svelte e HTML puro. Procura handlers, extrai o rótulo
da vizinhança, deriva os gatilhos e já posiciona os nós em grade.

O JSON sai pronto: importe pelo botão de upload do Studio.

| Argumento | Efeito |
|---|---|
| `raiz` | Pasta a varrer |
| `-o` | Arquivo de saída |
| `--min` | Tamanho mínimo do rótulo, para cortar ruído |

Sem dependência externa.

---

## Portar para outro domínio

Três ajustes:

1. **`HOST_ACTIONS`** em `PulsoStudio.tsx` — a lista de ações do seu sistema
2. **`KIND_META`** em `core.ts` — os tipos que fazem sentido no seu contexto
3. **`CLICKABLE`** em `scanner.ts` — os seletores do seu framework

Num CLI sobre sistema em produção, as órbitas seriam módulos e os itens
seriam arquivos. Falou "auth", a bolha orbita autenticação — depois disso
"login" já resolve, sem repetir o caminho inteiro.

---

## Levar para outro projeto

Aba **Alvo**. Três modos, e o Studio diz qual conseguiu:

| Modo | Quando | O que dá para fazer |
|---|---|---|
| Mesma origem | Studio e alvo no mesmo servidor | Tudo: inspecionar, copiar, aplicar |
| Agente | Servidores diferentes | Tudo, por mensagem, com o agente instalado |
| Leitura | Arquivo aberto do disco | Análise estática por texto |

Digite o endereço, escolha um dos atalhos de porta comum, ou abra um arquivo.
O alvo carrega no quadro ao lado.

### O agente

Para servidor diferente, copie `agent/pulso-agent.js` para o projeto e adicione:

```html
<script src="pulso-agent.js"></script>
```

Ele abre um canal `postMessage`, responde apenas a mensagens `pulso:` e não faz
nada sozinho. Remover a linha desinstala sem deixar resíduo.

Comandos que o agente entende: ping, varredura, inspeção, dossiê, aplicar
estilo, injetar elemento e reverter.

### Sem servidor

Abra o `.html` direto do disco. O Studio lê como texto e encontra os elementos
interativos por análise estática, com número de linha. Sem execução.

---

## Adicionar elemento

Botão na aba DEV. Cole HTML, CSS e JavaScript **juntos** — o sistema separa.

Reconhece tags `<style>` e `<script>`, cercas de markdown com linguagem
declarada, e fragmento solto pela forma do conteúdo.

### Conflitos

Antes de inserir, o sistema confere:

| Tipo | O que detecta |
|---|---|
| Id | Id repetido, que quebra seletores |
| Classe | Classe que já existe na página |
| Seletor | Regra que atinge elementos existentes |
| Global | Seletor em `*`, `html` ou `body` |
| Função | Nome que já existe no escopo global |
| Risco | eval, innerHTML, fetch, setInterval e afins |

### Posicionar

Inserido, o elemento fica **arrastável**. Mova até o lugar certo e clique com
o botão direito nele — ou no botão Finalizar — para fixar.

O CSS vai para uma folha própria, o script para o fim do corpo, ambos com o
comentário `elemento adicionado pelo Dev PulsoEterno`.

Tudo removível pelo painel, individual ou de uma vez.

---

## Modo desenvolvedor

Aba **DEV**. Zona permanente: o que se aplica aqui não pertence à sessão do chat.

### Inspeção com trava múltipla

Diferente da mira. O contorno é azul tracejado com dimensão em pixels. Clique
trava o alvo e ele ganha número; clicar de novo destrava. Vários alvos ao mesmo
tempo, todos numerados em amarelo.

**Botão direito** abre o menu — e ele **não fecha clicando fora**. Você escolhe:

| Opção | O que faz |
|---|---|
| Copiar código-fonte | Dossiê só deste alvo |
| Copiar todos os travados | Dossiê do conjunto, numerado |
| Colar código novo | Aplica CSS ao elemento |
| Destravar este | Solta apenas ele |
| Manter travado | Fecha o menu sem soltar nada |

### O dossiê

O que vai para a área de transferência:

- **Prompt de instrução** com sete regras que proíbem inventar função,
  trocar nome de classe ou adicionar dependência
- **Seletor** completo com hierarquia
- **Arquivo provável**, deduzido pelo prefixo da classe
- **Markup renderizado** do elemento
- **Regras autorais** extraídas das folhas de estilo
- **Estilo computado** no momento da cópia
- **Stack detectada** e dimensão do viewport

Honestidade importa: o markup é o que está vivo no DOM, não o JSX original.
O arquivo é uma dedução por prefixo, não uma leitura de disco. O dossiê diz
isso com todas as letras para a outra IA não ser induzida ao erro.

### Colar de volta

Aceita **apenas declarações de estilo**. Seletor e chaves são opcionais — o
sistema extrai o miolo. Markup, script, `@import` e `javascript:` são recusados.

Aplicar código arbitrário numa página viva é abrir porta para injeção. CSS
resolve o caso real, é reversível e não executa nada.

Toda alteração entra no diário com o estilo anterior. Reverter uma ou todas.

---

## Fábricas

### Documentos
Nove tipos, quatro layouts, cinco paletas. Currículo, relatório, lista,
proposta, tabela, carta, recibo, briefing e ficha.

### Sites
Três arquétipos autocontidos, mesma paleta dos documentos:

| Tipo | Estrutura |
|---|---|
| Landing | Hero, cards numerados, faixa escura de conversão |
| Portfólio | Avatar, grade masonry de trabalhos, bio |
| Produto | Split com mock, lista de recursos, cartão de preço |

Cole o texto cru: o `parseFreeText` separa título, resumo, seções, itens e
contato sozinho. Sem paleta escolhida, cada geração sai diferente.

---

## Persistência

Tudo em `localStorage`, chave `pulso_eterno_map`. Exporte para versionar
junto do código; importe para restaurar.

Para backend, `exportMap()` e `importMap()` já entregam e recebem JSON.
