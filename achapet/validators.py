"""Validadores reutilizados pelos formulários (WTForms)."""

import re

from wtforms.validators import ValidationError

DDDS_VALIDOS = {
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    21,
    22,
    24,
    27,
    28,
    31,
    32,
    33,
    34,
    35,
    37,
    38,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    51,
    53,
    54,
    55,
    61,
    62,
    63,
    64,
    65,
    66,
    67,
    68,
    69,
    71,
    73,
    74,
    75,
    77,
    79,
    81,
    82,
    83,
    84,
    85,
    86,
    87,
    88,
    89,
    91,
    92,
    93,
    94,
    95,
    96,
    97,
    98,
    99,
}


def normalizar_telefone(valor: str | None) -> str | None:
    """Converte "(27) 99999-1234" para "5527999991234" (formato exigido pelo banco).

    Devolve None se o número não for um celular/fixo brasileiro válido.
    """
    digitos = re.sub(r"\D", "", valor or "")
    if digitos.startswith("55") and len(digitos) in (12, 13):
        digitos = digitos[2:]
    if len(digitos) not in (10, 11):
        return None
    ddd = int(digitos[:2])
    if ddd not in DDDS_VALIDOS:
        return None
    if len(digitos) == 11 and digitos[2] != "9":
        return None
    return "55" + digitos


class TelefoneBR:
    """Valida o telefone e já substitui o valor do campo pelo formato normalizado."""

    def __init__(self, message: str | None = None):
        self.message = message or "Informe um telefone válido com DDD, ex.: (27) 99999-1234."

    def __call__(self, form, field):
        normalizado = normalizar_telefone(field.data)
        if not normalizado:
            raise ValidationError(self.message)
        field.data = normalizado


class SenhaForte:
    """Mínimo de 8 caracteres, com pelo menos uma letra e um número."""

    def __call__(self, form, field):
        senha = field.data or ""
        if len(senha) < 8 or not re.search(r"[A-Za-z]", senha) or not re.search(r"\d", senha):
            raise ValidationError("A senha precisa ter 8 caracteres ou mais, com letras e números.")
