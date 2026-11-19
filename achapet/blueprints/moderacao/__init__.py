from flask import Blueprint

bp = Blueprint("moderacao", __name__, url_prefix="/moderacao")


def init_app(app):
    from achapet.blueprints.moderacao import routes  # noqa: F401

    app.register_blueprint(bp)
