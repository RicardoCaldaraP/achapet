# AchaPet

Rede geolocalizada de animais perdidos e encontrados da Grande Vitória (ES).
Projeto final de **Desenvolvimento de Sistemas para Web (UVV)**.

**Grupo:** Ricardo Caldara Pinto, Ana Clara Costa Luksik Schmidt e Bernardo Santos Proti.

## O que o sistema faz

- Cadastro e login por e-mail, com aceite dos termos (LGPD).
- Publicação de anúncio de animal **perdido** ou **encontrado**: espécie, porte, cores, sexo, nome,
  raça, descrição, data, até 3 fotos e local por GPS, CEP ou pino no mapa.
- **Mural** com mapa (Leaflet + OpenStreetMap) e lista dos anúncios num raio de 1 a 20 km, com
  filtros por tipo, espécie e período.
- **Página do anúncio** com link curto (`/a/CODIGO`), compartilhamento no WhatsApp e
  **cartaz para impressão com QR code**.
- **Correspondências automáticas** entre perdidos e encontrados (mesma espécie e porte, ao menos
  uma cor em comum, até 5 km e datas compatíveis).
- **Segurança**: telefone visível só para usuários logados, aviso antigolpe, local público
  arredondado (~300 m), denúncias com ocultação automática após 3 denúncias e painel de moderação.
- **Gestão**: editar, renovar, marcar como reencontrado, excluir; expiração após 30 dias;
  exclusão da conta apaga anúncios e fotos.

## Tecnologias

| Camada | Escolha |
|---|---|
| Backend | Python 3.11+, Flask 3 (Application Factory + Blueprints) |
| Formulários | Flask-WTF / WTForms (validação no servidor + CSRF) |
| Banco | PostgreSQL + PostGIS no Supabase, Flask-SQLAlchemy + GeoAlchemy2, Flask-Migrate |
| Autenticação | Flask-Login + hash de senha (Werkzeug) |
| Frontend | Jinja2, Bootstrap 5, Leaflet, JavaScript puro |
| Fotos | Pillow (reduz e remove EXIF) + Supabase Storage |
| Testes | pytest, pytest-flask, pytest-cov |
| Ferramentas | Invoke, black, flake8 |

## Estrutura

```
AchaPet/
├── app.py                 # ponto de entrada: app = create_app()
├── config.py              # DevConfig, TestConfig, ProdConfig (lidas do .env)
├── tasks.py               # invoke install | run | test | lint | db | seed
├── pyproject.toml         # dependências (prod, dev e test)
├── achapet/
│   ├── __init__.py        # create_app(): extensões, blueprints, erros, CLI
│   ├── ext/               # db, migrate, login, csrf, logging, storage (cada um com init_app)
│   ├── models/            # Usuario, Anuncio, Foto, Cor, Denuncia, Avistamento, AlertaRegiao
│   ├── services/          # regras de negócio (anúncios, busca, moderação, fotos, geo, cartaz)
│   ├── blueprints/        # main, auth, mural, anuncios, moderacao, api
│   ├── templates/         # Jinja2 (base, parciais, uma pasta por blueprint)
│   ├── static/            # css, js, imagens e bibliotecas (vendor)
│   ├── validators.py      # validadores dos formulários
│   ├── erros.py           # páginas de erro e respostas JSON da API
│   ├── cli.py / seed.py   # comandos flask expirar | criar-moderador | seed
├── migrations/            # Flask-Migrate; sql/0001_modelo_fisico.sql é o modelo físico
└── tests/                 # 72 testes (rotas, formulários, regras e serviços)
```

## Como rodar (Windows)

Pré-requisitos: Python 3.11 ou mais novo e o projeto do Supabase já criado.

```powershell
cd C:\Codes\AchaPet
python -m venv venv
venv\Scripts\activate
pip install -e ".[dev,test]"
copy .env.example .env     # depois preencha DATABASE_URL, SECRET_KEY e as chaves do Supabase
flask db upgrade           # cria as tabelas (no Supabase deste projeto já está aplicado)
flask seed                 # opcional: dados de demonstração
flask run --debug          # abre em http://127.0.0.1:5000
```

No Linux/macOS, troque `venv\Scripts\activate` por `source venv/bin/activate` e `copy` por `cp`.

Com o Invoke instalado, os atalhos são `invoke run`, `invoke test`, `invoke lint` e `invoke seed`.

### Contas de demonstração (senha `achapet123`)

| E-mail | Papel |
|---|---|
| ricardo@achapet.dev | moderador |
| ana@achapet.dev, bernardo@achapet.dev, marina@achapet.dev | usuários |
| ong@achapet.dev | ONG |

Para tornar outro usuário moderador: `flask criar-moderador email@exemplo.com`.

## Testes

```powershell
pytest -v --cov=achapet --cov-report=term-missing
```

Os testes criam um schema separado (`testes`) no mesmo banco, rodam o script do modelo físico
nele e apagam tudo no fim. Os dados reais não são tocados, e nenhum teste acessa a internet
(CEP, Nominatim e Storage são simulados).

## Variáveis de ambiente

Veja `.env.example`. As principais:

- `DATABASE_URL`: string do **Session pooler** do Supabase (porta 5432).
- `SECRET_KEY`: chave aleatória da sessão.
- `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`: para salvar as fotos no Storage. Sem a chave, as fotos
  ficam na pasta local `achapet/static/uploads`.

## Créditos

Mapas © colaboradores do OpenStreetMap. Fontes Fredoka e Nunito (SIL Open Font License).
Mascotes desenhados em SVG para o projeto.
