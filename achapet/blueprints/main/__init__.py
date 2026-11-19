from flask import Blueprint

bp = Blueprint("main", __name__)


def init_app(app):
    from achapet.blueprints.main import routes  # noqa: F401

    app.register_blueprint(bp)
