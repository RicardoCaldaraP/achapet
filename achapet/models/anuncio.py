"""Entidades do anúncio: Anuncio, Foto, Cor (tabelas `anuncio`, `foto`, `cor`, `anuncio_cor`)."""

from datetime import datetime, timezone

from geoalchemy2 import Geography, WKTElement
from geoalchemy2.shape import to_shape
from sqlalchemy import FetchedValue

from achapet.ext.db import db

# Valores permitidos (espelham os CHECKs do banco) e os rótulos exibidos na tela.
TIPOS = {"perdido": "Perdido", "encontrado": "Encontrado"}
ESPECIES = {"cachorro": "Cachorro", "gato": "Gato", "outro": "Outro"}
PORTES = {"pequeno": "Pequeno", "medio": "Médio", "grande": "Grande"}
SEXOS = {"macho": "Macho", "femea": "Fêmea", "nao_sei": "Não sei"}
STATUS = {
    "ativo": "Ativo",
    "oculto": "Em análise",
    "reencontrado": "Reencontrado",
    "expirado": "Expirado",
    "removido": "Removido",
}

anuncio_cor = db.Table(
    "anuncio_cor",
    db.Column(
        "anuncio_id",
        db.BigInteger,
        db.ForeignKey("anuncio.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column("cor_id", db.SmallInteger, db.ForeignKey("cor.id"), primary_key=True),
)


def ponto(lat: float, lng: float) -> WKTElement:
    """Cria um ponto geográfico (PostGIS usa a ordem longitude, latitude)."""
    return WKTElement(f"POINT({lng} {lat})", srid=4326)


class Cor(db.Model):
    __tablename__ = "cor"

    id = db.Column(db.SmallInteger, db.Identity(always=True), primary_key=True)
    nome = db.Column(db.String(20), nullable=False, unique=True)

    def __repr__(self) -> str:
        return f"<Cor {self.nome}>"


class Foto(db.Model):
    __tablename__ = "foto"
    __mapper_args__ = {"eager_defaults": True}

    id = db.Column(db.BigInteger, db.Identity(always=True), primary_key=True)
    anuncio_id = db.Column(
        db.BigInteger, db.ForeignKey("anuncio.id", ondelete="CASCADE"), nullable=False
    )
    caminho = db.Column(db.String(300), nullable=False)
    ordem = db.Column(db.SmallInteger, nullable=False, default=1)
    criado_em = db.Column(db.DateTime(timezone=True), server_default=FetchedValue())

    anuncio = db.relationship("Anuncio", back_populates="fotos")


class Anuncio(db.Model):
    __tablename__ = "anuncio"
    # eager_defaults: após o INSERT, o banco devolve os valores gerados por ele
    # (código curto, datas de criação e expiração) via RETURNING.
    __mapper_args__ = {"eager_defaults": True}

    id = db.Column(db.BigInteger, db.Identity(always=True), primary_key=True)
    codigo = db.Column(db.String(8), unique=True, server_default=FetchedValue())
    usuario_id = db.Column(db.Uuid, db.ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    tipo = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(12), nullable=False, default="ativo")
    especie = db.Column(db.String(10), nullable=False)
    porte = db.Column(db.String(7), nullable=False)
    sexo = db.Column(db.String(7), nullable=False, default="nao_sei")
    nome_pet = db.Column(db.String(60))
    raca = db.Column(db.String(60))
    descricao = db.Column(db.String(1000))
    detalhe_oculto = db.Column(db.String(200))
    data_ocorrencia = db.Column(db.Date, nullable=False)
    localizacao = db.Column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )
    bairro = db.Column(db.String(80))
    cidade = db.Column(db.String(80))
    uf = db.Column(db.String(2))
    expira_em = db.Column(db.DateTime(timezone=True), server_default=FetchedValue())
    reencontrado_em = db.Column(db.DateTime(timezone=True))
    criado_em = db.Column(db.DateTime(timezone=True), server_default=FetchedValue())
    atualizado_em = db.Column(
        db.DateTime(timezone=True), server_default=FetchedValue(), server_onupdate=FetchedValue()
    )

    autor = db.relationship("Usuario", back_populates="anuncios")
    fotos = db.relationship(
        "Foto",
        back_populates="anuncio",
        order_by="Foto.ordem",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    cores = db.relationship("Cor", secondary=anuncio_cor, order_by="Cor.nome")
    denuncias = db.relationship(
        "Denuncia", back_populates="anuncio", cascade="all, delete-orphan", passive_deletes=True
    )

    # --- coordenadas exatas (só usadas no formulário de edição do autor) ---
    @property
    def lat(self) -> float | None:
        return to_shape(self.localizacao).y if self.localizacao is not None else None

    @property
    def lng(self) -> float | None:
        return to_shape(self.localizacao).x if self.localizacao is not None else None

    # --- local aproximado (~300 m) para exibição pública, igual à vw_anuncio_publico ---
    @property
    def lat_aprox(self) -> float | None:
        return round(round(self.lat / 0.003) * 0.003, 6) if self.lat is not None else None

    @property
    def lng_aprox(self) -> float | None:
        return round(round(self.lng / 0.003) * 0.003, 6) if self.lng is not None else None

    # --- estado ---
    @property
    def esta_expirado(self) -> bool:
        return self.status == "expirado" or (
            self.status == "ativo"
            and self.expira_em is not None
            and self.expira_em < datetime.now(timezone.utc)
        )

    @property
    def visivel_publicamente(self) -> bool:
        return self.status in ("ativo", "reencontrado", "expirado")

    @property
    def dias_restantes(self) -> int:
        if not self.expira_em:
            return 0
        return max(0, (self.expira_em - datetime.now(timezone.utc)).days)

    # --- rótulos para os templates ---
    @property
    def tipo_rotulo(self) -> str:
        return TIPOS.get(self.tipo, self.tipo)

    @property
    def especie_rotulo(self) -> str:
        return ESPECIES.get(self.especie, self.especie)

    @property
    def porte_rotulo(self) -> str:
        return PORTES.get(self.porte, self.porte)

    @property
    def sexo_rotulo(self) -> str:
        return SEXOS.get(self.sexo, self.sexo)

    @property
    def status_rotulo(self) -> str:
        return STATUS.get(self.status, self.status)

    @property
    def cores_texto(self) -> str:
        return ", ".join(c.nome for c in self.cores)

    @property
    def titulo(self) -> str:
        """Ex.: "Cachorro perdido: Thor" ou "Gato encontrado"."""
        base = f"{self.especie_rotulo} {self.tipo_rotulo.lower()}"
        return f"{base}: {self.nome_pet}" if self.nome_pet else base

    @property
    def local_texto(self) -> str:
        partes = [p for p in (self.bairro, self.cidade) if p]
        texto = ", ".join(partes)
        return f"{texto} - {self.uf}" if self.uf and texto else texto

    def pertence_a(self, usuario) -> bool:
        return bool(usuario and usuario.is_authenticated and usuario.id == self.usuario_id)

    def __repr__(self) -> str:
        return f"<Anuncio {self.codigo} {self.tipo}>"
