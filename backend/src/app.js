/**
 * Fábrica da aplicação Express (equivalente à Application Factory do Flask).
 *
 * createApp() recebe todas as dependências prontas (banco, Supabase, logger,
 * configuração) em vez de criá-las por conta própria: é injeção de dependência.
 * Assim a mesma aplicação roda no servidor local, na função serverless da
 * Netlify e nos testes (que passam versões falsas do Supabase).
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";

import { naoEncontrado, tratarErros } from "./erros.js";
import { autenticar } from "./middlewares.js";
import { criarServicoAnuncios } from "./services/anuncios.js";
import { criarServicoUsuarios } from "./services/usuarios.js";
import { criarServicoModeracao } from "./services/moderacao.js";
import { criarServicoGeo } from "./services/geo.js";
import { rotasAnuncios } from "./routes/anuncios.js";
import { rotasUsuarios } from "./routes/usuarios.js";
import { rotasModeracao } from "./routes/moderacao.js";
import { rotasGerais } from "./routes/geral.js";

export function createApp({ config, prisma, auth, storage, logger, geo }) {
  const app = express();

  // ---------- serviços (regras de negócio) ----------
  const servicos = {
    geo: geo ?? criarServicoGeo({ userAgent: config.NOMINATIM_USER_AGENT, logger }),
  };
  servicos.anuncios = criarServicoAnuncios({ prisma, storage, geo: servicos.geo, config });
  servicos.usuarios = criarServicoUsuarios({ prisma, auth, storage });
  servicos.moderacao = criarServicoModeracao({ prisma });

  // ---------- middlewares globais ----------
  app.set("trust proxy", 1);
  app.set("json replacer", (_chave, valor) => (typeof valor === "bigint" ? valor.toString() : valor));
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN.split(","), credentials: false }));
  app.use(express.json({ limit: "100kb" }));
  app.use(pinoHttp({ logger, autoLogging: config.NODE_ENV !== "test" }));
  const semLimiteNosTestes = () => config.NODE_ENV === "test";
  app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, skip: semLimiteNosTestes }));

  const exigirLogin = autenticar({ auth, prisma, obrigatorio: true });
  const loginOpcional = autenticar({ auth, prisma, obrigatorio: false });
  const deps = { config, prisma, servicos, exigirLogin, loginOpcional, semLimiteNosTestes };

  // ---------- rotas (cada módulo é um Router) ----------
  app.use("/api", rotasGerais(deps));
  app.use("/api/usuarios", rotasUsuarios(deps));
  app.use("/api/anuncios", rotasAnuncios(deps));
  app.use("/api/moderacao", rotasModeracao(deps));

  // ---------- erros ----------
  app.use(naoEncontrado);
  app.use(tratarErros);

  app.locals.servicos = servicos;
  return app;
}
