"""Formulários de cadastro, login e conta (validados no servidor com WTForms)."""

from flask_wtf import FlaskForm
from wtforms import BooleanField, EmailField, PasswordField, SelectField, StringField, TelField
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError

from achapet.models import PERFIS
from achapet.services import usuarios
from achapet.validators import SenhaForte, TelefoneBR

OPCOES_PERFIL = list(PERFIS.items())


class CadastroForm(FlaskForm):
    nome = StringField(
        "Nome completo",
        validators=[
            DataRequired("Informe seu nome."),
            Length(2, 100, "O nome deve ter entre 2 e 100 letras."),
        ],
    )
    email = EmailField(
        "E-mail",
        validators=[
            DataRequired("Informe seu e-mail."),
            Email("E-mail inválido."),
            Length(max=254),
        ],
    )
    telefone = TelField(
        "WhatsApp (com DDD)",
        validators=[DataRequired("Informe um telefone para contato."), TelefoneBR()],
    )
    perfil = SelectField("Você é", choices=OPCOES_PERFIL, default="pessoa")
    senha = PasswordField("Senha", validators=[DataRequired("Crie uma senha."), SenhaForte()])
    confirmar_senha = PasswordField(
        "Confirme a senha",
        validators=[DataRequired("Repita a senha."), EqualTo("senha", "As senhas não conferem.")],
    )
    aceite_termos = BooleanField(
        "Li e aceito os termos de uso e a política de privacidade",
        validators=[DataRequired("É preciso aceitar os termos.")],
    )

    def validate_email(self, field):
        if usuarios.buscar_por_email(field.data):
            raise ValidationError("Já existe uma conta com este e-mail.")


class LoginForm(FlaskForm):
    email = EmailField(
        "E-mail", validators=[DataRequired("Informe seu e-mail."), Email("E-mail inválido.")]
    )
    senha = PasswordField("Senha", validators=[DataRequired("Informe sua senha.")])
    lembrar = BooleanField("Manter conectado")


class ContaForm(FlaskForm):
    nome = StringField("Nome completo", validators=[DataRequired(), Length(2, 100)])
    telefone = TelField("WhatsApp (com DDD)", validators=[DataRequired(), TelefoneBR()])
    perfil = SelectField("Você é", choices=OPCOES_PERFIL)


class ExcluirContaForm(FlaskForm):
    senha = PasswordField(
        "Digite sua senha para confirmar", validators=[DataRequired("Digite sua senha.")]
    )
