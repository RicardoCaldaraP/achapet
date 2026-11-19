"""Publicação, página, cartaz e gestão dos anúncios."""

from datetime import date, datetime, timedelta, timezone

import pytest

from achapet.ext.db import db
from achapet.models import Anuncio
from achapet.services import RegraNegocioError, anuncios
from tests.conftest import dados_anuncio, fazer_login, form_anuncio


# ---------- publicar ----------
def test_publicar_anuncio_com_fotos(logado, imagem_png):
    dados = form_anuncio()
    dados["fotos"] = [imagem_png("a.png"), imagem_png("b.png")]
    resposta = logado.post("/anuncios/novo", data=dados, content_type="multipart/form-data")
    assert resposta.status_code == 302

    anuncio = db.session.scalar(db.select(Anuncio))
    assert resposta.headers["Location"] == f"/a/{anuncio.codigo}"
    assert len(anuncio.codigo) == 6  # código curto gerado pelo banco
    assert anuncio.status == "ativo"
    assert anuncio.expira_em > datetime.now(timezone.utc) + timedelta(days=29)
    assert [c.nome for c in anuncio.cores] == ["marrom", "preto"]
    assert len(anuncio.fotos) == 2
    assert round(anuncio.lat, 4) == -20.3328


def test_publicar_sem_cor_e_sem_local_mostra_erros(logado):
    dados = form_anuncio(cores=[])
    dados.pop("latitude")
    dados.pop("longitude")
    resposta = logado.post("/anuncios/novo", data=dados)
    assert resposta.status_code == 200
    assert "Marque pelo menos uma cor" in resposta.text
    assert "Marque no mapa onde o animal foi visto" in resposta.text
    assert db.session.scalar(db.select(db.func.count(Anuncio.id))) == 0


def test_publicar_rejeita_data_futura_e_local_fora_do_brasil(logado):
    dados = form_anuncio(
        data_ocorrencia=date.today() + timedelta(days=2), latitude=48.85, longitude=2.35
    )
    resposta = logado.post("/anuncios/novo", data=dados)
    assert "A data não pode estar no futuro." in resposta.text
    assert "O local precisa estar no Brasil." in resposta.text


def test_publicar_no_maximo_tres_fotos(logado, imagem_png):
    dados = form_anuncio()
    dados["fotos"] = [imagem_png(f"{i}.png") for i in range(4)]
    resposta = logado.post("/anuncios/novo", data=dados, content_type="multipart/form-data")
    assert "Envie no máximo 3 fotos." in resposta.text


def test_publicar_rejeita_arquivo_que_nao_e_imagem(logado):
    import io

    dados = form_anuncio()
    dados["fotos"] = [(io.BytesIO(b"isto nao e imagem"), "virus.jpg")]
    resposta = logado.post("/anuncios/novo", data=dados, content_type="multipart/form-data")
    assert "não é uma imagem válida" in resposta.text
    assert db.session.scalar(db.select(db.func.count(Anuncio.id))) == 0


def test_limite_de_cinco_anuncios_por_dia(usuario):
    for _ in range(5):
        anuncios.criar_anuncio(usuario, dados_anuncio())
    with pytest.raises(RegraNegocioError, match="5 anúncios"):
        anuncios.criar_anuncio(usuario, dados_anuncio())


# ---------- página do anúncio ----------
def test_pagina_publica_esconde_telefone_de_visitante(client, anuncio):
    resposta = client.get(f"/a/{anuncio.codigo.lower()}")  # código não diferencia maiúsculas
    assert resposta.status_code == 200
    assert "Thor" in resposta.text
    assert "Cuidado com golpes" in resposta.text
    assert "99999-1111" not in resposta.text
    assert "Entrar para ver o contato" in resposta.text
    assert "Mancha na orelha" not in resposta.text  # detalhe secreto só para o autor


def test_pagina_mostra_telefone_para_usuario_logado(client, anuncio, outro_usuario):
    fazer_login(client, outro_usuario.email)
    resposta = client.get(f"/a/{anuncio.codigo}")
    assert "(27) 99999-1111" in resposta.text
    assert "wa.me/5527999991111" in resposta.text


def test_autor_ve_detalhe_secreto_e_botoes_de_gestao(logado, anuncio):
    resposta = logado.get(f"/a/{anuncio.codigo}")
    assert "Mancha na orelha" in resposta.text
    assert "Marcar como reencontrado" in resposta.text


def test_pagina_do_anuncio_nao_mostra_coordenada_exata(client, anuncio):
    resposta = client.get(f"/a/{anuncio.codigo}")
    assert "-20.3328" not in resposta.text
    assert 'data-lat="-20.334"' in resposta.text  # arredondado para a grade de ~300 m


def test_anuncio_inexistente_404(client):
    assert client.get("/a/ZZZZZZ").status_code == 404


def test_cartaz_tem_qr_code_e_nao_tem_telefone(client, anuncio):
    resposta = client.get(f"/a/{anuncio.codigo}/cartaz")
    assert resposta.status_code == 200
    assert "PROCURA-SE" in resposta.text
    assert "data:image/png;base64," in resposta.text
    assert "99999-1111" not in resposta.text


# ---------- gestão (só o autor) ----------
def test_editar_anuncio(logado, anuncio):
    dados = form_anuncio(nome_pet="Thor Atualizado", cores=[2])
    resposta = logado.post(f"/a/{anuncio.codigo}/editar", data=dados)
    assert resposta.status_code == 302
    db.session.refresh(anuncio)
    assert anuncio.nome_pet == "Thor Atualizado"
    assert [c.nome for c in anuncio.cores] == ["branco"]


def test_editar_anuncio_de_outra_pessoa_e_proibido(client, anuncio, outro_usuario):
    fazer_login(client, outro_usuario.email)
    assert client.get(f"/a/{anuncio.codigo}/editar").status_code == 403
    assert client.post(f"/a/{anuncio.codigo}/excluir").status_code == 403


def test_renovar_anuncio_expirado(logado, anuncio):
    anuncio.expira_em = datetime.now(timezone.utc) - timedelta(days=1)
    db.session.commit()
    assert anuncios.expirar_vencidos() == 1
    db.session.refresh(anuncio)
    assert anuncio.status == "expirado"

    logado.post(f"/a/{anuncio.codigo}/renovar")
    db.session.refresh(anuncio)
    assert anuncio.status == "ativo"
    assert anuncio.expira_em > datetime.now(timezone.utc) + timedelta(days=29)


def test_marcar_reencontrado(logado, anuncio):
    resposta = logado.post(f"/a/{anuncio.codigo}/reencontrado", follow_redirects=True)
    assert "já voltou para casa" in resposta.text
    db.session.refresh(anuncio)
    assert anuncio.status == "reencontrado"
    assert anuncio.reencontrado_em is not None


def test_excluir_anuncio(logado, anuncio):
    resposta = logado.post(f"/a/{anuncio.codigo}/excluir")
    assert resposta.headers["Location"] == "/meus-anuncios"
    assert db.session.scalar(db.select(db.func.count(Anuncio.id))) == 0


def test_acao_desconhecida_404(logado, anuncio):
    assert logado.post(f"/a/{anuncio.codigo}/explodir").status_code == 404


def test_meus_anuncios_lista_so_os_do_usuario(logado, anuncio, outro_usuario):
    anuncios.criar_anuncio(outro_usuario, dados_anuncio(nome_pet="Rex"))
    resposta = logado.get("/meus-anuncios")
    assert "Thor" in resposta.text
    assert "Rex" not in resposta.text
