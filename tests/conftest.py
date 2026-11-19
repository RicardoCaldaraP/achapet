"""Fixtures compartilhadas pelos testes.

Os testes usam um schema separado ("testes") no mesmo banco PostgreSQL:
ele é criado no início da suíte com o mesmo script do modelo físico e apagado
no fim. Entre um teste e outro as tabelas são esvaziadas, então cada teste
começa com o banco limpo (só com a lista de cores).
"""

import io
from datetime import date
from pathlib import Path

import pytest
from PIL import Image
from sqlalchemy import text

from achapet import create_app
from achapet.ext.db import db
from achapet.services import anuncios, usuarios

SCRIPT_SQL = Path(__file__).resolve().parents[1] / "migrations" / "sql" / "0001_modelo_fisico.sql"
TABELAS = "usuario, anuncio, foto, anuncio_cor, denuncia, avistamento, alerta_regiao"


@pytest.fixture(scope="session")
def app():
    app = create_app("test")
    schema = app.config["DB_SCHEMA"]
    with app.app_context():
        with db.engine.begin() as conn:
            conn.exec_driver_sql(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
            conn.exec_driver_sql(f'CREATE SCHEMA "{schema}"')
        db.engine.dispose()  # novas conexões já entram com o search_path do schema de teste
        with db.engine.begin() as conn:
            conn.exec_driver_sql(SCRIPT_SQL.read_text(encoding="utf-8"))
    yield app
    with app.app_context():
        db.session.remove()
        with db.engine.begin() as conn:
            conn.exec_driver_sql(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
        db.engine.dispose()


@pytest.fixture(autouse=True)
def banco_limpo(app):
    yield
    db.session.rollback()
    db.session.execute(text(f"TRUNCATE {TABELAS} RESTART IDENTITY CASCADE"))
    db.session.commit()
    db.session.remove()


# ---------- usuários ----------
@pytest.fixture
def usuario(app):
    return usuarios.cadastrar("Ana Tutora", "ana@teste.com", "5527999991111", "senha1234")


@pytest.fixture
def outro_usuario(app):
    return usuarios.cadastrar("Beto Vizinho", "beto@teste.com", "5527999992222", "senha1234")


@pytest.fixture
def moderador(app):
    m = usuarios.cadastrar("Mod Erador", "mod@teste.com", "5527999993333", "senha1234")
    m.papel = "moderador"
    db.session.commit()
    return m


def fazer_login(client, email, senha="senha1234"):
    return client.post("/entrar", data={"email": email, "senha": senha})


@pytest.fixture
def logado(client, usuario):
    """Cliente já autenticado como `usuario`."""
    fazer_login(client, usuario.email)
    return client


# ---------- anúncios ----------
def dados_anuncio(**extra):
    dados = {
        "tipo": "perdido",
        "especie": "cachorro",
        "porte": "medio",
        "sexo": "macho",
        "nome_pet": "Thor",
        "raca": "SRD",
        "descricao": "Coleira vermelha",
        "detalhe_oculto": "Mancha na orelha",
        "data_ocorrencia": date.today(),
        "latitude": -20.3328,
        "longitude": -40.2876,
        "bairro": "Praia da Costa",
        "cidade": "Vila Velha",
        "uf": "ES",
        "cores": [1, 4],  # preto, marrom
    }
    dados.update(extra)
    return dados


def form_anuncio(**extra):
    """Dados no formato do formulário HTML (o que o navegador envia)."""
    dados = dados_anuncio(**extra)
    dados["data_ocorrencia"] = dados["data_ocorrencia"].isoformat()
    return dados


@pytest.fixture
def anuncio(usuario):
    return anuncios.criar_anuncio(usuario, dados_anuncio())


@pytest.fixture
def imagem_png():
    """Gera uma imagem PNG em memória para simular o upload de fotos."""

    def _gerar(nome="foto.png"):
        buffer = io.BytesIO()
        Image.new("RGB", (1600, 1200), (200, 120, 60)).save(buffer, format="PNG")
        buffer.seek(0)
        return (buffer, nome)

    return _gerar
