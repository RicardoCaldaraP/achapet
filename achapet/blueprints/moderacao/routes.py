"""Painel de moderação: análise dos anúncios denunciados."""

from flask import abort, flash, redirect, render_template, request, url_for
from flask_login import current_user

from achapet.blueprints import moderador_obrigatorio
from achapet.blueprints.anuncios.forms import AcaoForm
from achapet.blueprints.moderacao import bp
from achapet.services import anuncios, moderacao
from achapet.services.fotos import url_foto


@bp.route("/")
@moderador_obrigatorio
def index():
    pendentes = moderacao.anuncios_com_denuncias_pendentes()
    capas = {a.id: url_foto(a.fotos[0].caminho) if a.fotos else None for a, _ in pendentes}
    return render_template(
        "moderacao/index.html", pendentes=pendentes, capas=capas, acao_form=AcaoForm()
    )


@bp.route("/<codigo>/decidir", methods=["POST"])
@moderador_obrigatorio
def decidir(codigo):
    anuncio = anuncios.buscar_por_codigo(codigo)
    if anuncio is None:
        abort(404)
    decisao = request.form.get("decisao")
    if not AcaoForm().validate_on_submit() or decisao not in ("remover", "manter"):
        abort(400)
    moderacao.decidir(anuncio, current_user, remover=(decisao == "remover"))
    if decisao == "remover":
        flash(f"Anúncio {codigo} removido.", "success")
    else:
        flash(f"Denúncias do anúncio {codigo} arquivadas.", "success")
    return redirect(url_for("moderacao.index"))
