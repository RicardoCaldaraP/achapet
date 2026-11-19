from flask import Blueprint

bp = Blueprint("mural", __name__, url_prefix="/mural")


def init_app(app):
    from achapet.blueprints.mural import routes  # noqa: F401

    app.register_blueprint(bp)
