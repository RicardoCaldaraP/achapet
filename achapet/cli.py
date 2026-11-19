"""Comandos de terminal: flask expirar | flask criar-moderador EMAIL | flask seed"""

import click

from achapet.ext.db import db
from achapet.services import anuncios, usuarios


def init_app(app):
    @app.cli.command("expirar")
    def expirar():
        """Marca como expirados os anúncios com mais de 30 dias sem renovação."""
        total = anuncios.expirar_vencidos()
        click.echo(f"{total} anúncio(s) expirado(s).")

    @app.cli.command("criar-moderador")
    @click.argument("email")
    def criar_moderador(email):
        """Dá o papel de moderador a um usuário já cadastrado."""
        usuario = usuarios.buscar_por_email(email)
        if not usuario:
            raise click.ClickException(f"Usuário {email} não encontrado.")
        usuario.papel = "moderador"
        db.session.commit()
        click.echo(f"{email} agora é moderador.")

    @app.cli.command("seed")
    @click.option("--senha", default="achapet123", help="Senha dos usuários de demonstração.")
    def seed(senha):
        """Cria usuários e anúncios de demonstração na Grande Vitória (ES)."""
        from achapet.seed import popular

        resumo = popular(senha)
        click.echo(resumo)
