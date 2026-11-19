"""Armazenamento das fotos dos anúncios.

Duas implementações com a mesma interface (salvar, remover, url):
- SupabaseStorage: envia para um bucket público do Supabase Storage (produção).
- LocalStorage: grava em uma pasta local servida pelo Flask (desenvolvimento e testes).

A escolha é feita pela configuração STORAGE_BACKEND, sem mudar o resto do código.
"""

import logging
import os

import requests
from flask import current_app, url_for

log = logging.getLogger(__name__)


class StorageError(Exception):
    """Falha ao salvar ou remover um arquivo."""


class LocalStorage:
    def __init__(self, pasta: str):
        self.pasta = pasta
        os.makedirs(pasta, exist_ok=True)

    def salvar(self, caminho: str, conteudo: bytes, content_type: str = "image/jpeg") -> None:
        destino = os.path.join(self.pasta, caminho)
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        with open(destino, "wb") as arquivo:
            arquivo.write(conteudo)

    def remover(self, caminho: str) -> None:
        try:
            os.remove(os.path.join(self.pasta, caminho))
        except FileNotFoundError:
            pass

    def url(self, caminho: str) -> str:
        return url_for("main.upload", caminho=caminho)


class SupabaseStorage:
    def __init__(self, base_url: str, service_key: str, bucket: str):
        self.base_url = base_url
        self.bucket = bucket
        self.headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}

    def salvar(self, caminho: str, conteudo: bytes, content_type: str = "image/jpeg") -> None:
        resposta = requests.post(
            f"{self.base_url}/storage/v1/object/{self.bucket}/{caminho}",
            headers={**self.headers, "Content-Type": content_type, "x-upsert": "true"},
            data=conteudo,
            timeout=20,
        )
        if resposta.status_code >= 300:
            log.error("Falha no upload para o Storage: %s %s", resposta.status_code, resposta.text)
            raise StorageError("Não foi possível salvar a foto. Tente novamente.")

    def remover(self, caminho: str) -> None:
        resposta = requests.delete(
            f"{self.base_url}/storage/v1/object/{self.bucket}",
            headers=self.headers,
            json={"prefixes": [caminho]},
            timeout=20,
        )
        if resposta.status_code >= 300:
            log.warning("Falha ao remover %s do Storage: %s", caminho, resposta.status_code)

    def url(self, caminho: str) -> str:
        return f"{self.base_url}/storage/v1/object/public/{self.bucket}/{caminho}"


def init_app(app):
    if app.config["STORAGE_BACKEND"] == "supabase":
        backend = SupabaseStorage(
            app.config["SUPABASE_URL"],
            app.config["SUPABASE_SERVICE_KEY"],
            app.config["SUPABASE_BUCKET"],
        )
    else:
        backend = LocalStorage(app.config["UPLOAD_FOLDER"])
    app.extensions["storage"] = backend


def get_storage():
    """Devolve o backend configurado para a aplicação atual."""
    return current_app.extensions["storage"]
