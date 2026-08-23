#!/usr/bin/env python3
"""
PULSO ETERNO · VARREDURA DE AÇÕES
─────────────────────────────────────────────────────────────────
Lê o projeto inteiro e encontra tudo que é clicável. Gera um JSON
pronto para importar no Studio pelo botão de upload.

Uso:
    python scan_actions.py ../../                       # varre e imprime
    python scan_actions.py ../../ -o pulso-eterno.json  # salva
    python scan_actions.py ../../ --min 3               # ignora ruído

Sem dependência externa: só a biblioteca padrão.
"""

import argparse
import json
import re
import sys
from pathlib import Path

EXTENSOES = {".tsx", ".jsx", ".ts", ".js", ".html", ".vue", ".svelte"}
IGNORAR = {"node_modules", "dist", "build", ".git", ".next", "coverage", "vendor"}

# Handlers de várias famílias: React, Vue, Svelte e HTML puro.
HANDLER = re.compile(
    r"\b(?:on(?:Click|Change|Submit|Toggle|Select|Input|KeyDown)"
    r"|@click|v-on:click|on:click|onclick)\s*=",
    re.IGNORECASE,
)

# Fontes de rótulo, em ordem de qualidade.
ROTULOS = [
    re.compile(r'data-tip=["\'{`]([^"\'}`]+)'),
    re.compile(r'aria-label=["\'{`]([^"\'}`]+)'),
    re.compile(r'title=["\'{`]([^"\'}`]+)'),
    re.compile(r'placeholder=["\'{`]([^"\'}`]+)'),
    re.compile(r">\s*([A-Za-zÀ-ÿ][^<>{}\n]{2,44}?)\s*<"),
]
NOME_FN = re.compile(r"on\w+\s*=\s*\{?\s*\(?\)?\s*=>\s*(\w+)")
CLASSE = re.compile(r'className=["\'`]([\w-]+)|class=["\'`]([\w-]+)')

VAZIAS = {
    "de", "da", "do", "em", "no", "na", "para", "com", "o", "a", "e",
    "um", "uma", "que", "the", "of", "to", "on", "in",
}

TIPOS = [
    ("janela", re.compile(r"abrir|abre|fechar|painel|janela|galeria|modal|expandir|minimiz", re.I)),
    ("pessoa", re.compile(r"marcos|bobby|autor|perfil|quem|usuario|usuário", re.I)),
    ("produto", re.compile(r"projeto|case|documento|arquivo|pdf|prot[oó]tipo|download|baixar", re.I)),
]


def limpar(texto: str) -> str:
    return re.sub(r"\s+", " ", texto).strip()


def gatilhos(rotulo: str) -> list:
    """Deriva palavras-chave do rótulo, sem preposição nem artigo."""
    base = rotulo.lower()
    base = base.encode("ascii", "ignore").decode()  # tira acento
    palavras = [p for p in re.split(r"[^a-z0-9]+", base) if len(p) > 2 and p not in VAZIAS]
    vistos, saida = set(), []
    for p in palavras:
        if p not in vistos:
            vistos.add(p)
            saida.append(p)
    return saida[:6]


def classificar(rotulo: str) -> str:
    for tipo, padrao in TIPOS:
        if padrao.search(rotulo):
            return tipo
    return "acao"


def varrer_arquivo(caminho: Path, minimo: int) -> list:
    try:
        linhas = caminho.read_text(encoding="utf-8", errors="ignore").split("\n")
    except OSError:
        return []

    achados, vistos = [], set()

    for i, linha in enumerate(linhas):
        if not HANDLER.search(linha):
            continue

        # Janela de contexto: a linha e as cinco seguintes.
        janela = " ".join(linhas[i : i + 6])

        rotulo = ""
        for padrao in ROTULOS:
            achado = padrao.search(janela)
            if achado:
                rotulo = limpar(achado.group(1))
                break

        if not rotulo:
            fn = NOME_FN.search(linha)
            if fn:
                # camelCase vira frase legível.
                rotulo = re.sub(r"([a-z])([A-Z])", r"\1 \2", fn.group(1)).capitalize()

        if not rotulo:
            cls = CLASSE.search(janela)
            if cls:
                rotulo = (cls.group(1) or cls.group(2) or "").replace("-", " ").strip()

        if len(rotulo) < minimo:
            continue

        chave = rotulo.lower()
        if chave in vistos:
            continue
        vistos.add(chave)

        cls = CLASSE.search(janela)
        achados.append(
            {
                "label": rotulo[:60],
                "selector": f".{cls.group(1) or cls.group(2)}" if cls else "",
                "kind": classificar(rotulo),
                "origin": f"{caminho.name}:{i + 1}",
                "suggested": gatilhos(rotulo),
            }
        )

    return achados


def varrer(raiz: Path, minimo: int) -> list:
    todos = []
    for caminho in sorted(raiz.rglob("*")):
        if not caminho.is_file() or caminho.suffix not in EXTENSOES:
            continue
        if any(parte in IGNORAR for parte in caminho.parts):
            continue
        todos.extend(varrer_arquivo(caminho, minimo))
    return todos


def montar_mapa(achados: list) -> dict:
    """Converte os achados no formato que o Studio importa."""
    nos = []
    colunas = 4
    for indice, item in enumerate(achados):
        nos.append(
            {
                "id": f"scan{indice:03d}",
                "kind": item["kind"],
                "label": item["label"],
                "selector": item["selector"],
                "triggers": item["suggested"],
                "questions": [],
                "ttl": 4,
                "explains": False,
                "reactions": [],
                "x": 40 + (indice % colunas) * 165,
                "y": 40 + (indice // colunas) * 105,
                "source": "scan",
            }
        )
    return {"version": 2, "nodes": nos, "edges": [], "updatedAt": 0}


def main() -> int:
    parser = argparse.ArgumentParser(description="Varredura de ações para o Pulso Eterno")
    parser.add_argument("raiz", nargs="?", default=".", help="pasta do projeto")
    parser.add_argument("-o", "--saida", help="arquivo JSON de destino")
    parser.add_argument("--min", type=int, default=3, help="tamanho mínimo do rótulo")
    args = parser.parse_args()

    raiz = Path(args.raiz).resolve()
    if not raiz.exists():
        print(f"Pasta não encontrada: {raiz}", file=sys.stderr)
        return 1

    achados = varrer(raiz, args.min)
    mapa = montar_mapa(achados)
    conteudo = json.dumps(mapa, ensure_ascii=False, indent=2)

    if args.saida:
        Path(args.saida).write_text(conteudo, encoding="utf-8")
        print(f"{len(achados)} ações encontradas.")
        print(f"Mapa salvo em {args.saida}")
        print("Importe pelo botão de upload no Studio.")
    else:
        print(conteudo)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
