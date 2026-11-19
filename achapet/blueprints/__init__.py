"""Blueprints: cada módulo agrupa as rotas de uma área do sistema.

main       páginas institucionais (início, sobre, termos)
auth       cadastro, login e conta do usuário
mural      mapa e lista de anúncios próximos
anuncios   publicar, ver, editar, cartaz, denunciar e gerenciar anúncios
moderacao  painel dos moderadores
api        endpoints JSON usados pelo JavaScript do mapa
"""

from functools import wraps

from flask import abort
from flask_login import current_user


def moderador_obrigatorio(view):
    """Decorator: só deixa passar usuários logados com papel de moderador."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.eh_moderador:
            abort(403)
        return view(*args, **kwargs)

    return wrapper
