from flask import Blueprint

bp = Blueprint("anuncios", __name__)


def init_app(app):
    from achapet.blueprints.anuncios import routes  # noqa: F401

    app.register_blueprint(bp)
