"""Formulários de anúncio e de denúncia."""

from datetime import date, timedelta

from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed
from sqlalchemy import select
from wtforms import (
    DateField,
    FloatField,
    MultipleFileField,
    RadioField,
    SelectField,
    SelectMultipleField,
    StringField,
    TextAreaField,
)
from wtforms.validators import (
    DataRequired,
    InputRequired,
    Length,
    NumberRange,
    Optional,
    ValidationError,
)
from wtforms.widgets import CheckboxInput, ListWidget

from achapet.ext.db import db
from achapet.models import ESPECIES, MOTIVOS, PORTES, SEXOS, TIPOS, Cor

EXTENSOES_FOTO = ["jpg", "jpeg", "png", "webp", "heic", "heif"]


class CheckboxesField(SelectMultipleField):
    """Lista de caixas de seleção (usada nas cores da pelagem)."""

    widget = ListWidget(prefix_label=False)
    option_widget = CheckboxInput()


class AnuncioForm(FlaskForm):
    tipo = RadioField(
        "O que aconteceu?",
        choices=list(TIPOS.items()),
        validators=[InputRequired("Diga se o animal foi perdido ou encontrado.")],
    )
    especie = SelectField("Espécie", choices=list(ESPECIES.items()), validators=[InputRequired()])
    porte = SelectField("Porte", choices=list(PORTES.items()), validators=[InputRequired()])
    sexo = SelectField("Sexo", choices=list(SEXOS.items()), default="nao_sei")
    cores = CheckboxesField("Cores da pelagem", coerce=int)
    nome_pet = StringField("Nome do animal", validators=[Optional(), Length(max=60)])
    raca = StringField("Raça", validators=[Optional(), Length(max=60)])
    descricao = TextAreaField(
        "Descrição",
        validators=[Optional(), Length(max=1000, message="Use no máximo 1000 caracteres.")],
    )
    detalhe_oculto = StringField(
        "Detalhe secreto (só você vê)", validators=[Optional(), Length(max=200)]
    )
    data_ocorrencia = DateField(
        "Quando aconteceu?", default=date.today, validators=[DataRequired("Informe a data.")]
    )

    # Local: preenchido pelo mapa, GPS ou CEP (campos escondidos + endereço visível).
    latitude = FloatField(
        validators=[
            InputRequired("Marque no mapa onde o animal foi visto pela última vez."),
            NumberRange(-34.0, 5.5, "O local precisa estar no Brasil."),
        ]
    )
    longitude = FloatField(
        validators=[
            InputRequired("Marque no mapa onde o animal foi visto pela última vez."),
            NumberRange(-74.0, -34.0, "O local precisa estar no Brasil."),
        ]
    )
    cep = StringField("CEP", validators=[Optional(), Length(max=9)])
    bairro = StringField("Bairro", validators=[Optional(), Length(max=80)])
    cidade = StringField("Cidade", validators=[Optional(), Length(max=80)])
    uf = StringField("UF", validators=[Optional(), Length(min=2, max=2)])

    fotos = MultipleFileField(
        "Fotos (até 3)",
        validators=[FileAllowed(EXTENSOES_FOTO, "Envie fotos em JPG, PNG ou WEBP.")],
    )

    def __init__(self, *args, max_fotos: int = 3, **kwargs):
        super().__init__(*args, **kwargs)
        self.max_fotos = max_fotos
        self.cores.choices = [
            (c.id, c.nome) for c in db.session.scalars(select(Cor).order_by(Cor.id))
        ]

    def validate_cores(self, field):
        if not field.data:
            raise ValidationError(
                "Marque pelo menos uma cor (ela é usada para achar anúncios " "parecidos)."
            )

    def validate_data_ocorrencia(self, field):
        if field.data > date.today():
            raise ValidationError("A data não pode estar no futuro.")
        if field.data < date.today() - timedelta(days=365):
            raise ValidationError("A data deve ser de no máximo um ano atrás.")

    def validate_fotos(self, field):
        enviadas = [f for f in (field.data or []) if f and getattr(f, "filename", "")]
        if len(enviadas) > self.max_fotos:
            raise ValidationError(f"Envie no máximo {self.max_fotos} fotos.")

    def validate_uf(self, field):
        if field.data and not field.data.isalpha():
            raise ValidationError("UF inválida.")

    def dados(self) -> dict:
        """Dicionário com os campos validados, no formato esperado pelo serviço."""
        return {
            "tipo": self.tipo.data,
            "especie": self.especie.data,
            "porte": self.porte.data,
            "sexo": self.sexo.data,
            "nome_pet": self.nome_pet.data,
            "raca": self.raca.data,
            "descricao": self.descricao.data,
            "detalhe_oculto": self.detalhe_oculto.data,
            "data_ocorrencia": self.data_ocorrencia.data,
            "latitude": self.latitude.data,
            "longitude": self.longitude.data,
            "bairro": self.bairro.data,
            "cidade": self.cidade.data,
            "uf": self.uf.data,
            "cores": self.cores.data,
        }


class DenunciaForm(FlaskForm):
    motivo = SelectField(
        "Motivo", choices=list(MOTIVOS.items()), validators=[InputRequired("Escolha um motivo.")]
    )
    detalhe = TextAreaField(
        "Conte o que aconteceu (opcional)", validators=[Optional(), Length(max=500)]
    )


class AcaoForm(FlaskForm):
    """Formulário vazio: só carrega o token CSRF dos botões de ação (renovar, excluir...)."""
