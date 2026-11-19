"""API JSON consumida pelo JavaScript do mapa e do formulário."""

from flask import current_app, jsonify, request
from sqlalchemy import text

from achapet.blueprints.api import bp
from achapet.blueprints.mural.forms import FiltroMuralForm
from achapet.ext.db import db
from achapet.services import busca, geo


@bp.route("/health")
def health():
    """Verifica se a aplicação e o banco estão respondendo."""
    db.session.execute(text("SELECT 1"))
    return jsonify(status="ok")


@bp.route("/anuncios")
def anuncios():
    form = FiltroMuralForm(request.args)
    if not form.validate():
        return jsonify(erro="Filtros inválidos.", detalhes=form.errors), 400

    lat_padrao, lng_padrao = current_app.config["MAPA_CENTRO_PADRAO"]
    lat = form.lat.data if form.lat.data is not None else lat_padrao
    lng = form.lng.data if form.lng.data is not None else lng_padrao

    resultados = busca.buscar_anuncios(
        lat, lng, form.raio_metros(), form.tipo.data, form.especie.data, form.desde()
    )
    return jsonify(
        total=len(resultados), centro=[lat, lng], raio_m=form.raio_metros(), anuncios=resultados
    )


@bp.route("/cep/<cep>")
def cep(cep):
    if not geo.normalizar_cep(cep):
        return jsonify(erro="CEP inválido. Use 8 números."), 400
    dados = geo.buscar_cep(cep)
    if not dados:
        return jsonify(erro="CEP não encontrado."), 404
    return jsonify(dados)


@bp.route("/endereco")
def endereco():
    try:
        lat = float(request.args["lat"])
        lng = float(request.args["lng"])
    except (KeyError, ValueError):
        return jsonify(erro="Informe lat e lng numéricos."), 400
    return jsonify(geo.endereco_por_ponto(lat, lng) or {})
