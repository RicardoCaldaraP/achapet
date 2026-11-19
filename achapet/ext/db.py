"""Banco de dados: Flask-SQLAlchemy (ORM) sobre PostgreSQL + PostGIS (Supabase)."""

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event

db = SQLAlchemy()


def init_app(app):
    """Liga o ORM à aplicação (o objeto `db` é criado vazio e ligado depois)."""
    db.init_app(app)

    schema = app.config.get("DB_SCHEMA", "public")
    if schema != "public":
        # Toda conexão nova passa a procurar as tabelas primeiro neste schema.
        # "extensions" é onde o Supabase instala o PostGIS.
        with app.app_context():

            @event.listens_for(db.engine, "connect")
            def _definir_search_path(dbapi_conn, _record):
                with dbapi_conn.cursor() as cur:
                    cur.execute(f'SET search_path TO "{schema}", public, extensions')
                dbapi_conn.commit()
