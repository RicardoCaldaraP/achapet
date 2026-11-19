from flask import Blueprint

bp = Blueprint("auth", __name__)


def init_app(app):
    from achapet.blueprints.auth import routes  # noqa: F401  (registra as rotas no bp)

    app.register_blueprint(bp)
