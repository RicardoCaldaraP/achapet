/** Rotas gerais: saúde da API e geocodificação reversa (Nominatim com cache). */
import { Router } from "express";
import { coordenadasSchema } from "../schemas.js";
import { validar } from "../middlewares.js";

export function rotasGerais({ prisma, servicos }) {
  const r = Router();

  r.get("/health", async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });

  r.get("/geo/endereco", validar(coordenadasSchema, "query"), async (req, res) => {
    const { lat, lng } = req.dados;
    res.json((await servicos.geo.enderecoPorPonto(lat, lng)) ?? {});
  });

  return r;
}
