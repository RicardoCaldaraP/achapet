/**
 * Antes de todos os testes: cria o schema "testes" no PostgreSQL e roda nele as
 * migrations (o mesmo modelo físico usado em produção). No fim, apaga o schema.
 * Assim dá para testar no mesmo banco do Supabase sem tocar nos dados reais.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

const URL_BANCO = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const MIGRATIONS = ["0_modelo_fisico", "1_seguranca_api"];

export async function setup() {
  const cliente = new pg.Client({ connectionString: URL_BANCO });
  await cliente.connect();
  await cliente.query('DROP SCHEMA IF EXISTS "testes" CASCADE; CREATE SCHEMA "testes"');
  await cliente.query('SET search_path TO "testes", public, extensions');
  for (const nome of MIGRATIONS) {
    const sql = readFileSync(new URL(`../prisma/migrations/${nome}/migration.sql`, import.meta.url), "utf8")
      // Em produção ela fica no schema "extensions" ou "public"; aqui já existe.
      .replace(/CREATE EXTENSION IF NOT EXISTS postgis;/, "")
      // A função do mural roda com search_path fixo; nos testes ele aponta para "testes".
      .replace(/SET search_path = public, extensions/g, "SET search_path = testes, public, extensions");
    await cliente.query(sql);
  }
  await cliente.end();
}

export async function teardown() {
  const cliente = new pg.Client({ connectionString: URL_BANCO });
  await cliente.connect();
  await cliente.query('DROP SCHEMA IF EXISTS "testes" CASCADE');
  await cliente.end();
}
