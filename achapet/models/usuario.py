"""Entidade Usuario: pessoas, protetores e ONGs (tabela `usuario`)."""

import uuid

from flask_login import UserMixin
from sqlalchemy import FetchedValue
from sqlalchemy.dialects.postgresql import UUID
from werkzeug.security import check_password_hash, generate_password_hash

from achapet.ext.db import db

PERFIS = {"pessoa": "Pessoa", "protetor": "Protetor(a) independente", "ong": "ONG"}
PAPEIS = {"usuario": "Usuário", "moderador": "Moderador"}


class Usuario(UserMixin, db.Model):
    __tablename__ = "usuario"
    __mapper_args__ = {"eager_defaults": True}

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(254), nullable=False)
    senha_hash = db.Column(db.String(255))
    telefone = db.Column(db.String(13), nullable=False)  # formato 55DDDNUMERO
    perfil = db.Column(db.String(10), nullable=False, default="pessoa")
    verificado = db.Column(db.Boolean, nullable=False, default=False)
    papel = db.Column(db.String(10), nullable=False, default="usuario")
    aceite_termos_em = db.Column(db.DateTime(timezone=True), nullable=False)
    criado_em = db.Column(db.DateTime(timezone=True), server_default=FetchedValue())
    atualizado_em = db.Column(db.DateTime(timezone=True), server_default=FetchedValue())

    anuncios = db.relationship(
        "Anuncio", back_populates="autor", cascade="all, delete-orphan", passive_deletes=True
    )

    # --- senha (nunca guardamos a senha em texto, só o hash) ---
    def definir_senha(self, senha: str) -> None:
        self.senha_hash = generate_password_hash(senha)

    def verificar_senha(self, senha: str) -> bool:
        return bool(self.senha_hash) and check_password_hash(self.senha_hash, senha)

    # --- conveniências para templates ---
    @property
    def eh_moderador(self) -> bool:
        return self.papel == "moderador"

    @property
    def primeiro_nome(self) -> str:
        return self.nome.split()[0] if self.nome else ""

    @property
    def perfil_rotulo(self) -> str:
        return PERFIS.get(self.perfil, self.perfil)

    @property
    def telefone_formatado(self) -> str:
        """55279XXXXXXXX -> (27) 9XXXX-XXXX"""
        t = self.telefone or ""
        ddd, numero = t[2:4], t[4:]
        if len(numero) == 9:
            return f"({ddd}) {numero[:5]}-{numero[5:]}"
        return f"({ddd}) {numero[:4]}-{numero[4:]}"

    def __repr__(self) -> str:
        return f"<Usuario {self.email}>"
