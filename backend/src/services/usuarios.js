/**
 * Contas de usuário.
 *
 * O login (e-mail e senha) fica no Supabase Auth. A tabela "usuario" do nosso
 * modelo guarda o perfil, com o MESMO id do Supabase Auth. A coluna senha_hash
 * fica nula porque quem guarda o hash da senha é o Supabase.
 */
import { ErroApp } from "../erros.js";

export function criarServicoUsuarios({ prisma, auth, storage }) {
  async function buscarPorEmail(email) {
    const [u] = await prisma.$queryRaw`SELECT id FROM usuario WHERE lower(email) = lower(${email})`;
    return u ?? null;
  }

  async function cadastrar(dados) {
    if (await buscarPorEmail(dados.email)) {
      throw new ErroApp(409, "Já existe uma conta com este e-mail.", {
        email: "Já existe uma conta com este e-mail.",
      });
    }
    const id = await auth.criarUsuario({ email: dados.email, senha: dados.senha, nome: dados.nome });
    try {
      return await prisma.usuario.create({
        data: {
          id,
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone,
          perfil: dados.perfil,
          aceite_termos_em: new Date(), // consentimento registrado (LGPD)
        },
      });
    } catch (erro) {
      await auth.excluirUsuario(id); // não deixa login "órfão" sem perfil
      throw erro;
    }
  }

  async function atualizar(id, dados) {
    return prisma.usuario.update({ where: { id }, data: dados });
  }

  /** Direito de eliminação (LGPD): apaga perfil, anúncios, fotos e o login. */
  async function excluir(id) {
    const fotos = await prisma.foto.findMany({
      where: { anuncio: { usuario_id: id } },
      select: { caminho: true },
    });
    await prisma.usuario.delete({ where: { id } }); // anúncios, fotos e alertas em cascata
    await storage.removerFotos(fotos.map((f) => f.caminho));
    await auth.excluirUsuario(id);
  }

  function apresentar(u) {
    return {
      id: u.id, nome: u.nome, email: u.email, telefone: u.telefone, perfil: u.perfil,
      papel: u.papel, verificado: u.verificado, aceite_termos_em: u.aceite_termos_em,
    };
  }

  return { cadastrar, atualizar, excluir, apresentar };
}
