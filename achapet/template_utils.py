"""Filtros e variáveis globais disponíveis em todos os templates Jinja2."""

from datetime import date, datetime
from urllib.parse import quote

MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


def data_br(valor) -> str:
    """date/datetime -> '19 nov 2026'"""
    if not valor:
        return ""
    if isinstance(valor, str):
        valor = date.fromisoformat(valor[:10])
    return f"{valor.day:02d} {MESES[valor.month - 1]} {valor.year}"


def tempo_relativo(valor) -> str:
    """'hoje', 'ontem', 'há 5 dias'"""
    if not valor:
        return ""
    if isinstance(valor, datetime):
        valor = valor.date()
    dias = (date.today() - valor).days
    if dias <= 0:
        return "hoje"
    if dias == 1:
        return "ontem"
    return f"há {dias} dias"


def distancia(metros) -> str:
    if metros is None:
        return ""
    return f"{metros} m" if metros < 1000 else f"{metros / 1000:.1f} km".replace(".", ",")


def link_whatsapp(texto: str, telefone: str | None = None) -> str:
    """Link wa.me para compartilhar (sem telefone) ou falar com alguém (com telefone)."""
    base = f"https://wa.me/{telefone}" if telefone else "https://wa.me/"
    return f"{base}?text={quote(texto)}"


def init_app(app):
    app.jinja_env.filters.update(
        data_br=data_br, tempo_relativo=tempo_relativo, distancia=distancia
    )
    app.jinja_env.globals.update(link_whatsapp=link_whatsapp)

    @app.context_processor
    def variaveis_globais():
        return {"hoje": date.today().isoformat()}
