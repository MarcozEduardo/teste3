# Posto do Sentinela — pasta de trabalho

Painel de controle do firewall do Render Nexus, em HTML standalone.

Abra `index.html` direto no navegador. Ele roda em **modo demonstração**, com
dados de exemplo, para o trabalho visual poder ser conferido sem depender do app.

---

## Para quem vai mexer

### Pode alterar à vontade

- Todo o CSS: cores, espaçamento, tipografia, animação
- Estrutura visual das seções e cartões
- Novos campos e controles
- Texto de apoio e microcópia
- Responsividade

### Não altere

| Item | Motivo |
|---|---|
| Atributos `data-fn` | Apontam para funções reais do sistema |
| Atributos `data-id` | Ligam o campo ao estado da aplicação |
| Nomes em `SentinelaBridge` | O app procura exatamente por eles |
| O selo do Sentinela | Identidade visual fixa |
| Texto dos contratos | Descreve comportamento já implementado |

Se remover um `data-id`, o campo para de receber dado. Se renomear uma função
da ponte, o app não encontra e o painel fica mudo.

---

## Como o painel conversa com o sistema

Quando embarcado, o app injeta `window.SentinelaBridge` antes do script rodar.
Sem ele, o painel usa os dados falsos do próprio arquivo.

```js
window.SentinelaBridge = {
  stats,        // → sentinelaLog.stats()
  entries,      // → sentinelaLog.entries()
  loadConfig,   // → sentinelaLog.loadConfig()
  saveConfig,   // → sentinelaLog.saveConfig(cfg)
  clearLog,     // → sentinelaLog.clearLog()
  exportLog,    // → sentinelaLog.exportLog()
  signatures,   // → quarantine.SIGNATURES
};
```

---

## Funções reais já implementadas

Vivem em `src/lib/` no projeto principal.

### `sentinelaLog.ts` — o diário de bordo

| Função | O que faz |
|---|---|
| `log(kind, reason, detail, opts)` | Grava uma decisão do perímetro |
| `entries()` | Devolve o registro, mais recente primeiro |
| `stats()` | Totais por tipo, ranking de ameaças e movimento em 24h |
| `clearLog()` | Zera o registro |
| `exportLog()` | Serializa tudo em JSON |
| `subscribe(fn)` | Avisa a interface quando algo novo entra |
| `loadConfig()` / `saveConfig(cfg)` | Lê e grava as regras do firewall |

Tipos de evento: `pass`, `block`, `hold`, `release`, `deny`, `vision`, `web`, `config`.

### `sentinela.ts` — o filtro de entrada

`inspect(texto, recentes)` devolve `{ ok: true }` ou `{ ok: false, reason, message }`.

Classes detectadas:

| Classe | O que barra |
|---|---|
| `impróprio` | Ofensa, palavrão, conteúdo tóxico |
| `injection` | Tentativa de reescrever as instruções |
| `ruído` | Texto sem conteúdo semântico |
| `arrogância` | Hostilidade dirigida ao assistente |
| `flood` | Mesma mensagem repetida |

### `quarantine.ts` — retenção de código

| Função | O que faz |
|---|---|
| `scanCode(codigo, linguagem)` | Varre assinaturas e emite o laudo |
| `riskLevel(riscos)` | Consolida em alta, média, baixa ou nenhuma |
| `laudoText(scan, linguagem)` | Texto oficial do auto de retenção |

Dez assinaturas monitoradas: execução dinâmica, chamada de rede, acesso ao
armazenamento, injeção no documento, comando de sistema, processo do sistema,
conteúdo ofuscado, credencial exposta, redirecionamento e execução adiada.

---

## Onde o Sentinela é chamado no sistema

```
lib/store.tsx · função send()
  ├── inspect()        antes de qualquer geração
  ├── log("block")     quando barra
  ├── log("pass")      quando libera, se o registro completo estiver ligado
  ├── log("vision")    quando manda imagem ao provedor externo
  └── log("web")       quando lê página de fora

components/Quarantine.tsx
  ├── scanCode()       ao montar o card de código
  ├── log("hold")      registra a retenção
  ├── log("release")   quando o usuário assina a liberação
  └── log("deny")      quando o usuário nega em definitivo
```

---

## Blocos em preparo

Marcados com a classe `.soon` e etiqueta *em preparo*. Estrutura pronta,
função ainda não ligada.

| Bloco | Ideia | Onde plugar |
|---|---|---|
| Linha do tempo | Barras por hora nas últimas 24h | Agrupar `entries()` por hora |
| Vigília programada | Faixa horária com filtro mais rígido | `{ from, to, strictness }` na config |
| Busca no registro | Texto e período | Filtrar antes de renderizar |
| Política de retenção | Descarte automático e anonimização | Antes do envio ao backend |
| Assinaturas próprias | Regex customizada pelo usuário | Somar ao array `SIGNATURES` |
| Sentinela de saída | Auditar a resposta do modelo | Novo passo após a geração |
| Assinatura por hash | Hash do código liberado | No momento do `release` |

---

## Integração com backend

Nada conectado. A aba **Cofre** mostra os campos previstos e diz claramente
que não há proteção ativa — o painel não afirma o que não existe.

Contrato planejado:

```
POST /auditoria
Authorization: Bearer <token>
{ "entries": LogEntry[] }
```

Criptografia planejada: AES-GCM com chave derivada por PBKDF2 do UID
autenticado, mantida apenas em memória durante a sessão.

Sugestão de coleção no Firestore:

```
sentinela_logs/{uid}/entries/{entryId}
  ts, kind, reason, detail, severity, sample
```

O campo `sample` guarda no máximo 120 caracteres. Antes de sair do
dispositivo, deveria passar por anonimização.

---

## Estrutura do arquivo

```
sentinela/
  index.html    painel completo: HTML, CSS e JS num arquivo só
  README.md     este documento
```

Sem dependência externa além das fontes do Google. Funciona offline se
as fontes forem substituídas por locais.
