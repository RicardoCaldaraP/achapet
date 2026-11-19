"""Denúncias, ocultação automática e painel de moderação."""

from achapet.ext.db import db
from achapet.models import Denuncia
from achapet.services import usuarios
from tests.conftest import fazer_login


def denunciar(client, codigo, email, motivo="golpe"):
    fazer_login(client, email)
    resposta = client.post(f"/a/{codigo}/denunciar", data={"motivo": motivo, "detalhe": "Pix"})
    client.post("/sair")
    return resposta


def test_denunciar_anuncio(client, anuncio, outro_usuario):
    denunciar(client, anuncio.codigo, outro_usuario.email)
    denuncia = db.session.scalar(db.select(Denuncia))
    assert denuncia.motivo == "golpe"
    assert denuncia.situacao == "pendente"


def test_nao_pode_denunciar_duas_vezes_nem_o_proprio(client, anuncio, usuario, outro_usuario):
    denunciar(client, anuncio.codigo, outro_usuario.email)
    fazer_login(client, outro_usuario.email)
    resposta = client.post(
        f"/a/{anuncio.codigo}/denunciar", data={"motivo": "golpe"}, follow_redirects=True
    )
    assert "Você já denunciou este anúncio" in resposta.text
    client.post("/sair")

    fazer_login(client, usuario.email)
    resposta = client.post(
        f"/a/{anuncio.codigo}/denunciar", data={"motivo": "golpe"}, follow_redirects=True
    )
    assert "não pode denunciar o seu próprio anúncio" in resposta.text


def test_motivo_invalido(client, anuncio, outro_usuario):
    fazer_login(client, outro_usuario.email)
    resposta = client.post(
        f"/a/{anuncio.codigo}/denunciar", data={"motivo": "xyz"}, follow_redirects=True
    )
    assert "Escolha um motivo válido" in resposta.text


def test_tres_denuncias_ocultam_o_anuncio(client, anuncio):
    for i in range(3):
        u = usuarios.cadastrar(f"Vizinho {i}", f"v{i}@teste.com", f"552799999000{i}", "senha1234")
        denunciar(client, anuncio.codigo, u.email)
    db.session.refresh(anuncio)
    assert anuncio.status == "oculto"  # feito pelo trigger do banco
    assert client.get(f"/a/{anuncio.codigo}").status_code == 404  # visitante não vê
    assert client.get("/api/anuncios?raio=20").json["total"] == 0


def test_painel_bloqueado_para_usuario_comum(logado):
    assert logado.get("/moderacao/").status_code == 403


def test_moderador_remove_anuncio(client, anuncio, outro_usuario, moderador):
    denunciar(client, anuncio.codigo, outro_usuario.email)
    fazer_login(client, moderador.email)
    painel = client.get("/moderacao/")
    assert painel.status_code == 200
    assert anuncio.codigo in painel.text

    client.post(f"/moderacao/{anuncio.codigo}/decidir", data={"decisao": "remover"})
    db.session.refresh(anuncio)
    assert anuncio.status == "removido"
    assert db.session.scalar(db.select(Denuncia)).situacao == "procedente"


def test_moderador_mantem_anuncio_oculto(client, anuncio, moderador):
    anuncio.status = "oculto"
    db.session.add(Denuncia(anuncio_id=anuncio.id, motivo="outro"))
    db.session.commit()
    fazer_login(client, moderador.email)
    client.post(f"/moderacao/{anuncio.codigo}/decidir", data={"decisao": "manter"})
    db.session.refresh(anuncio)
    assert anuncio.status == "ativo"
    assert db.session.scalar(db.select(Denuncia)).situacao == "improcedente"


def test_decisao_invalida(client, anuncio, moderador):
    fazer_login(client, moderador.email)
    resposta = client.post(f"/moderacao/{anuncio.codigo}/decidir", data={"decisao": "talvez"})
    assert resposta.status_code == 400
