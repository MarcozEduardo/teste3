# Auditoria do Pulso Eterno

Levantamento honesto do que está montado, o que diverge e o que
ninguém perguntou ainda.

---

## Divergências encontradas

### 1. Duas noções de órbita convivendo

`lib/pulso.ts` tem dez órbitas fixas no código, com termos escritos à mão.
`pulso-eterno/core.ts` tem o mapa editável pelo Studio. Os dois funcionam,
mas não se conhecem: criar uma órbita no Studio não afeta o comportamento do
chat, e as dez fixas não aparecem no grafo.

**Encaminhamento:** o mapa do Studio deveria ser a fonte única. As dez fixas
viram semente inicial, importadas na primeira abertura.

### 2. Dois inspetores com propósitos parecidos

`scanner.ts` tem a mira, `devMode.ts` tem o inspetor. Ambos desenham contorno,
capturam elemento e devolvem seletor. A diferença é o destino — uma cria
órbita, outro trava para dossiê.

**Encaminhamento:** aceitável por enquanto, porque o comportamento diverge no
essencial: a mira captura e fecha, o inspetor mantém estado. Se um terceiro
aparecer, extrair a base comum.

### 3. Ação oculta versus DEV: a mesma coisa por caminhos diferentes

`hidden.ts` altera CSS pela conversa. `devMode.applyCss` altera CSS pelo painel.
Cada um com seu próprio diário de reversão.

**Encaminhamento:** unificar o journal. Hoje "restaurar tudo" em um lugar não
enxerga o que foi feito no outro.

### 4. Três formatos de persistência local

O projeto guarda em `localStorage` com chaves diferentes por módulo, sem
versionamento nem migração. Trocar a forma de um tipo quebra o que já existe.

**Encaminhamento:** um envelope comum com número de versão e função de
migração antes de crescer mais.

### 5. O agente não tem autenticação

Qualquer página que carregue `pulso-agent.js` aceita comandos de qualquer
origem via `postMessage`. Em desenvolvimento local é aceitável. Em qualquer
outro cenário, não é.

**Encaminhamento:** token compartilhado entre Studio e agente, verificado em
toda mensagem. E `targetOrigin` explícito no lugar do curinga.

---

## Perguntas que ninguém fez

**O Studio consegue editar a si mesmo?**
Consegue, e isso é um problema. O inspetor ignora `.pe-studio` para não se
capturar, mas o modo DEV pode aplicar CSS em qualquer seletor — inclusive nos
próprios. Falta um bloqueio explícito.

**O que acontece se o alvo recarregar?**
Os alvos travados perdem referência silenciosamente. O seletor continua
guardado, mas o elemento não existe mais. Precisa de revalidação ao voltar.

**Dois Studios abertos na mesma máquina?**
Compartilham `localStorage`. O último a salvar vence, sem aviso. Falta trava
por aba ou detecção de conflito.

**Os seletores sobrevivem a um build?**
Não necessariamente. Classes com hash mudam a cada compilação. O `selectorFor`
já ignora padrões conhecidos de CSS-in-JS, mas não cobre todos os geradores.

**Quanto o mapa aguenta?**
Não há limite. Com algumas centenas de nós o canvas fica pesado, porque tudo
é renderizado sempre. Falta descarte do que está fora da vista.

**O injetor entende framework?**
Não. Ele insere nó no DOM. Em React, o próximo render pode apagar a inserção.
Funciona bem em HTML estático e em regiões que o framework não controla.

**Existe atalho de teclado documentado?**
Só desfazer e refazer. Nada de navegação, criação rápida ou busca — e para uma
ferramenta de uso repetido, isso pesa.

**Como levar o mapa para produção?**
Exportar e importar JSON, manualmente. Não há sincronização, versionamento nem
comparação entre dois mapas.

---

## Lacunas de ferramenta

| Falta | Por quê |
|---|---|
| Desfazer no modo DEV | Só existe reverter individual, sem pilha |
| Busca dentro do grafo por gatilho | Filtra só por rótulo |
| Duplicar bolha inteira | Duplica nó, não grupo |
| Alinhar e distribuir nós | Posicionamento é só manual |
| Exportar só uma bolha | Exporta o mapa inteiro |
| Pré-visualizar reação | Não dá para testar sem ir ao chat |
| Histórico de dossiês copiados | Perde ao copiar o próximo |
| Comparar antes e depois | Não há diff visual |

---

## O que está sólido

- Separação entre órbita, satélite e bolha
- Detecção automática de divergência entre palavras
- Reversibilidade em todas as alterações visuais
- Recusa de markup e script no colar do DEV
- Honestidade sobre o que o dossiê é: DOM vivo, não fonte
- Três modos de conexão, cada um dizendo o que consegue fazer
- Separação de linguagens no injetor com aviso de conflito

---

## Prioridade sugerida

1. Token no agente — é segurança, não conveniência
2. Unificar o diário de reversão
3. Bloquear o Studio de editar a si mesmo
4. Revalidar alvos após recarga
5. Envelope de versão no armazenamento
6. Unificar as duas noções de órbita
