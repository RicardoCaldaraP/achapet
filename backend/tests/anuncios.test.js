import { describe, expect, it } from "vitest";
import supertest from "supertest";
import {
  app, criarAnuncio, criarUsuario, dadosAnuncio, limparBancoAposCadaTeste, prisma, storageFalso,
} from "./ajudantes.js";

const request = supertest(app);
limparBancoAposCadaTeste();

describe("publicar anúncio", () => {
  it("cria com código curto, cores, fotos e validade de 30 dias", async () => {
    const u = await criarUsuario(request);
    const r = await request.post("/api/anuncios").set(u.auth).send(dadosAnuncio(u));
    expect(r.status).toBe(201);
    expect(r.body.codigo).toMatch(/^[2-9A-Z]{6}$/);
    expect(r.body.cores).toEqual(["marrom", "preto"]);
    expect(r.body.fotos).toEqual([`${u.id}/foto1.jpg`]);
    expect(r.body.uf).toBe("ES");
    const dias = (new Date(r.body.expira_em) - Date.now()) / 86400000;
    expect(dias).toBeGreaterThan(29.9);
  });

  it("pede login", async () => {
    const r = await request.post("/api/anuncios").send({});
    expect(r.status).toBe(401);
  });

  it("valida os campos no servidor", async () => {
    const u = await criarUsuario(request);
    const amanha = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const r = await request
      .post("/api/anuncios")
      .set(u.auth)
      .send(dadosAnuncio(u, { cores: [], latitude: 48.8, data_ocorrencia: amanha, tipo: "sumido" }));
    expect(r.status).toBe(400);
    expect(r.body.detalhes).toMatchObject({
      cores: "Marque pelo menos uma cor.",
      latitude: "O local precisa estar no Brasil.",
      data_ocorrencia: "A data não pode estar no futuro.",
    });
    expect(r.body.detalhes.tipo).toBeDefined();
  });

  it("aceita no máximo 3 fotos e só da pasta do próprio usuário", async () => {
    const u = await criarUsuario(request);
    const quatro = [1, 2, 3, 4].map((i) => `${u.id}/f${i}.jpg`);
    expect((await request.post("/api/anuncios").set(u.auth).send(dadosAnuncio(u, { fotos: quatro }))).status).toBe(400);
    const deOutro = ["00000000-0000-0000-0000-000000000000/f.jpg"];
    expect((await request.post("/api/anuncios").set(u.auth).send(dadosAnuncio(u, { fotos: deOutro }))).status).toBe(400);
  });

  it("completa bairro e cidade pelo ponto no mapa quando faltam", async () => {
    const u = await criarUsuario(request);
    const a = await criarAnuncio(request, u, { bairro: "", cidade: "", uf: "" });
    expect(a).toMatchObject({ bairro: "Praia da Costa", cidade: "Vila Velha", uf: "ES" });
  });

  it("limita a 5 anúncios por usuário a cada 24 horas", async () => {
    const u = await criarUsuario(request);
    for (let i = 0; i < 5; i++) await criarAnuncio(request, u);
    const r = await request.post("/api/anuncios").set(u.auth).send(dadosAnuncio(u));
    expect(r.status).toBe(429);
  });
});

describe("página do anúncio", () => {
  it("é pública, mas sem telefone, detalhe oculto ou ponto exato", async () => {
    const u = await criarUsuario(request);
    const a = await criarAnuncio(request, u);
    const r = await request.get(`/api/anuncios/${a.codigo.toLowerCase()}`);
    expect(r.status).toBe(200);
    expect(r.body.contato).toBeNull();
    expect(r.body.detalhe_oculto).toBeUndefined();
    expect(r.body.lat).toBeUndefined();
    expect(r.body.lat_aprox).toBeCloseTo(-20.334, 3); // arredondado na grade de ~300 m
  });

  it("mostra o telefone para outro usuário logado", async () => {
    const autor = await criarUsuario(request);
    const outro = await criarUsuario(request, { nome: "Beto Vizinho" });
    const a = await criarAnuncio(request, autor);
    const r = await request.get(`/api/anuncios/${a.codigo}`).set(outro.auth);
    expect(r.body.contato).toEqual({ nome: "Ana Tutora", telefone: "5527999991111" });
    expect(r.body.eh_autor).toBe(false);
  });

  it("mostra ao autor o detalhe oculto e o ponto exato", async () => {
    const u = await criarUsuario(request);
    const a = await criarAnuncio(request, u);
    const r = await request.get(`/api/anuncios/${a.codigo}`).set(u.auth);
    expect(r.body).toMatchObject({ eh_autor: true, detalhe_oculto: "Mancha na orelha", contato: null });
    expect(r.body.lat).toBeCloseTo(-20.3328, 4);
    expect(r.body.cor_ids).toEqual([4, 1]);
  });

  it("devolve 404 para código inexistente", async () => {
    expect((await request.get("/api/anuncios/ZZZZZZ")).status).toBe(404);
  });
});

