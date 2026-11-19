"""Serviços externos (CEP, Nominatim e Supabase Storage) com as chamadas HTTP simuladas.

Os testes nunca acessam a internet: substituímos requests.get/post/delete por
funções falsas (monkeypatch) que devolvem respostas prontas.
"""

import pytest

from achapet.ext import storage as storage_mod
from achapet.services import geo


class RespostaFalsa:
    def __init__(self, dados=None, status=200, texto=""):
        self._dados = dados
        self.status_code = status
        self.ok = status < 400
        self.text = texto

    def json(self):
        return self._dados

    def raise_for_status(self):
        if not self.ok:
            raise geo.requests.HTTPError(str(self.status_code))


@pytest.fixture
def servicos_ativos(app, monkeypatch):
    monkeypatch.setitem(app.config, "SERVICOS_EXTERNOS_ATIVOS", True)
    monkeypatch.setattr(geo.time, "sleep", lambda s: None)  # não esperar 1 s nos testes
    geo._cep_cache.cache_clear()
    geo._endereco_cache.cache_clear()
    yield
    geo._cep_cache.cache_clear()
    geo._endereco_cache.cache_clear()


def test_cep_pela_brasilapi(client, servicos_ativos, monkeypatch):
    def falso_get(url, **kwargs):
        assert "brasilapi" in url
        return RespostaFalsa(
            {
                "neighborhood": "Praia da Costa",
                "city": "Vila Velha",
                "state": "ES",
                "street": "Av. Gil Veloso",
                "location": {"coordinates": {"latitude": "-20.33", "longitude": "-40.28"}},
            }
        )

    monkeypatch.setattr(geo.requests, "get", falso_get)
    resposta = client.get("/api/cep/29101-010")
    assert resposta.status_code == 200
    assert resposta.json["bairro"] == "Praia da Costa"
    assert resposta.json["lat"] == -20.33


def test_cep_cai_para_viacep_e_nominatim(client, servicos_ativos, monkeypatch):
    def falso_get(url, **kwargs):
        if "brasilapi" in url:
            return RespostaFalsa(status=404)
        if "viacep" in url:
            return RespostaFalsa(
                {"bairro": "Centro", "localidade": "Vitória", "uf": "ES", "logradouro": "Rua Sete"}
            )
        return RespostaFalsa([{"lat": "-20.319", "lon": "-40.338"}])  # Nominatim

    monkeypatch.setattr(geo.requests, "get", falso_get)
    dados = client.get("/api/cep/29010000").json
    assert dados["cidade"] == "Vitória"
    assert dados["lng"] == -40.338


def test_cep_invalido_e_inexistente(client, servicos_ativos, monkeypatch):
    assert client.get("/api/cep/123").status_code == 400
    monkeypatch.setattr(geo.requests, "get", lambda url, **kw: RespostaFalsa({"erro": True}))
    assert client.get("/api/cep/99999999").status_code == 404


def test_endereco_por_ponto(client, servicos_ativos, monkeypatch):
    monkeypatch.setattr(
        geo.requests,
        "get",
        lambda url, **kw: RespostaFalsa(
            {"address": {"suburb": "Itapuã", "city": "Vila Velha", "state": "Espírito Santo"}}
        ),
    )
    dados = client.get("/api/endereco?lat=-20.34&lng=-40.29").json
    assert dados == {"bairro": "Itapuã", "cidade": "Vila Velha", "uf": "ES"}


def test_endereco_com_servico_fora_do_ar(client, servicos_ativos, monkeypatch):
    def falha(url, **kwargs):
        raise geo.requests.ConnectionError("sem internet")

    monkeypatch.setattr(geo.requests, "get", falha)
    assert client.get("/api/endereco?lat=-20.34&lng=-40.29").json == {}
    assert client.get("/api/endereco?lat=abc").status_code == 400


def test_supabase_storage(monkeypatch):
    chamadas = []

    def falso_post(url, **kwargs):
        chamadas.append(("post", url))
        return RespostaFalsa(status=200)

    def falso_delete(url, **kwargs):
        chamadas.append(("delete", kwargs["json"]))
        return RespostaFalsa(status=200)

    monkeypatch.setattr(storage_mod.requests, "post", falso_post)
    monkeypatch.setattr(storage_mod.requests, "delete", falso_delete)
    s = storage_mod.SupabaseStorage("https://x.supabase.co", "chave", "fotos")
    s.salvar("ABC123/foto.jpg", b"123")
    s.remover("ABC123/foto.jpg")
    assert chamadas[0] == ("post", "https://x.supabase.co/storage/v1/object/fotos/ABC123/foto.jpg")
    assert chamadas[1] == ("delete", {"prefixes": ["ABC123/foto.jpg"]})
    assert s.url("ABC123/foto.jpg").endswith("/object/public/fotos/ABC123/foto.jpg")


def test_supabase_storage_erro_no_upload(monkeypatch):
    monkeypatch.setattr(
        storage_mod.requests, "post", lambda url, **kw: RespostaFalsa(status=500, texto="erro")
    )
    s = storage_mod.SupabaseStorage("https://x.supabase.co", "chave", "fotos")
    with pytest.raises(storage_mod.StorageError):
        s.salvar("a.jpg", b"1")
