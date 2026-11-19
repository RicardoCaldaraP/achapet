"""Filtros do mural (validados no servidor tanto na página quanto na API)."""

from datetime import date, timedelta

from flask_wtf import FlaskForm
from wtforms import FloatField, IntegerField, SelectField
from wtforms.validators import NumberRange, Optional

from achapet.models import ESPECIES, TIPOS

PERIODOS = [
    ("", "Qualquer data"),
    ("7", "Últimos 7 dias"),
    ("15", "Últimos 15 dias"),
    ("30", "Últimos 30 dias"),
]


class FiltroMuralForm(FlaskForm):
    """Lê os filtros da query string (?lat=..&raio=..). Não precisa de CSRF: é uma busca."""

    class Meta:
        csrf = False

    lat = FloatField(validators=[Optional(), NumberRange(-34.0, 5.5)])
    lng = FloatField(validators=[Optional(), NumberRange(-74.0, -34.0)])
    raio = IntegerField(
        "Raio", default=5, validators=[Optional(), NumberRange(1, 20, "O raio vai de 1 a 20 km.")]
    )
    tipo = SelectField(
        "Tipo",
        choices=[("", "Perdidos e encontrados"), *TIPOS.items()],
        default="",
        validators=[Optional()],
    )
    especie = SelectField(
        "Espécie",
        choices=[("", "Todas as espécies"), *ESPECIES.items()],
        default="",
        validators=[Optional()],
    )
    periodo = SelectField("Período", choices=PERIODOS, default="", validators=[Optional()])

    def desde(self) -> date | None:
        return date.today() - timedelta(days=int(self.periodo.data)) if self.periodo.data else None

    def raio_metros(self) -> int:
        return (self.raio.data or 5) * 1000
