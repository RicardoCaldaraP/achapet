"""Páginas institucionais."""

from flask import current_app, render_template, send_from_directory
from sqlalchemy import func, select

from achapet.blueprints.main import bp
from achapet.ext.db import db
from achapet.models import Anuncio
from achapet.services.fotos import url_foto


@bp.route("/")
def index():
    contagem = dict(
        db.session.execute(
            select(Anuncio.status, func.count(Anuncio.id)).group_by(Anuncio.status)
        ).all()
    )
    recentes = list(
        db.session.scalars(
            select(Anuncio)
            .where(Anuncio.status == "ativo")
            .order_by(Anuncio.criado_em.desc())
            .limit(6)
        )
    )
    capas = {a.id: url_foto(a.fotos[0].caminho) if a.fotos else None for a in recentes}
    return render_template(
        "main/index.html",
        ativos=contagem.get("ativo", 0),
        reencontrados=contagem.get("reencontrado", 0),
        recentes=recentes,
        capas=capas,
    )


@bp.route("/termos")
def termos():
    return render_template("main/termos.html")


@bp.route("/uploads/<path:caminho>")
def upload(caminho):
    """Serve as fotos quando o armazenamento é local (desenvolvimento e testes)."""
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], caminho)
