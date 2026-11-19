"""Pacote principal do AchaPet.

A aplicação é criada pela Application Factory `create_app()`: ela carrega a
configuração do ambiente, liga as extensões (padrão init_app) e registra os
blueprints. Nada é criado em variável global, o que permite ter instâncias
diferentes para desenvolvimento, testes e produção.
"""

import os

from flask import Flask

from config import configs


def create_app(config_name: str | None = None) -> Flask:
    """Cria e configura uma instância da aplicação Flask."""
    config_name = config_name or os.getenv("APP_ENV", "dev")
    app = Flask(__name__)
    app.config.from_object(configs[config_name])

    # 1) Extensões (cada uma tem seu init_app em achapet/ext)
    from achapet.ext import csrf, db, logging, login, migrate, storage

    logging.init_app(app)
    db.init_app(app)
    migrate.init_app(app)
    login.init_app(app)
    csrf.init_app(app)
    storage.init_app(app)

    # 2) Blueprints (cada módulo registra o seu)
    from achapet.blueprints import anuncios, api, auth, main, moderacao, mural

    for blueprint in (main, auth, mural, anuncios, moderacao, api):
        blueprint.init_app(app)

    # 3) Tratamento de erros, filtros de template e comandos de terminal
    from achapet import cli, erros, template_utils

    erros.init_app(app)
    template_utils.init_app(app)
    cli.init_app(app)

    app.logger.info("AchaPet iniciado no ambiente '%s'", config_name)
    return app
