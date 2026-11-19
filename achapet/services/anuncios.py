"""Regras de negócio dos anúncios: publicar, editar, renovar, reencontrar e excluir."""

import logging
from datetime import datetime, timedelta, timezone

from flask import current_app
from sqlalchemy import func, select

from achapet.ext.db import db
from achapet.models import Anuncio, Cor, ponto
from achapet.services import RegraNegocioError, fotos, geo

log = logging.getLogger(__name__)

CAMPOS_TEXTO = (
    "tipo",
    "especie",
    "porte",
    "sexo",
    "nome_pet",
    "raca",
    "descricao",
    "detalhe_oculto",
    "data_ocorrencia",
    "bairro",
    "cidade",
    "uf",
)


def anuncios_nas_ultimas_24h(usuario) -> int:
    limite = datetime.now(timezone.utc) - timedelta(days=1)
    consulta = select(func.count(Anuncio.id)).where(
        Anuncio.usuario_id == usuario.id, Anuncio.criado_em >= limite
    )
    return db.session.scalar(consulta)


def buscar_por_codigo(codigo: str) -> Anuncio | None:
    return db.session.scalar(select(Anuncio).where(Anuncio.codigo == codigo.upper()))


def listar_do_usuario(usuario) -> list[Anuncio]:
    consulta = (
        select(Anuncio)
        .where(Anuncio.usuario_id == usuario.id, Anuncio.status != "removido")
        .order_by(Anuncio.criado_em.desc())
    )
    return list(db.session.scalars(consulta))


def _aplicar_dados(anuncio: Anuncio, dados: dict) -> None:
    """Copia os dados validados do formulário para o anúncio."""
    for campo in CAMPOS_TEXTO:
        if campo in dados:
            valor = dados[campo]
            if isinstance(valor, str):
                valor = valor.strip() or None
            setattr(anuncio, campo, valor)
    if anuncio.uf:
        anuncio.uf = anuncio.uf.upper()

    anuncio.localizacao = ponto(dados["latitude"], dados["longitude"])
    with db.session.no_autoflush:  # o anúncio ainda está incompleto neste ponto
        anuncio.cores = list(db.session.scalars(select(Cor).where(Cor.id.in_(dados["cores"]))))

    # Se o usuário não informou o bairro, tentamos descobrir pelo ponto no mapa.
    if not anuncio.bairro or not anuncio.cidade:
        endereco = geo.endereco_por_ponto(dados["latitude"], dados["longitude"])
        if endereco:
            anuncio.bairro = anuncio.bairro or endereco.get("bairro")
            anuncio.cidade = anuncio.cidade or endereco.get("cidade")
            anuncio.uf = anuncio.uf or endereco.get("uf")


def criar_anuncio(usuario, dados: dict, arquivos=None) -> Anuncio:
    limite = current_app.config["LIMITE_ANUNCIOS_POR_DIA"]
    if anuncios_nas_ultimas_24h(usuario) >= limite:
        raise RegraNegocioError(
            f"Você já publicou {limite} anúncios nas últimas 24 horas. Tente novamente amanhã."
        )

    anuncio = Anuncio(usuario_id=usuario.id)
    _aplicar_dados(anuncio, dados)
    db.session.add(anuncio)
    try:
        db.session.flush()  # gera id e código curto (feitos pelo banco)
        fotos.salvar_fotos(anuncio, arquivos)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    log.info("Anúncio %s (%s) publicado por %s", anuncio.codigo, anuncio.tipo, usuario.email)
    return anuncio


def atualizar_anuncio(anuncio: Anuncio, dados: dict, arquivos=None) -> Anuncio:
    _aplicar_dados(anuncio, dados)
    novas = fotos.arquivos_validos(arquivos)
    try:
        if novas:  # fotos novas substituem as antigas
            fotos.remover_fotos(anuncio)
            anuncio.fotos.clear()
            db.session.flush()
            fotos.salvar_fotos(anuncio, novas)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    log.info("Anúncio %s atualizado", anuncio.codigo)
    return anuncio


def renovar(anuncio: Anuncio) -> None:
    if anuncio.status not in ("ativo", "expirado"):
        raise RegraNegocioError("Só anúncios ativos ou expirados podem ser renovados.")
    dias = current_app.config["DIAS_VALIDADE_ANUNCIO"]
    anuncio.expira_em = datetime.now(timezone.utc) + timedelta(days=dias)
    anuncio.status = "ativo"
    db.session.commit()
    log.info("Anúncio %s renovado por %s dias", anuncio.codigo, dias)


def marcar_reencontrado(anuncio: Anuncio) -> None:
    if anuncio.status == "reencontrado":
        return
    if anuncio.status not in ("ativo", "expirado"):
        raise RegraNegocioError("Este anúncio não pode ser marcado como reencontrado.")
    anuncio.status = "reencontrado"
    anuncio.reencontrado_em = datetime.now(timezone.utc)
    db.session.commit()
    log.info("Anúncio %s marcado como REENCONTRADO", anuncio.codigo)


def excluir_anuncio(anuncio: Anuncio) -> None:
    codigo = anuncio.codigo
    fotos.remover_fotos(anuncio)
    db.session.delete(anuncio)
    db.session.commit()
    log.info("Anúncio %s excluído pelo autor", codigo)


def expirar_vencidos() -> int:
    """Executa a função do banco que marca como expirados os anúncios vencidos."""
    total = db.session.execute(db.text("SELECT expirar_anuncios()")).scalar()
    db.session.commit()
    log.info("%s anúncio(s) expirado(s)", total)
    return total
