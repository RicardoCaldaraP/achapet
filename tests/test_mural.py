"""Mural, API de busca por raio e correspondências automáticas."""

from datetime import date, timedelta

from achapet.services import anuncios, busca
from tests.conftest import dados_anuncio


def test_pagina_do_mural(client):
    resposta = client.get("/mural/?raio=10&tipo=perdido")
    assert resposta.status_code == 200
    assert 'id="mapa"' in resposta.text


def test_api_busca_por_raio(client, usuario):
    anuncios.criar_anuncio(usuario, dados_anuncio(nome_pet="Perto"))  # Praia da Costa
    anuncios.criar_anuncio(
        usuario, dados_anuncio(nome_pet="Longe", latitude=-20.1992, longitude=-40.2531)
    )  # Serra, ~15 km

    perto = client.get("/api/anuncios?lat=-20.333&lng=-40.288&raio=5").json
    assert [a["nome_pet"] for a in perto["anuncios"]] == ["Perto"]
    assert perto["anuncios"][0]["distancia_m"] < 200

    longe = client.get("/api/anuncios?lat=-20.333&lng=-40.288&raio=20").json
    assert longe["total"] == 2


def test_api_filtra_por_tipo_especie_e_periodo(client, usuario):
    anuncios.criar_anuncio(usuario, dados_anuncio(nome_pet="Cao"))
    anuncios.criar_anuncio(
        usuario, dados_anuncio(nome_pet="Gata", especie="gato", tipo="encontrado")
    )
    anuncios.criar_anuncio(
        usuario, dados_anuncio(nome_pet="Antigo", data_ocorrencia=date.today() - timedelta(days=20))
    )

    def nomes(query):
        return {a["nome_pet"] for a in client.get(f"/api/anuncios?{query}").json["anuncios"]}

    assert nomes("especie=gato") == {"Gata"}
    assert nomes("tipo=perdido") == {"Cao", "Antigo"}
    assert nomes("periodo=7") == {"Cao", "Gata"}


def test_api_nunca_expoe_dados_privados(client, anuncio):
    item = client.get("/api/anuncios?raio=20").json["anuncios"][0]
    assert "telefone" not in item and "detalhe_oculto" not in item
    assert item["lat_aprox"] != -20.3328  # local arredondado


def test_api_rejeita_filtros_invalidos(client):
    resposta = client.get("/api/anuncios?raio=50")
    assert resposta.status_code == 400
    assert "raio" in resposta.json["detalhes"]


def test_anuncio_reencontrado_sai_do_mapa(client, anuncio):
    anuncios.marcar_reencontrado(anuncio)
    assert client.get("/api/anuncios?raio=20").json["total"] == 0


def test_correspondencias_entre_perdido_e_encontrado(usuario, outro_usuario):
    perdido = anuncios.criar_anuncio(usuario, dados_anuncio())  # cachorro médio preto/marrom
    encontrado = anuncios.criar_anuncio(
        outro_usuario,
        dados_anuncio(
            tipo="encontrado",
            nome_pet=None,
            sexo="nao_sei",
            cores=[4],
            latitude=-20.3405,
            longitude=-40.2902,
        ),
    )  # ~1 km, marrom
    anuncios.criar_anuncio(
        outro_usuario, dados_anuncio(tipo="encontrado", porte="grande", cores=[4])
    )  # porte diferente: não combina

    sugestoes = busca.sugerir_correspondencias(perdido.codigo, 5000)
    assert [s["codigo"] for s in sugestoes] == [encontrado.codigo]
    assert sugestoes[0]["cores_em_comum"] == 1


def test_autor_ve_correspondencias_na_pagina(logado, usuario, outro_usuario):
    perdido = anuncios.criar_anuncio(usuario, dados_anuncio())
    anuncios.criar_anuncio(outro_usuario, dados_anuncio(tipo="encontrado", nome_pet="Achado"))
    resposta = logado.get(f"/a/{perdido.codigo}")
    assert "Anúncios parecidos por perto" in resposta.text
    assert "Achado" in resposta.text
