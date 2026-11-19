"""Tarefas automatizadas com Invoke.

Uso:  invoke install | invoke run | invoke test | invoke lint | invoke db | invoke seed
"""

from invoke import task


@task
def install(c):
    """Instala o projeto em modo editável com as dependências de dev e teste."""
    c.run('pip install -e ".[dev,test]"')


@task
def run(c):
    """Sobe o servidor de desenvolvimento com recarga automática."""
    c.run("flask run --debug", pty=False)


@task
def test(c, cov=True):
    """Roda a suíte de testes (com relatório de cobertura)."""
    cmd = "pytest -v"
    if cov:
        cmd += " --cov=achapet --cov-report=term-missing"
    c.run(cmd, pty=False)


@task
def lint(c):
    """Verifica estilo com flake8 e formatação com black."""
    c.run("flake8 achapet tests config.py app.py")
    c.run("black --check achapet tests config.py app.py")


@task
def fmt(c):
    """Formata o código com black."""
    c.run("black achapet tests config.py app.py")


@task
def db(c):
    """Aplica as migrations no banco configurado no .env."""
    c.run("flask db upgrade")


@task
def seed(c):
    """Popula o banco com dados de demonstração da Grande Vitória."""
    c.run("flask seed")
