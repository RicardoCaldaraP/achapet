"""Geração do QR code do cartaz para impressão."""

import base64
import io

import qrcode
from qrcode.constants import ERROR_CORRECT_M


def qr_code_data_uri(url: str) -> str:
    """Devolve o QR code de uma URL como imagem PNG embutida (data URI)."""
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    imagem = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    imagem.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()
