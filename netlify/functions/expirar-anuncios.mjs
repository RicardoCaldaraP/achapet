/**
 * Tarefa agendada (Netlify Scheduled Function): todo dia às 3h (UTC) marca como
 * expirados os anúncios com mais de 30 dias sem renovação.
 */
import { criarDependencias } from "../../backend/src/dependencias.js";
import { criarServicoAnuncios } from "../../backend/src/services/anuncios.js";

export default async () => {
  const deps = criarDependencias();
  const anuncios = criarServicoAnuncios({ ...deps, geo: null });
  const total = await anuncios.expirarVencidos();
  deps.logger.info({ total }, "anúncios expirados");
  await deps.prisma.$disconnect();
  return new Response(JSON.stringify({ expirados: total }));
};

export const config = { schedule: "0 3 * * *" };
