"""Cadastro, autenticação e exclusão de contas (LGPD)."""

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select

from achapet.ext.db import db
from achapet.models import Usuario
from achapet.services import RegraNegocioError, fotos

log = logging.getLogger(__name__)


def buscar_por_email(email: str) -> Usuario | None:
    consulta = select(Usuario).where(func.lower(Usuario.email) == email.strip().lower())
    return db.session.scalar(consulta)


def cadastrar(nome: str, email: str, telefone: str, senha: str, perfil: str = "pessoa") -> Usuario:
    if buscar_por_email(email):
        raise RegraNegocioError("Já existe uma conta com este e-mail.")
    usuario = Usuario(
        nome=nome.strip(),
        email=email.strip().lower(),
        telefone=telefone,
        perfil=perfil,
        aceite_termos_em=datetime.now(timezone.utc),  # consentimento registrado (LGPD)
    )
    usuario.definir_senha(senha)
    db.session.add(usuario)
    db.session.commit()
    log.info("Novo usuário cadastrado: %s (%s)", usuario.email, perfil)
    return usuario


def autenticar(email: str, senha: str) -> Usuario | None:
    usuario = buscar_por_email(email)
    if usuario and usuario.verificar_senha(senha):
        return usuario
    log.info("Tentativa de login inválida para %s", email)
    return None


def atualizar_dados(usuario: Usuario, nome: str, telefone: str, perfil: str) -> None:
    usuario.nome = nome.strip()
    usuario.telefone = telefone
    usuario.perfil = perfil
    db.session.commit()


def excluir_conta(usuario: Usuario) -> None:
    """Apaga a conta, os anúncios e as fotos (direito de eliminação da LGPD)."""
    email = usuario.email
    for anuncio in usuario.anuncios:
        fotos.remover_fotos(anuncio)
    db.session.delete(usuario)  # anúncios, fotos e alertas saem por cascata no banco
    db.session.commit()
    log.warning("Conta excluída a pedido do titular: %s", email)