describe("gestão do anúncio", () => {
  it("só o autor edita, renova, marca reencontrado e exclui", async () => {
    const autor = await criarUsuario(request);
    const outro = await criarUsuario(request);
    const a = await criarAnuncio(request, autor);
    for (const [metodo, rota] of [["put", ""], ["post", "/renovar"], ["post", "/reencontrado"], ["delete", ""]]) {
      const r = await request[metodo](`/api/anuncios/${a.codigo}${rota}`).set(outro.auth).send(dadosAnuncio(outro));
      expect(r.status).toBe(403);
    }
  });

  it("edita dados, cores, local e troca as fotos", async () => {
    const u = await criarUsuario(request);
    const a = await criarAnuncio(request, u);
    const r = await request
      .put(`/api/anuncios/${a.codigo}`)
      .set(u.auth)
      .send(dadosAnuncio(u, { nome_pet: "Thor II", cores: [2], latitude: -20.3, fotos: [`${u.id}/nova.jpg`] }));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ nome_pet: "Thor II", cores: ["branco"], fotos: [`${u.id}/nova.jpg`] });
    expect(r.body.lat).toBeCloseTo(-20.3, 4);
    expect(storageFalso.removidos).toEqual([`${u.id}/foto1.jpg`]);
  });

  it("renova um anúncio expirado", async () => {
    const u = await criarUsuario(request);
    const a = await criarAnuncio(request, u);
    await prisma.anuncio.update({ where: { codigo: a.codigo }, data: { expira_em: new Date(Date.now() - 1000) } });
    expect(await app.locals.servicos.anuncios.expirarVencidos()).toBe(1);
    const r = await request.post(`/api/anuncios/${a.codigo}/renovar`).set(u.auth);
    expect(r.body.status).toBe("ativo");
    expect(new Date(r.body.expira_em) > new Date(Date.now() + 29 * 86400000)).toBe(true);
  });

  it("marca como reencontrado", async () => {
    const u = await criarUsuario(request);
    const a = await criarAnuncio(request, u);
    const r = await request.post(`/api/anuncios/${a.codigo}/reencontrado`).set(u.auth);
    expect(r.body.status).toBe("reencontrado");
    expect(r.body.reencontrado_em).toBeTruthy();
    const renovar = await request.post(`/api/anuncios/${a.codigo}/renovar`).set(u.auth);
    expect(renovar.status).toBe(409);
  });

  it("exclui o anúncio e as fotos do storage", async () => {
    const u = await criarUsuario(request);
    const a = await criarAnuncio(request, u);
    expect((await request.delete(`/api/anuncios/${a.codigo}`).set(u.auth)).status).toBe(204);
    expect(await prisma.anuncio.count()).toBe(0);
    expect(storageFalso.removidos).toEqual([`${u.id}/foto1.jpg`]);
  });

  it("lista só os anúncios do próprio usuário", async () => {
    const u = await criarUsuario(request);
    const outro = await criarUsuario(request);
    await criarAnuncio(request, u, { nome_pet: "Meu" });
    await criarAnuncio(request, outro, { nome_pet: "Alheio" });
    const r = await request.get("/api/anuncios/meus").set(u.auth);
    expect(r.body.map((a) => a.nome_pet)).toEqual(["Meu"]);
  });
});

describe("home e correspondências", () => {
  it("lista recentes e conta perdidos, encontrados e reencontrados", async () => {
    const u = await criarUsuario(request);
    await criarAnuncio(request, u, { nome_pet: "A" });
    await criarAnuncio(request, u, { nome_pet: "C", tipo: "encontrado" });
    const b = await criarAnuncio(request, u, { nome_pet: "B" });
    await request.post(`/api/anuncios/${b.codigo}/reencontrado`).set(u.auth);
    expect((await request.get("/api/anuncios/recentes")).body.map((a) => a.nome_pet).sort()).toEqual(["A", "C"]);
    expect((await request.get("/api/anuncios/estatisticas")).body).toEqual({
      perdidos: 1,
      encontrados: 1,
      ativos: 2,
      reencontrados: 1,
      publicados: 3,
      taxa_reencontro: 33.3,
      tempo_medio_dias: 0,
    });
  });

  it("sugere encontrados compatíveis para um perdido", async () => {
    const tutor = await criarUsuario(request);
    const vizinho = await criarUsuario(request);
    const perdido = await criarAnuncio(request, tutor);
    const achado = await criarAnuncio(request, vizinho, {
      tipo: "encontrado", nome_pet: "", sexo: "nao_sei", cores: [4], latitude: -20.3405, longitude: -40.2902,
    });
    await criarAnuncio(request, vizinho, { tipo: "encontrado", porte: "grande", cores: [4] }); // porte diferente
    const r = await request.get(`/api/anuncios/${perdido.codigo}/correspondencias`).set(tutor.auth);
    expect(r.body.map((c) => c.codigo)).toEqual([achado.codigo]);
    expect(r.body[0].cores_em_comum).toBe(1);
    expect(r.body[0].distancia_m).toBeGreaterThan(500);
  });

  it("busca por raio pela função do banco usada no mural", async () => {
    const u = await criarUsuario(request);
    await criarAnuncio(request, u, { nome_pet: "Perto" });
    await criarAnuncio(request, u, { nome_pet: "Longe", latitude: -20.1992, longitude: -40.2531 });
    const perto = await prisma.$queryRaw`SELECT nome_pet FROM buscar_anuncios(-20.333, -40.288, 5000)`;
    expect(perto.map((a) => a.nome_pet)).toEqual(["Perto"]);
    const todos = await prisma.$queryRaw`SELECT nome_pet FROM buscar_anuncios(-20.333, -40.288, 20000)`;
    expect(todos).toHaveLength(2);
  });
});
