import { describe, expect, it } from "vitest";
import supertest from "supertest";
import { app, authFalso, criarAnuncio, criarUsuario, limparBancoAposCadaTeste, prisma, storageFalso } from "./ajudantes.js";

const request = supertest(app);
limparBancoAposCadaTeste();

const CADASTRO = {
  nome: "Carla Souza",
  email: "Carla@Teste.com",
  telefone: "(27) 99876-5432",
  perfil: "pessoa",
  senha: "segura123",
  aceite_termos: true,
};

describe("cadastro", () => {
  it("cria o login e o perfil, normalizando e-mail e telefone", async () => {
    const r = await request.post("/api/usuarios").send(CADASTRO);
    expect(r.status).toBe(201);
    expect(r.body.email).toBe("carla@teste.com");
    expect(r.body.telefone).toBe("5527998765432");
    const salvo = await prisma.usuario.findUnique({ where: { id: r.body.id } });
    expect(salvo.aceite_termos_em).toBeInstanceOf(Date);
    expect(salvo.senha_hash).toBeNull(); // a senha fica só no Supabase Auth
    expect(authFalso.logins.has(r.body.id)).toBe(true);
  });

  it("exige o aceite dos termos", async () => {
    const r = await request.post("/api/usuarios").send({ ...CADASTRO, aceite_termos: false });
    expect(r.status).toBe(400);
    expect(r.body.detalhes.aceite_termos).toMatch(/aceitar os termos/);
  });

  it("valida telefone, e-mail e senha no servidor", async () => {
    const r = await request
      .post("/api/usuarios")
      .send({ ...CADASTRO, telefone: "1234", email: "invalido", senha: "abc" });
    expect(r.status).toBe(400);
    expect(Object.keys(r.body.detalhes)).toEqual(expect.arrayContaining(["telefone", "email", "senha"]));
  });

  it("não deixa repetir e-mail (sem diferenciar maiúsculas)", async () => {
    await request.post("/api/usuarios").send(CADASTRO);
    const r = await request.post("/api/usuarios").send({ ...CADASTRO, email: "CARLA@teste.com" });
    expect(r.status).toBe(409);
  });
});

describe("conta", () => {
  it("pede login nas rotas protegidas", async () => {
    expect((await request.get("/api/usuarios/eu")).status).toBe(401);
    expect((await request.get("/api/usuarios/eu").set({ Authorization: "Bearer token-falso" })).status).toBe(401);
  });

  it("mostra e edita o perfil", async () => {
    const u = await criarUsuario(request);
    expect((await request.get("/api/usuarios/eu").set(u.auth)).body.nome).toBe("Ana Tutora");
    const r = await request
      .patch("/api/usuarios/eu")
      .set(u.auth)
      .send({ nome: "Ana Maria", telefone: "27 3333-4444", perfil: "protetor" });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ nome: "Ana Maria", telefone: "552733334444", perfil: "protetor" });
  });

  it("exclui conta, anúncios, fotos e login (LGPD)", async () => {
    const u = await criarUsuario(request);
    await criarAnuncio(request, u);
    const r = await request.delete("/api/usuarios/eu").set(u.auth);
    expect(r.status).toBe(204);
    expect(await prisma.usuario.count()).toBe(0);
    expect(await prisma.anuncio.count()).toBe(0);
    expect(storageFalso.removidos).toEqual([`${u.id}/foto1.jpg`]);
    expect(authFalso.logins.has(u.id)).toBe(false);
  });
});
