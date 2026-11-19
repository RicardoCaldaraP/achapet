"""Migrations do banco com Flask-Migrate (Alembic).

Comandos: flask db upgrade | flask db current | flask db history
"""

from pathlib import Path

from flask_migrate import Migrate

from achapet.ext.db import db

migrate = Migrate()

PASTA_MIGRATIONS = Path(__file__).resolve().parents[2] / "migrations"


def init_app(app):
    migrate.init_app(app, db, directory=str(PASTA_MIGRATIONS))
