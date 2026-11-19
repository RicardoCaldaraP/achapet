"""Rotas dos anúncios: publicar, ver, editar, cartaz, gestão e denúncia."""

from flask import abort, current_app, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from achapet.blueprints.anuncios import bp
from achapet.blueprints.anuncios.forms import AcaoForm, AnuncioForm, DenunciaForm
from achapet.ext.storage import StorageError
from achapet.services import RegraNegocioError, anuncios, busca, cartaz, moderacao
from achapet.services.fotos import url_foto


def _obter_anuncio(codigo: str):
    anuncio = anuncios.buscar_por_codigo(codigo)
    if anuncio is None:
        abort(404)
    return anuncio


def _obter_anuncio_do_autor(codigo: str):
    """Só o autor pode alterar o anúncio (os outros recebem 403)."""
    anuncio = _obter_anuncio(codigo)
    if not anuncio.pertence_a(current_user):
        abort(403)
    return anuncio


@bp.route("/anuncios/novo", methods=["GET", "POST"])
@login_required
def novo():
    form = AnuncioForm(max_fotos=current_app.config["FOTOS_POR_ANUNCIO"])
    if form.validate_on_submit():
        try:
            anuncio = anuncios.criar_anuncio(current_user, form.dados(), form.fotos.data)
        except (RegraNegocioError, StorageError) as erro:
            flash(str(erro), "danger")
        else:
            flash("Anúncio publicado! Compartilhe o link e imprima o cartaz.", "success")
            return redirect(url_for("anuncios.detalhe", codigo=anuncio.codigo))
    return render_template("anuncios/form.html", form=form, anuncio=None)


@bp.route("/a/<codigo>")
def detalhe(codigo):
    anuncio = _obter_anuncio(codigo)
    eh_autor = anuncio.pertence_a(current_user)
    eh_moderador = current_user.is_authenticated and current_user.eh_moderador
    # Anúncios ocultos/removidos só aparecem para o autor e para moderadores.
    if not anuncio.visivel_publicamente and not (eh_autor or eh_moderador):
        abort(404)

    correspondencias = []
    if eh_autor and anuncio.status == "ativo":
        correspondencias = busca.sugerir_correspondencias(
            anuncio.codigo, current_app.config["RAIO_CORRESPONDENCIA_M"]
        )

    return render_template(
        "anuncios/detalhe.html",
        anuncio=anuncio,
        eh_autor=eh_autor,
        fotos=[url_foto(f.caminho) for f in anuncio.fotos],
        correspondencias=correspondencias,
        link=url_for("anuncios.detalhe", codigo=anuncio.codigo, _external=True),
        acao_form=AcaoForm(),
        denuncia_form=DenunciaForm(),
    )


@bp.route("/a/<codigo>/cartaz")
def cartaz_impressao(codigo):
    anuncio = _obter_anuncio(codigo)
    if not anuncio.visivel_publicamente:
        abort(404)
    link = url_for("anuncios.detalhe", codigo=anuncio.codigo, _external=True)
    return render_template(
        "anuncios/cartaz.html",
        anuncio=anuncio,
        link=link,
        qr_code=cartaz.qr_code_data_uri(link),
        foto=url_foto(anuncio.fotos[0].caminho) if anuncio.fotos else None,
    )


@bp.route("/a/<codigo>/editar", methods=["GET", "POST"])
@login_required
def editar(codigo):
    anuncio = _obter_anuncio_do_autor(codigo)
    form = AnuncioForm(obj=anuncio, max_fotos=current_app.config["FOTOS_POR_ANUNCIO"])
    if request.method == "GET":
        form.latitude.data, form.longitude.data = anuncio.lat, anuncio.lng
        form.cores.data = [c.id for c in anuncio.cores]
    if form.validate_on_submit():
        try:
            anuncios.atualizar_anuncio(anuncio, form.dados(), form.fotos.data)
        except (RegraNegocioError, StorageError) as erro:
            flash(str(erro), "danger")
        else:
            flash("Anúncio atualizado.", "success")
            return redirect(url_for("anuncios.detalhe", codigo=anuncio.codigo))
    return render_template(
        "anuncios/form.html",
        form=form,
        anuncio=anuncio,
        fotos=[url_foto(f.caminho) for f in anuncio.fotos],
    )


@bp.route("/a/<codigo>/<acao>", methods=["POST"])
@login_required
def acao(codigo, acao):
    """Ações do autor: renovar, reencontrado e excluir (botões com CSRF)."""
    acoes = {
        "renovar": (anuncios.renovar, "Anúncio renovado por mais 30 dias."),
        "reencontrado": (
            anuncios.marcar_reencontrado,
            "Que notícia boa! O anúncio agora mostra que o pet foi reencontrado.",
        ),
        "excluir": (anuncios.excluir_anuncio, "Anúncio excluído."),
    }
    if acao not in acoes:
        abort(404)
    anuncio = _obter_anuncio_do_autor(codigo)
    if not AcaoForm().validate_on_submit():
        abort(400)

    funcao, mensagem = acoes[acao]
    try:
        funcao(anuncio)
    except RegraNegocioError as erro:
        flash(str(erro), "warning")
        return redirect(url_for("anuncios.detalhe", codigo=codigo))
    flash(mensagem, "success")
    if acao == "excluir":
        return redirect(url_for("anuncios.meus"))
    return redirect(url_for("anuncios.detalhe", codigo=codigo))


@bp.route("/a/<codigo>/denunciar", methods=["POST"])
@login_required
def denunciar(codigo):
    anuncio = _obter_anuncio(codigo)
    form = DenunciaForm()
    if form.validate_on_submit():
        try:
            moderacao.denunciar(anuncio, current_user, form.motivo.data, form.detalhe.data)
        except RegraNegocioError as erro:
            flash(str(erro), "warning")
        else:
            flash("Denúncia enviada. A equipe de moderação vai analisar.", "success")
    else:
        flash("Escolha um motivo válido para a denúncia.", "danger")
    if not anuncio.visivel_publicamente:
        return redirect(url_for("mural.index"))
    return redirect(url_for("anuncios.detalhe", codigo=codigo))


@bp.route("/meus-anuncios")
@login_required
def meus():
    lista = anuncios.listar_do_usuario(current_user)
    capas = {a.id: url_foto(a.fotos[0].caminho) if a.fotos else None for a in lista}
    return render_template("anuncios/meus.html", anuncios=lista, capas=capas, acao_form=AcaoForm())
