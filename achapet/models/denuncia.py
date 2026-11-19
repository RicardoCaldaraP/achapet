"""Denúncias de anúncios e as tabelas complementares (avistamento, alerta_regiao)."""

from geoalchemy2 import Geography
from sqlalchemy import FetchedValue

from achapet.ext.db import db

MOTIVOS = {
    "golpe": "Golpe / pedido de dinheiro",
    "informacao_falsa": "Informação falsa",
    "conteudo_improprio": "Conteúdo impróprio",
    "duplicado": "Anúncio duplicado",
    "outro": "Outro motivo",
}
SITUACOES = {"pendente": "Pendente", "procedente": "Procedente", "improcedente": "Improcedente"}


class Denuncia(db.Model):
    __tablename__ = "denuncia"
    __table_args__ = (
        db.UniqueConstraint("anuncio_id", "denunciante_id", name="denuncia_unica_uk"),
    )
    __mapper_args__ = {"eager_defaults": True}

    id = db.Column(db.BigInteger, db.Identity(always=True), primary_key=True)
    anuncio_id = db.Column(
        db.BigInteger, db.ForeignKey("anuncio.id", ondelete="CASCADE"), nullable=False
    )
    denunciante_id = db.Column(db.Uuid, db.ForeignKey("usuario.id", ondelete="SET NULL"))
    motivo = db.Column(db.String(20), nullable=False)
    detalhe = db.Column(db.String(500))
    situacao = db.Column(db.String(12), nullable=False, default="pendente")
    moderador_id = db.Column(db.Uuid, db.ForeignKey("usuario.id", ondelete="SET NULL"))
    analisada_em = db.Column(db.DateTime(timezone=True))
    criado_em = db.Column(db.DateTime(timezone=True), server_default=FetchedValue())

    anuncio = db.relationship("Anuncio", back_populates="denuncias")
    denunciante = db.relationship("Usuario", foreign_keys=[denunciante_id])
    moderador = db.relationship("Usuario", foreign_keys=[moderador_id])

    @property
    def motivo_rotulo(self) -> str:
        return MOTIVOS.get(self.motivo, self.motivo)


class Avistamento(db.Model):
    """Funcionalidade complementar: "vi este animal aqui"."""

    __tablename__ = "avistamento"

    id = db.Column(db.BigInteger, db.Identity(always=True), primary_key=True)
    anuncio_id = db.Column(
        db.BigInteger, db.ForeignKey("anuncio.id", ondelete="CASCADE"), nullable=False
    )
    usuario_id = db.Column(db.Uuid, db.ForeignKey("usuario.id", ondelete="SET NULL"))
    localizacao = db.Column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    visto_em = db.Column(db.DateTime(timezone=True), nullable=False)
    comentario = db.Column(db.String(300))
    criado_em = db.Column(db.DateTime(timezone=True), server_default=FetchedValue())


class AlertaRegiao(db.Model):
    """Funcionalidade complementar: área monitorada para alertas por e-mail."""

    __tablename__ = "alerta_regiao"

    id = db.Column(db.BigInteger, db.Identity(always=True), primary_key=True)
    usuario_id = db.Column(db.Uuid, db.ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    centro = db.Column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    raio_m = db.Column(db.Integer, nullable=False, default=3000)
    especie = db.Column(db.String(10))
    tipo = db.Column(db.String(10))
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    criado_em = db.Column(db.DateTime(timezone=True), server_default=FetchedValue())
