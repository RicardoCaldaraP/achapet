"""Denúncias e moderação.

Regra (implementada por trigger no banco): com 3 denúncias pendentes o anúncio
fica oculto até um moderador analisar.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from achapet.ext.db import db
from achapet.models import Anuncio, Denuncia
from achapet.services import RegraNegocioError

log = logging.getLogger(__name__)


def denunciar(anuncio: Anuncio, usuario, motivo: str, detalhe: str | None) -> Denuncia:
    if anuncio.pertence_a(usuario):
        raise RegraNegocioError("Você não pode denunciar o seu próprio anúncio.")

    denuncia = Denuncia(
        anuncio_id=anuncio.id,
        denunciante_id=usuario.id,
        motivo=motivo,
        detalhe=(detalhe or "").strip() or None,
    )
    db.session.add(denuncia)
    try:
        db.session.commit()
    except IntegrityError as erro:  # restrição UNIQUE (anuncio_id, denunciante_id)
        db.session.rollback()
        raise RegraNegocioError("Você já denunciou este anúncio. Obrigado!") from erro

    db.session.refresh(anuncio)  # o trigger pode ter mudado o status para 'oculto'
    log.warning(
        "Denúncia (%s) no anúncio %s; status agora: %s", motivo, anuncio.codigo, anuncio.status
    )
    return denuncia


def anuncios_com_denuncias_pendentes() -> list[tuple[Anuncio, int]]:
    """Anúncios com denúncias pendentes, os mais denunciados primeiro."""
    total = func.count(Denuncia.id).label("total")
    consulta = (
        select(Anuncio, total)
        .join(Denuncia, Denuncia.anuncio_id == Anuncio.id)
        .where(Denuncia.situacao == "pendente")
        .group_by(Anuncio.id)
        .order_by(total.desc(), Anuncio.criado_em)
    )
    return [(anuncio, qtd) for anuncio, qtd in db.session.execute(consulta)]


def decidir(anuncio: Anuncio, moderador, remover: bool) -> None:
    """Fecha todas as denúncias pendentes do anúncio.

    remover=True  -> denúncias procedentes e anúncio removido do site.
    remover=False -> denúncias improcedentes e anúncio volta a ficar visível.
    """
    if not moderador.eh_moderador:
        raise RegraNegocioError("Apenas moderadores podem analisar denúncias.")

    agora = datetime.now(timezone.utc)
    situacao = "procedente" if remover else "improcedente"
    for denuncia in anuncio.denuncias:
        if denuncia.situacao == "pendente":
            denuncia.situacao = situacao
            denuncia.moderador_id = moderador.id
            denuncia.analisada_em = agora

    if remover:
        anuncio.status = "removido"
    elif anuncio.status == "oculto":
        anuncio.status = "ativo"
    db.session.commit()
    log.warning(
        "Moderador %s marcou denúncias do anúncio %s como %s",
        moderador.email,
        anuncio.codigo,
        situacao,
    )
