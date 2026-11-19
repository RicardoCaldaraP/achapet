"""Configurações da aplicação, separadas por ambiente.

A factory escolhe a classe pelo nome: create_app("dev"), create_app("test"), create_app("prod").
Todos os segredos vêm de variáveis de ambiente (arquivo .env em desenvolvimento).
"""

import os
import tempfile

from dotenv import load_dotenv

load_dotenv()


def _normalizar_url_banco(url: str | None) -> str | None:
    """Garante o driver psycopg 3 na URL do SQLAlchemy.

    O painel do Supabase entrega a URL como "postgresql://..." (ou "postgres://...").
    """
    if not url:
        return url
    for prefixo in ("postgres://", "postgresql://"):
        if url.startswith(prefixo):
            return "postgresql+psycopg://" + url[len(prefixo) :]
    return url


class Config:
    """Configuração base, herdada pelos ambientes."""

    SECRET_KEY = os.getenv("SECRET_KEY", "troque-esta-chave-em-producao")

    SQLALCHEMY_DATABASE_URI = _normalizar_url_banco(os.getenv("DATABASE_URL"))
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}
    # Schema do Postgres onde ficam as tabelas (os testes usam um schema separado).
    DB_SCHEMA = os.getenv("DB_SCHEMA", "public")

    # Upload: 3 fotos já comprimidas no navegador cabem com folga em 12 MB.
    MAX_CONTENT_LENGTH = 12 * 1024 * 1024
    FOTOS_POR_ANUNCIO = 3
    FOTO_LADO_MAXIMO_PX = 1280

    # Armazenamento das fotos: "supabase" (Storage) ou "local" (pasta static/uploads).
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "fotos")
    STORAGE_BACKEND = os.getenv(
        "STORAGE_BACKEND", "supabase" if os.getenv("SUPABASE_SERVICE_KEY") else "local"
    )
    UPLOAD_FOLDER = os.getenv(
        "UPLOAD_FOLDER", os.path.join(os.path.dirname(__file__), "achapet", "static", "uploads")
    )

    # Regras de negócio do MVP
    LIMITE_ANUNCIOS_POR_DIA = 5
    DIAS_VALIDADE_ANUNCIO = 30
    RAIO_PADRAO_M = 5000
    RAIO_CORRESPONDENCIA_M = 5000
    # Centro padrão do mapa: Vitória (ES), onde o piloto acontece.
    MAPA_CENTRO_PADRAO = (-20.3155, -40.3128)

    # Serviços externos
    NOMINATIM_URL = "https://nominatim.openstreetmap.org"
    NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "AchaPet/1.0 (projeto academico UVV)")
    SERVICOS_EXTERNOS_ATIVOS = True

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")


class DevConfig(Config):
    DEBUG = True
    LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG")


class TestConfig(Config):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SECRET_KEY = "chave-de-teste"
    SQLALCHEMY_DATABASE_URI = _normalizar_url_banco(
        os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
    )
    # Os testes rodam num schema próprio, criado e apagado pela suíte.
    # Assim dá para usar o mesmo banco do Supabase sem tocar nos dados reais.
    DB_SCHEMA = "testes"
    STORAGE_BACKEND = "local"
    UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), "achapet-testes-uploads")
    SERVICOS_EXTERNOS_ATIVOS = False
    LOG_LEVEL = "WARNING"


class ProdConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    PREFERRED_URL_SCHEME = "https"


configs = {
    "dev": DevConfig,
    "test": TestConfig,
    "prod": ProdConfig,
}
