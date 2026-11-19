"""Buscas geográficas.

O cálculo de distância e o cruzamento de anúncios ficam no PostgreSQL/PostGIS
(funções buscar_anuncios e sugerir_correspondencias do modelo físico), que usa o
índice espacial. Aqui só chamamos essas funções com parâmetros nomeados (sem
concatenar texto, o que evita SQL injection) e formatamos o resultado.
"""

from datetime import date

from sqlalchemy import text

from achapet.ext.db import db
from achapet.models import ESPECIES, TIPOS
from achapet.services.fotos import url_foto

SQL_BUSCAR = text("""
    SELECT * FROM buscar_anuncios(
        CAST(:lat AS double precision), CAST(:lng AS double precision),
        CAST(:raio AS integer), CAST(:tipo AS varchar),
        CAST(:especie AS varchar), CAST(:desde AS date))
""")

SQL_CORRESPONDENCIAS = text("""
    SELECT c.*, v.especie, v.porte, v.nome_pet, v.cores, v.foto_capa
      FROM sugerir_correspondencias(CAST(:codigo AS varchar), CAST(:raio AS integer)) AS c
      JOIN vw_anuncio_publico v ON v.codigo = c.codigo
""")


def buscar_anuncios(
    lat: float,
    lng: float,
    raio_m: int,
    tipo: str | None = None,
    especie: str | None = None,
    desde: date | None = None,
) -> list[dict]:
    """Anúncios ativos num raio (metros) em volta de um ponto, mais recentes primeiro."""
    linhas = db.session.execute(
        SQL_BUSCAR,
        {
            "lat": lat,
            "lng": lng,
            "raio": raio_m,
            "tipo": tipo or None,
            "especie": especie or None,
            "desde": desde,
        },
    ).mappings()
    return [_formatar(linha) for linha in linhas]


def sugerir_correspondencias(codigo: str, raio_m: int) -> list[dict]:
    """Anúncios do tipo oposto compatíveis (espécie, porte, cor, distância e data)."""
    linhas = db.session.execute(SQL_CORRESPONDENCIAS, {"codigo": codigo, "raio": raio_m})
    return [_formatar(linha) for linha in linhas.mappings()]


def _formatar(linha) -> dict:
    item = dict(linha)
    item["foto_url"] = url_foto(item.pop("foto_capa", None))
    item["tipo_rotulo"] = TIPOS.get(item.get("tipo"), item.get("tipo"))
    if "especie" in item:
        item["especie_rotulo"] = ESPECIES.get(item["especie"], item["especie"])
    if item.get("data_ocorrencia"):
        item["data_ocorrencia"] = item["data_ocorrencia"].isoformat()
    return item
