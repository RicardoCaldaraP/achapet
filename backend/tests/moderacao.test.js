import { describe, expect, it } from "vitest";
import supertest from "supertest";
import { app, criarAnuncio, criarUsuario, limparBancoAposCadaTeste, prisma, tornarModerador } from "./ajudantes.js";

const request = supertest(app);
limparBancoAposCadaTeste();

const denunciar = (codigo, usuario, motivo = "golpe") =>
  request.post(`/api/anuncios/${codigo}/denuncias`).set(usuario.auth).send({ motivo, detalhe: "Pediu Pix" });

describe("denúncias", () => {
  it("registra uma denúncia por usuário e bloqueia a do próprio autor", async () => {
    const autor = await criarUsuario(request);
    const vizinho = await criarUsuario(request);
    const a = await criarAnuncio(request, autor);
    expect((await denunciar(a.codigo, vizinho)).status).toBe(201);
    expect((await denunciar(a.codigo, vizinho)).status).toBe(409);
    expect((await denunciar(a.codigo, autor)).status).toBe(422);
    expect((await denunciar(a.codigo, vizinho, "xyz")).status).toBe(400);
  });

  it("oculta o anúncio com 3 denúncias pendentes (trigger do banco)", async () => {
    const autor = await criarUsuario(request);
    const a = await criarAnuncio(request, autor);
    let ultima;
    for (let i = 0; i < 3; i++) ultima = await denunciar(a.codigo, await criarUsuario(request));
    expect(ultima.body.status).toBe("oculto");
    expect((await request.get(`/api/anuncios/${a.codigo}`)).status).toBe(404); // visitante não vê
    expect((await request.get(`/api/anuncios/${a.codigo}`).set(autor.auth)).status).toBe(200); // autor vê
  });
});

describe("moderação", () => {
  it("é restrita a moderadores", async () => {
    const u = await criarUsuario(request);
    expect((await request.get("/api/moderacao/denuncias").set(u.auth)).status).toBe(403);
  });

  it("lista pendências e remove o anúncio", async () => {
    const autor = await criarUsuario(request);
    const mod = await criarUsuario(request);
    await tornarModerador(mod);
    const a = await criarAnuncio(request, autor);
    await denunciar(a.codigo, await criarUsuario(request));

    const lista = await request.get("/api/moderacao/denuncias").set(mod.auth);
    expect(lista.body.map((x) => x.codigo)).toEqual([a.codigo]);

    const r = await request.post(`/api/moderacao/anuncios/${a.codigo}/decisao`).set(mod.auth).send({ decisao: "remover" });
    expect(r.status).toBe(200);
    const salvo = await prisma.anuncio.findUnique({ where: { codigo: a.codigo }, include: { denuncias: true } });
    expect(salvo.status).toBe("removido");
    expect(salvo.denuncias[0].situacao).toBe("procedente");
  });

  it("mantém o anúncio e ele volta a ficar visível", async () => {
    const autor = await criarUsuario(request);
    const mod = await criarUsuario(request);
    await tornarModerador(mod);
    const a = await criarAnuncio(request, autor);
    for (let i = 0; i < 3; i++) await denunciar(a.codigo, await criarUsuario(request));
    await request.post(`/api/moderacao/anuncios/${a.codigo}/decisao`).set(mod.auth).send({ decisao: "manter" });
    expect((await request.get(`/api/anuncios/${a.codigo}`)).body.status).toBe("ativo");
    expect((await request.post(`/api/moderacao/anuncios/${a.codigo}/decisao`).set(mod.auth).send({ decisao: "talvez" })).status).toBe(400);
  });
});
