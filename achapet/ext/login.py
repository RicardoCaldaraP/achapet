"""Autenticação de sessão com Flask-Login."""

import uuid

from flask_login import LoginManager

from achapet.ext.db import db

login_manager = LoginManager()


def init_app(app):
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Entre na sua conta para continuar."
    login_manager.login_message_category = "info"

    from achapet.models import Usuario

    @login_manager.user_loader
    def carregar_usuario(user_id: str):
        try:
            return db.session.get(Usuario, uuid.UUID(user_id))
        except ValueError:
            return None
