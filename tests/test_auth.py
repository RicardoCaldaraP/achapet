"""Cadastro, login, conta e exclusão (LGPD)."""

from achapet.ext.db import db
from achapet.models import Anuncio, Usuario
from tests.conftest import fazer_login

CADASTRO_OK = {
    "nome": "Carla Souza",
    "email": "Carla@Teste.com",
    "telefone": "(27) 99876-5432",
    "perfil": "pessoa",
    "senha": "segura123",
    "confirmar_senha": "segura123",
    "aceite_termos": "y",
}


def test_cadastro_valido_normaliza_dados_e_loga(client):
    resposta = client.post("/cadastro", data=CADASTRO_OK)
    assert resposta.status_code == 302
    usuario = db.session.scalar(db.select(Usuario))
    assert usuario.email == "carla@teste.com"
    assert usuario.telefone == "5527998765432"
    assert usuario.aceite_termos_em is not None
    assert usuario.senha_hash != "segura123"  # senha guardada só como hash
    assert client.get("/meus-anuncios").status_code == 200  # já está logado


def test_cadastro_exige_aceite_dos_termos(client):
    dados = {**CADASTRO_OK, "aceite_termos": ""}
    resposta = client.post("/cadastro", data=dados)
    assert resposta.status_code == 200
    assert "É preciso aceitar os termos." in resposta.text


def test_cadastro_rejeita_telefone_invalido(client):
    resposta = client.post("/cadastro", data={**CADASTRO_OK, "telefone": "1234"})
    assert "Informe um telefone válido" in resposta.text


def test_cadastro_rejeita_senha_fraca_e_diferente(client):
    resposta = client.post(
        "/cadastro", data={**CADASTRO_OK, "senha": "abc", "confirmar_senha": "xyz"}
    )
    assert "8 caracteres ou mais" in resposta.text
    assert "As senhas não conferem." in resposta.text


def test_cadastro_rejeita_email_repetido(client, usuario):
    resposta = client.post("/cadastro", data={**CADASTRO_OK, "email": "ANA@teste.com"})
    assert "Já existe uma conta com este e-mail." in resposta.text


def test_login_e_logout(client, usuario):
    resposta = fazer_login(client, "ana@teste.com")
    assert resposta.status_code == 302
    assert client.get("/conta").status_code == 200
    client.post("/sair")
    assert client.get("/conta").status_code == 302  # volta para o login


def test_login_com_senha_errada(client, usuario):
    resposta = fazer_login(client, usuario.email, "errada999")
    assert resposta.status_code == 200
    assert "E-mail ou senha incorretos." in resposta.text


def test_login_nao_redireciona_para_site_externo(client, usuario):
    resposta = client.post(
        "/entrar?next=https://site-malicioso.com",
        data={"email": usuario.email, "senha": "senha1234"},
    )
    assert resposta.headers["Location"] == "/mural/"


def test_rotas_protegidas_pedem_login(client):
    for rota in ("/anuncios/novo", "/meus-anuncios", "/conta"):
        resposta = client.get(rota)
        assert resposta.status_code == 302
        assert "/entrar" in resposta.headers["Location"]


def test_editar_dados_da_conta(logado, usuario):
    resposta = logado.post(
        "/conta", data={"nome": "Ana Maria", "telefone": "27 3333-4444", "perfil": "protetor"}
    )
    assert resposta.status_code == 302
    db.session.refresh(usuario)
    assert usuario.nome == "Ana Maria"
    assert usuario.telefone == "552733334444"
    assert usuario.perfil == "protetor"


def test_excluir_conta_apaga_anuncios(logado, usuario, anuncio):
    resposta = logado.post("/conta/excluir", data={"senha": "senha1234"})
    assert resposta.status_code == 302
    db.session.expire_all()
    assert db.session.scalar(db.select(db.func.count(Usuario.id))) == 0
    assert db.session.scalar(db.select(db.func.count(Anuncio.id))) == 0


def test_excluir_conta_exige_senha_correta(logado, usuario):
    logado.post("/conta/excluir", data={"senha": "errada999"})
    assert db.session.get(Usuario, usuario.id) is not None
