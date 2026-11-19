"""Ponto de entrada da aplicação.

Desenvolvimento:  flask run --debug     (ou: invoke run)
Produção:         o servidor (Vercel/gunicorn) importa a variável `app`.
"""

from achapet import create_app

app = create_app()
