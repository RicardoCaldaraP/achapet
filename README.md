# AchaPet

Rede geolocalizada de animais perdidos e encontrados da Grande Vitória (ES).
Projeto final de **Desenvolvimento de Sistemas para Web (UVV)**.

**Grupo:** Ricardo Caldara Pinto, Ana Clara Costa Luksik Schmidt e Bernardo Santos Proti.

## Funcionalidades (MVP)

1. **Cadastro e acesso**: cadastro e login por e-mail com aceite dos termos; o mural é aberto sem conta.
2. **Publicação de anúncios**: perdido ou encontrado, com espécie, porte, cores, sexo, nome, raça,
   descrição, data, até 3 fotos e local por GPS, CEP ou pino no mapa.
3. **Mural geolocalizado**: mapa e lista dos anúncios ativos num raio de 1 a 20 km, com filtros
   por tipo, espécie e período.
4. **Página do anúncio e cartaz**: link curto (`/a/CODIGO`), compartilhamento no WhatsApp e cartaz
   para impressão com QR code.
5. **Correspondências automáticas**: anúncios do tipo oposto, mesma espécie e porte, ao menos uma
   cor em comum, até 5 km e datas compatíveis.
6. **Segurança e moderação**: telefone só para usuários logados, aviso antigolpe, local público
   arredondado (~300 m); com 3 denúncias pendentes o anúncio fica oculto até a análise.
7. **Gestão dos anúncios**: editar, renovar, excluir, marcar como reencontrado; expiração
   automática após 30 dias.

Complementares implementados: **alertas por e-mail** de anúncios novos numa área escolhida no mapa, detalhe
oculto (só o autor vê) e selo de ONG/protetor verificado. A página inicial mostra os **indicadores do piloto**:
anúncios publicados, taxa de reencontro e tempo médio do sumiço até o reencontro.
O app é um **PWA** instalável no celular.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite, PWA (vite-plugin-pwa), React Router, Bootstrap 5, Leaflet/OpenStreetMap |
| Formulários | React Hook Form + Zod (navegador) e Zod de novo no servidor |
| Backend | Node.js + Express 5 (createApp com injeção de dependência, Routers, middlewares) |
| ORM | Prisma 7 com driver adapter `pg` |
| Banco | PostgreSQL + PostGIS no Supabase |
| Supabase | Auth (login por e-mail), API REST (busca do mural via RPC) e Storage (fotos) |
| Geolocalização | Nominatim (bairro pelo ponto), BrasilAPI e ViaCEP (CEP), IBGE (estados e municípios) |
| Bibliotecas | qrcode (cartaz), browser-image-compression (fotos até 1 MB), pino (logs), helmet, Nodemailer (e-mails dos alertas) |
| Testes | Vitest + Supertest (API) e Vitest + Testing Library (React) |
| Hospedagem | Netlify (site + Express como função serverless + tarefa agendada) e Supabase |

## Estrutura

```
AchaPet/
├── package.json            # workspaces (backend, frontend) e scripts gerais
├── netlify.toml            # build, funções e redirecionamentos
├── netlify/functions/
│   ├── api.mjs             # a API Express rodando como função serverless
│   └── expirar-anuncios.mjs# tarefa diária: expira anúncios com 30 dias
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # modelos do ORM (espelham o modelo físico)
│   │   └── migrations/     # 0_modelo_fisico (script do projeto) e 1_seguranca_api
│   ├── src/
│   │   ├── app.js          # createApp(): fábrica da aplicação
│   │   ├── config.js       # variáveis de ambiente validadas com Zod
│   │   ├── dependencias.js # monta Prisma, Supabase e logger a partir do .env
│   │   ├── routes/         # usuarios, anuncios, alertas, moderacao, geral (Routers)
│   │   ├── services/       # regras de negócio
│   │   ├── schemas.js      # validação dos dados recebidos
│   │   ├── middlewares.js  # autenticação, moderador, validação
│   │   ├── erros.js        # erros padronizados em JSON
│   │   └── lib/            # prisma, supabase, logger, email
│   ├── scripts/seed.js     # dados de demonstração
│   └── tests/              # 53 testes da API
└── frontend/
    ├── src/
    │   ├── pages/          # Inicio, Mural, Anuncio, Cartaz, FormAnuncio, ...
    │   ├── components/     # Layout, mascotes (Pets), SeletorLocal, ...
    │   ├── contexts/       # sessão (AuthContext) e avisos
    │   ├── lib/            # api, supabase, geo (CEP/IBGE), fotos, validação
    │   ├── styles/app.css  # identidade visual
    │   └── testes/         # testes do frontend
    └── vite.config.js      # Vite + PWA
```

## Como rodar no computador

Pré-requisitos: **Node.js 20 ou mais novo** e o projeto do Supabase criado.

```bash
npm install                                  # instala backend e frontend
cp backend/.env.example backend/.env         # preencha DATABASE_URL e as chaves do Supabase
cp frontend/.env.example frontend/.env.local # preencha a URL e a chave publicável
npm run prisma:migrar --workspace backend    # cria as tabelas (no projeto atual já está aplicado)
npm run seed                                 # opcional: dados de demonstração (com fotos)
npm run dev:api                              # API em http://localhost:3001
npm run dev:site                             # site em http://localhost:5173 (em outro terminal)
```

No Windows, troque `cp` por `copy`.

### Contas de demonstração (senha `achapet123`)

| E-mail | Papel |
|---|---|
| ricardo@achapet.dev | moderador |
| ana@achapet.dev, bernardo@achapet.dev, marina@achapet.dev | usuários |
| ong@achapet.dev | ONG verificada |

## Testes

```bash
npm test                                     # backend e frontend
npm run test:cobertura --workspace backend   # com relatório de cobertura
npm run lint
```

Os testes da API usam um PostgreSQL de verdade: criam um schema `testes`, rodam nele as mesmas
migrations e apagam tudo no fim. O Supabase Auth e o Storage são substituídos por versões falsas
(injeção de dependência no `createApp`), então nenhum teste usa a internet.

## Deploy (Netlify)

O `netlify.toml` já configura tudo. Variáveis de ambiente necessárias no painel da Netlify:
`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CORS_ORIGIN` (endereço do site),
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_API_URL=/api`.

Para os **alertas por e-mail**, acrescente também `SMTP_HOST`, `SMTP_PORTA`, `SMTP_USUARIO`, `SMTP_SENHA` e
`EMAIL_REMETENTE` (veja `backend/.env.example`; com o Gmail e uma senha de app é grátis). Sem essas variáveis o
site funciona normalmente e os alertas são só registrados no log.

## Créditos

Mapas © colaboradores do OpenStreetMap. Fontes Fredoka e Nunito (SIL Open Font License).
Mascotes desenhados em SVG para o projeto. As fotos dos anúncios de demonstração são do
Wikimedia Commons, com licenças livres; autores e licenças em
[`backend/scripts/fotos-demo/CREDITOS.md`](backend/scripts/fotos-demo/CREDITOS.md).
