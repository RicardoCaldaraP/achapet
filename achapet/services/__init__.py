"""Camada de serviços: regras de negócio do AchaPet.

As rotas (blueprints) só recebem a requisição, validam o formulário e chamam
estas funções. Assim a regra fica em um lugar só e é fácil de testar.
"""


class RegraNegocioError(Exception):
    """Erro de regra de negócio, com mensagem pronta para mostrar ao usuário."""
