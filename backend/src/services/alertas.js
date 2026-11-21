/**
 * Alertas por região: o usuário marca uma área no mapa (centro + raio) e recebe
 * um e-mail quando alguém publica um anúncio ali. Usa a tabela alerta_regiao do
 * modelo físico; a área é GEOGRAPHY e a busca usa ST_DWithin do PostGIS.
 */
import { ErroApp } from "../erros.js";

export const LIMITE_ALERTAS_POR_USUARIO = 5;
const ROTULO_ESPECIE = { cachorro: "Cachorro", gato: "Gato", outro: "Animal" };

export function criarServicoAlertas({ prisma, email, config, logger }) {
  /** Alertas do usuário com o centro em latitude/longitude. */
  async function listar(usuarioId) {
    return prisma.$queryRaw`
      SELECT id, raio_m, especie, tipo, ativo, criado_em,
             ST_Y(centro::geometry) AS latitude, ST_X(centro::geometry) AS longitude
        FROM alerta_regiao
       WHERE usuario_id = ${usuarioId}::uuid
       ORDER BY criado_em DESC`;
  }

  async function buscarDoUsuario(usuarioId, id) {
    const alerta = await prisma.alertaRegiao.findFirst({
      where: { id: BigInt(id), usuario_id: usuarioId },
      select: { id: true },
    });
    if (!alerta) throw new ErroApp(404, "Alerta não encontrado.");
    return alerta;
  }

  async function criar(usuarioId, d) {
    const total = await prisma.alertaRegiao.count({ where: { usuario_id: usuarioId } });
    if (total >= LIMITE_ALERTAS_POR_USUARIO) {
      throw new ErroApp(422, `Você pode ter no máximo ${LIMITE_ALERTAS_POR_USUARIO} alertas. Exclua um para criar outro.`);
    }
    const [novo] = await prisma.$queryRaw`
      INSERT INTO alerta_regiao (usuario_id, centro, raio_m, especie, tipo)
      VALUES (${usuarioId}::uuid,
              ST_SetSRID(ST_MakePoint(${d.longitude}, ${d.latitude}), 4326)::geography,
              ${d.raio_m}::int, ${d.especie}, ${d.tipo})
      RETURNING id`;
    return (await listar(usuarioId)).find((a) => a.id === novo.id);
  }

  async function definirAtivo(usuarioId, id, ativo) {
    const alerta = await buscarDoUsuario(usuarioId, id);
    await prisma.alertaRegiao.update({ where: { id: alerta.id }, data: { ativo } });
    return (await listar(usuarioId)).find((a) => a.id === alerta.id);
  }

  async function excluir(usuarioId, id) {
    const alerta = await buscarDoUsuario(usuarioId, id);
    await prisma.alertaRegiao.delete({ where: { id: alerta.id } });
  }

  /** Quem deve ser avisado sobre um anúncio novo (um e-mail por pessoa). */
  async function destinatarios(anuncioId) {
    return prisma.$queryRaw`
      SELECT DISTINCT u.email, u.nome
        FROM alerta_regiao r
        JOIN usuario u ON u.id = r.usuario_id
        JOIN anuncio a ON a.id = ${anuncioId}::bigint
       WHERE r.ativo
         AND r.usuario_id <> a.usuario_id
         AND (r.especie IS NULL OR r.especie = a.especie)
         AND (r.tipo IS NULL OR r.tipo = a.tipo)
         AND ST_DWithin(r.centro, a.localizacao, r.raio_m)`;
  }

  function mensagem(anuncio, nome) {
    const tipo = anuncio.tipo === "perdido" ? "perdido" : "encontrado";
    const bicho = anuncio.nome_pet || ROTULO_ESPECIE[anuncio.especie] || "Animal";
    const lugar = [anuncio.bairro, anuncio.cidade].filter(Boolean).join(", ") || "perto da sua área";
    const link = `${config.SITE_URL.replace(/\/$/, "")}/a/${anuncio.codigo}`;
    const alertas = `${config.SITE_URL.replace(/\/$/, "")}/alertas`;
    const assunto = `AchaPet: ${bicho} ${tipo} em ${lugar}`;
    const texto =
      `Olá, ${nome}!\n\nUm anúncio novo foi publicado na área que você acompanha:\n` +
      `${bicho} ${tipo} em ${lugar}.\n\nVeja o anúncio: ${link}\n\n` +
      `Para pausar ou excluir este alerta: ${alertas}\n\nAchaPet`;
    const html = `
      <div style="font-family:Arial,sans-serif;color:#3b2a20;max-width:520px">
        <p>Olá, ${nome}!</p>
        <p>Um anúncio novo foi publicado na área que você acompanha:</p>
        <p style="font-size:18px"><strong>${bicho} ${tipo}</strong> em ${lugar}.</p>
        <p><a href="${link}" style="background:#f29e4c;color:#3b2a20;padding:10px 18px;border-radius:20px;text-decoration:none;font-weight:bold">Ver o anúncio</a></p>
        <p style="font-size:12px;color:#7a6355">Nunca pague para receber um animal de volta.
        Para pausar ou excluir este alerta, acesse <a href="${alertas}">${alertas}</a>.</p>
      </div>`;
    return { assunto, texto, html };
  }

  /** Envia os e-mails de um anúncio recém-publicado. Erros de envio não derrubam a publicação. */
  async function notificarNovoAnuncio(anuncio) {
    const lista = await destinatarios(anuncio.id);
    const envios = await Promise.allSettled(
      lista.map(({ email: para, nome }) => email.enviar({ para, ...mensagem(anuncio, nome) })),
    );
    const falhas = envios.filter((e) => e.status === "rejected");
    if (falhas.length) logger?.warn({ codigo: anuncio.codigo, falhas: falhas.length }, "falha ao enviar alertas");
    const enviados = envios.filter((e) => e.status === "fulfilled" && e.value).length;
    if (lista.length) logger?.info({ codigo: anuncio.codigo, destinatarios: lista.length, enviados }, "alertas de novo anúncio");
    return { destinatarios: lista.length, enviados };
  }

  return { listar, criar, definirAtivo, excluir, destinatarios, notificarNovoAnuncio };
}
