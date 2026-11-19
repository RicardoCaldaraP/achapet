"""Geolocalização com serviços públicos: BrasilAPI/ViaCEP (CEP) e Nominatim (OpenStreetMap).

Cuidados exigidos pelas políticas de uso:
- Nominatim: no máximo 1 requisição por segundo e User-Agent identificado.
- Respostas guardadas em cache para não repetir consultas.
"""

import logging
import re
import threading
import time
from functools import lru_cache

import requests
from flask import current_app

log = logging.getLogger(__name__)

_trava_nominatim = threading.Lock()
_ultima_chamada = [0.0]

SIGLAS_UF = {
    "Acre": "AC",
    "Alagoas": "AL",
    "Amapá": "AP",
    "Amazonas": "AM",
    "Bahia": "BA",
    "Ceará": "CE",
    "Distrito Federal": "DF",
    "Espírito Santo": "ES",
    "Goiás": "GO",
    "Maranhão": "MA",
    "Mato Grosso": "MT",
    "Mato Grosso do Sul": "MS",
    "Minas Gerais": "MG",
    "Pará": "PA",
    "Paraíba": "PB",
    "Paraná": "PR",
    "Pernambuco": "PE",
    "Piauí": "PI",
    "Rio de Janeiro": "RJ",
    "Rio Grande do Norte": "RN",
    "Rio Grande do Sul": "RS",
    "Rondônia": "RO",
    "Roraima": "RR",
    "Santa Catarina": "SC",
    "São Paulo": "SP",
    "Sergipe": "SE",
    "Tocantins": "TO",
}


def _ativo() -> bool:
    return current_app.config.get("SERVICOS_EXTERNOS_ATIVOS", True)


def _nominatim(caminho: str, params: dict) -> dict | list | None:
    """Chamada ao Nominatim respeitando o limite de 1 req/s."""
    with _trava_nominatim:
        espera = 1.0 - (time.monotonic() - _ultima_chamada[0])
        if espera > 0:
            time.sleep(espera)
        try:
            resposta = requests.get(
                f"{current_app.config['NOMINATIM_URL']}/{caminho}",
                params={**params, "format": "jsonv2", "accept-language": "pt-BR"},
                headers={"User-Agent": current_app.config["NOMINATIM_USER_AGENT"]},
                timeout=6,
            )
            resposta.raise_for_status()
            return resposta.json()
        except (requests.RequestException, ValueError) as erro:
            log.warning("Nominatim indisponível (%s): %s", caminho, erro)
            return None
        finally:
            _ultima_chamada[0] = time.monotonic()


def endereco_por_ponto(lat: float, lng: float) -> dict | None:
    """Bairro, cidade e UF a partir de um ponto (geocodificação reversa)."""
    if not _ativo():
        return None
    # Arredondar (~100 m) faz pontos vizinhos aproveitarem o mesmo cache.
    return _endereco_cache(round(lat, 3), round(lng, 3))


@lru_cache(maxsize=2048)
def _endereco_cache(lat: float, lng: float) -> dict | None:
    dados = _nominatim("reverse", {"lat": lat, "lon": lng, "zoom": 16, "addressdetails": 1})
    if not dados or "address" not in dados:
        return None
    end = dados["address"]
    return {
        "bairro": end.get("suburb") or end.get("neighbourhood") or end.get("quarter"),
        "cidade": end.get("city") or end.get("town") or end.get("municipality"),
        "uf": SIGLAS_UF.get(end.get("state", ""), None),
    }


def normalizar_cep(cep: str) -> str | None:
    digitos = re.sub(r"\D", "", cep or "")
    return digitos if len(digitos) == 8 else None


def buscar_cep(cep: str) -> dict | None:
    """Coordenadas e endereço de um CEP. Tenta BrasilAPI e cai para ViaCEP + Nominatim."""
    cep = normalizar_cep(cep)
    if not cep or not _ativo():
        return None
    return _cep_cache(cep)


@lru_cache(maxsize=1024)
def _cep_cache(cep: str) -> dict | None:
    resultado = None
    try:
        r = requests.get(f"https://brasilapi.com.br/api/cep/v2/{cep}", timeout=6)
        d = r.json() if r.ok else {}
        if d.get("city"):
            coords = (d.get("location") or {}).get("coordinates") or {}
            resultado = {
                "bairro": d.get("neighborhood"),
                "cidade": d.get("city"),
                "uf": d.get("state"),
                "rua": d.get("street"),
                "lat": float(coords["latitude"]) if coords.get("latitude") else None,
                "lng": float(coords["longitude"]) if coords.get("longitude") else None,
            }
    except (requests.RequestException, ValueError, KeyError) as erro:
        log.warning("BrasilAPI indisponível: %s", erro)

    if resultado is None:
        try:
            r = requests.get(f"https://viacep.com.br/ws/{cep}/json/", timeout=6)
            d = r.json() if r.ok else {}
            if d and not d.get("erro"):
                resultado = {
                    "bairro": d.get("bairro"),
                    "cidade": d.get("localidade"),
                    "uf": d.get("uf"),
                    "rua": d.get("logradouro"),
                    "lat": None,
                    "lng": None,
                }
        except (requests.RequestException, ValueError) as erro:
            log.warning("ViaCEP indisponível: %s", erro)

    if resultado and resultado["lat"] is None:
        # Sem coordenadas no CEP: geocodifica o endereço pelo Nominatim.
        consulta = ", ".join(
            p
            for p in (
                resultado.get("rua"),
                resultado.get("bairro"),
                resultado.get("cidade"),
                resultado.get("uf"),
            )
            if p
        )
        achados = _nominatim("search", {"q": consulta, "countrycodes": "br", "limit": 1})
        if isinstance(achados, list) and achados:
            resultado["lat"] = float(achados[0]["lat"])
            resultado["lng"] = float(achados[0]["lon"])
    return resultado
