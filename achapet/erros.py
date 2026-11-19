"""Tratamento centralizado de erros.

Páginas HTML amigáveis para o site e respostas JSON para a API (/api/...).
Erros inesperados (500) são registrados no log com o traceback completo.
"""

import logging

from flask import jsonify, render_template, request
from werkzeug.exceptions import HTTPException

from achapet.ext.db import db

log = logging.getLogger(__name__)

MENSAGENS = {
    400: ("Requisição inválida", "Algo no que foi enviado não está certo. Tente de novo."),
    403: ("Acesso negado", "Você não tem permissão para fazer isso."),
    404: ("Página não encontrada", "O anúncio ou a página que você procura não existe mais."),
    413: ("Arquivo grande demais", "As fotos passaram do limite. Envie imagens menores."),
    500: ("Erro no servidor", "Tivemos um problema do nosso lado. Já estamos olhando."),
}


def _resposta(codigo: int):
    titulo, mensagem = MENSAGENS.get(codigo, MENSAGENS[500])
    if request.path.startswith("/api/"):
        return jsonify(erro=titulo, mensagem=mensagem), codigo
    return (
        render_template("errors/erro.html", codigo=codigo, titulo=titulo, mensagem=mensagem),
        codigo,
    )


def init_app(app):
    @app.errorhandler(HTTPException)
    def erro_http(erro):
        if erro.code in MENSAGENS:
            return _resposta(erro.code)
        return erro

    @app.errorhandler(Exception)
    def erro_inesperado(erro):
        db.session.rollback()
        log.exception("Erro não tratado em %s %s", request.method, request.path)
        return _resposta(500)
