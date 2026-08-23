# Handoff do projeto Bobby

Arquivos principais:

- `DOCUMENTACAO.md`: arquitetura, mermaid, pipeline e funcoes atuais.
- `Marcos Eduardo/PENDENCIAS.md`: inventario detalhado do que falta.
- `src/lib/store.tsx`: estado global e pipeline `send()`.
- `src/lib/rag.ts`: vector store local/remoto e JSON da base.
- `src/lib/tools.ts`: comandos que a IA executa na interface.
- `src/lib/sentinela.ts` e `src/lib/quarantine.ts`: seguranca.
- `src/components/Chat.tsx`: conversa, input e cards.
- `src/components/GalleryWindow.tsx` e `src/components/Panels.tsx`: galeria e historico.

Antes de continuar:

1. Ler `DOCUMENTACAO.md`.
2. Ler `Marcos Eduardo/PENDENCIAS.md`.
3. Rodar o build.
4. Nao declarar integracao externa pronta sem endpoint/chave/teste real.
5. Preservar a persona honesta do Bobby e o Sentinela como firewall.
