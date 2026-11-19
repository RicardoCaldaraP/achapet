"""Tratamento das fotos: validação, redimensionamento e envio para o storage."""

import io
import logging
import uuid

from flask import current_app
from PIL import Image, ImageOps, UnidentifiedImageError

from achapet.ext.storage import get_storage
from achapet.models import Foto
from achapet.services import RegraNegocioError

log = logging.getLogger(__name__)


def processar_imagem(conteudo: bytes) -> bytes:
    """Valida que o arquivo é uma imagem e devolve um JPEG reduzido (máx. 1280 px).

    O navegador já comprime as fotos antes do envio; aqui garantimos o limite
    mesmo se alguém enviar direto, e removemos metadados (EXIF com GPS, por exemplo).
    """
    try:
        imagem = Image.open(io.BytesIO(conteudo))
        imagem = ImageOps.exif_transpose(imagem)
    except (UnidentifiedImageError, OSError) as erro:
        raise RegraNegocioError("Um dos arquivos enviados não é uma imagem válida.") from erro

    lado = current_app.config["FOTO_LADO_MAXIMO_PX"]
    imagem.thumbnail((lado, lado))
    if imagem.mode != "RGB":
        imagem = imagem.convert("RGB")

    saida = io.BytesIO()
    imagem.save(saida, format="JPEG", quality=82, optimize=True)
    return saida.getvalue()


def arquivos_validos(arquivos) -> list:
    """Filtra os campos de arquivo vazios que o navegador envia."""
    return [a for a in (arquivos or []) if a and getattr(a, "filename", "")]


def salvar_fotos(anuncio, arquivos) -> None:
    """Processa e salva até 3 fotos, na ordem enviada."""
    storage = get_storage()
    for ordem, arquivo in enumerate(arquivos_validos(arquivos), start=1):
        conteudo = processar_imagem(arquivo.read())
        caminho = f"{anuncio.codigo}/{uuid.uuid4().hex}.jpg"
        storage.salvar(caminho, conteudo)
        anuncio.fotos.append(Foto(caminho=caminho, ordem=ordem))
    log.info("%s foto(s) salvas para o anúncio %s", len(anuncio.fotos), anuncio.codigo)


def remover_fotos(anuncio) -> None:
    """Apaga os arquivos do storage (as linhas da tabela saem por cascata)."""
    storage = get_storage()
    for foto in list(anuncio.fotos):
        storage.remover(foto.caminho)


def url_foto(caminho: str | None) -> str | None:
    return get_storage().url(caminho) if caminho else None
