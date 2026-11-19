/**
 * Denúncias e moderação.
 * A ocultação automática com 3 denúncias pendentes é feita por trigger no banco
 * (tg_denuncia_ocultar). Aqui ficam as regras de quem pode denunciar e a decisão
 * do moderador.
 */
import { ErroApp } from "../erros.js";

export function criarServicoModeracao({ prisma }) {
  async function denunciar(anuncio, usuario, { motivo, detalhe }) {
    if (anuncio.usuario_id === usuario.id) {
      throw new ErroApp(422, "Você não pode denunciar o seu próprio anúncio.");
    }
    try {
      await prisma.denuncia.create({
        data: { anuncio_id: anuncio.id, denunciante_id: usuario.id, motivo, detalhe },
      });
    } catch (erro) {
      if (erro.code === "P2002") throw new ErroApp(409, "Você já denunciou este anúncio. Obrigado!");
      throw erro;
    }
    const { status } = await prisma.anuncio.findUnique({
      where: { id: anuncio.id }, select: { status: true },
    });
    return status;
  }

  async function pendentes() {
    const anuncios = await prisma.anuncio.findMany({
      where: { denuncias: { some: { situacao: "pendente" } } },
      include: {
        usuario: { select: { nome: true, email: true } },
        fotos: { orderBy: { ordem: "asc" }, take: 1 },
        denuncias: { where: { situacao: "pendente" }, orderBy: { criado_em: "asc" } },
      },
    });
    return anuncios
      .map((a) => ({
        codigo: a.codigo, tipo: a.tipo, status: a.status, especie: a.especie,
        nome_pet: a.nome_pet, autor: a.usuario, foto_capa: a.fotos[0]?.caminho ?? null,
        denuncias: a.denuncias.map((d) => ({
          motivo: d.motivo, detalhe: d.detalhe, criado_em: d.criado_em,
        })),
      }))
      .sort((x, y) => y.denuncias.length - x.denuncias.length);
  }

  /** remover: denúncias procedentes e anúncio removido; manter: improcedentes e anúncio volta. */
  async function decidir(anuncio, moderador, decisao) {
    const remover = decisao === "remover";
    await prisma.$transaction([
      prisma.denuncia.updateMany({
        where: { anuncio_id: anuncio.id, situacao: "pendente" },
        data: {
          situacao: remover ? "procedente" : "improcedente",
          moderador_id: moderador.id,
          analisada_em: new Date(),
        },
      }),
      prisma.anuncio.update({
        where: { id: anuncio.id },
        data: { status: remover ? "removido" : anuncio.status === "oculto" ? "ativo" : anuncio.status },
      }),
    ]);
  }

  return { denunciar, pendentes, decidir };
}
