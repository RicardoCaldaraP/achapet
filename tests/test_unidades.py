"""Testes de unidade de funções puras (validadores e filtros de template)."""

from datetime import date, timedelta

import pytest

from achapet.services.cartaz import qr_code_data_uri
from achapet.services.geo import normalizar_cep
from achapet.template_utils import data_br, distancia, link_whatsapp, tempo_relativo
from achapet.validators import normalizar_telefone


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        ("(27) 99876-5432", "5527998765432"),
        ("27 3333-4444", "552733334444"),
        ("+55 27 99876-5432", "5527998765432"),
        ("27 89876-5432", None),  # celular com 11 dígitos precisa começar com 9
        ("(20) 99876-5432", None),  # DDD inexistente
        ("12345", None),
        ("", None),
    ],
)
def test_normalizar_telefone(entrada, esperado):
    assert normalizar_telefone(entrada) == esperado


def test_normalizar_cep():
    assert normalizar_cep("29101-010") == "29101010"
    assert normalizar_cep("123") is None


def test_filtros_de_template():
    assert data_br(date(2026, 11, 19)) == "19 nov 2026"
    assert tempo_relativo(date.today()) == "hoje"
    assert tempo_relativo(date.today() - timedelta(days=1)) == "ontem"
    assert tempo_relativo(date.today() - timedelta(days=5)) == "há 5 dias"
    assert distancia(750) == "750 m"
    assert distancia(2500) == "2,5 km"
    assert link_whatsapp("Oi tudo", "5527999990000") == "https://wa.me/5527999990000?text=Oi%20tudo"


def test_qr_code_gera_png():
    assert qr_code_data_uri("https://achapet.app/a/ABC123").startswith("data:image/png;base64,")
