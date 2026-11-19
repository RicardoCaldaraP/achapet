/**
 * Cliente do Prisma (ORM) conectado ao PostgreSQL pelo driver "pg".
 *
 * O schema de trabalho (public em produção, "testes" nos testes) vale para o
 * Prisma e também para as consultas SQL com PostGIS ($queryRaw) e as funções
 * do banco, que passam a enxergar as tabelas certas.
 */
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export function criarPrisma({ url, schema = "public" }) {
  const pool = new pg.Pool({
    connectionString: url,
    max: 5,
    // Fora do schema padrão (testes), toda conexão já abre procurando nele.
    ...(schema !== "public" && { options: `-c search_path=${schema},public,extensions` }),
  });
  const adapter = new PrismaPg(pool, { schema });
  return new PrismaClient({ adapter });
}
