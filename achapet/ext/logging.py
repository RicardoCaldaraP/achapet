"""Configuração de logging da aplicação.

Os módulos usam `logging.getLogger(__name__)`; aqui definimos formato e nível
para todos eles de uma vez (nível vem de LOG_LEVEL no .env).
"""

import logging
import sys

FORMATO = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"


def init_app(app):
    nivel = getattr(logging, str(app.config.get("LOG_LEVEL", "INFO")).upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(FORMATO, datefmt="%Y-%m-%d %H:%M:%S"))

    raiz = logging.getLogger("achapet")
    raiz.handlers.clear()
    raiz.addHandler(handler)
    raiz.setLevel(nivel)
    raiz.propagate = False

    app.logger.handlers.clear()
    app.logger.addHandler(handler)
    app.logger.setLevel(nivel)
