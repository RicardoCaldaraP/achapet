/**
 * Monta as dependências reais (produção e desenvolvimento) a partir do .env.
 * Usado pelo servidor local (server.js) e pelas funções da Netlify.
 */
import { carregarConfig } from "./config.js";
import { criarLogger } from "./lib/logger.js";
import { criarPrisma } from "./lib/prisma.js";
import {
  criarClienteSupabase,
  criarServicoAuth,
  criarServicoStorage,
} from "./lib/supabase.js";

export function criarDependencias(env = process.env) {
  const config = carregarConfig(env);
  const logger = criarLogger({ nivel: config.LOG_LEVEL, ambiente: config.NODE_ENV });
  const prisma = criarPrisma({ url: config.DATABASE_URL, schema: config.DB_SCHEMA });
  const supabase = criarClienteSupabase({
    url: config.SUPABASE_URL,
    chaveSecreta: config.SUPABASE_SECRET_KEY,
  });
  return {
    config,
    logger,
    prisma,
    supabase, // usado pelos scripts (fotos de demonstração)
    auth: criarServicoAuth(supabase),
    storage: criarServicoStorage(supabase),
  };
}
