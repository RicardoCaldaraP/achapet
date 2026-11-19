"""Testes da aplicação em geral: factory, páginas públicas e tratamento de erros."""

from achapet import create_app


def test_factory_cria_apps_independentes():
    dev = create_app("dev")
    teste = create_app("test")
    assert dev is not teste
    assert teste.config["TESTING"] is True
    assert dev.config["DEBUG"] is True


def test_blueprints_registrados(app):
    assert {"main", "auth", "mural", "anuncios", "moderacao", "api"} <= set(app.blueprints)


def test_health(client):
    resposta = client.get("/api/health")
    assert resposta.status_code == 200
    assert resposta.json == {"status": "ok"}


def test_pagina_inicial(client, anuncio):
    resposta = client.get("/")
    assert resposta.status_code == 200
    assert "Bora trazer ele de volta pra casa" in resposta.text
    assert "Thor" in resposta.text


def test_termos(client):
    assert client.get("/termos").status_code == 200


def test_404_em_html(client):
    resposta = client.get("/pagina-que-nao-existe")
    assert resposta.status_code == 404
    assert "Página não encontrada" in resposta.text


def test_404_na_api_responde_json(client):
    resposta = client.get("/api/nao-existe")
    assert resposta.status_code == 404
    assert resposta.json["erro"] == "Página não encontrada"


def test_erro_inesperado_vira_500(app, client, monkeypatch):
    from achapet.services import busca

    def explodir(*args, **kwargs):
        raise RuntimeError("falha simulada")

    monkeypatch.setattr(busca, "buscar_anuncios", explodir)
    resposta = client.get("/api/anuncios")
    assert resposta.status_code == 500
    assert resposta.json["erro"] == "Erro no servidor"
