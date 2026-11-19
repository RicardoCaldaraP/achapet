"""Mural geolocalizado: mapa + lista. Os dados chegam pela API (/api/anuncios)."""

from flask import current_app, render_template, request

from achapet.blueprints.mural import bp
from achapet.blueprints.mural.forms import FiltroMuralForm


@bp.route("/")
def index():
    form = FiltroMuralForm(request.args)
    form.validate()
    centro = current_app.config["MAPA_CENTRO_PADRAO"]
    return render_template("mural/index.html", form=form, centro=centro)
