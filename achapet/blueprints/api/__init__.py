from flask import Blueprint

bp = Blueprint("api", __name__, url_prefix="/api")


def init_app(app):
    from achapet.blueprints.api import routes  # noqa: F401

    app.register_blueprint(bp)
