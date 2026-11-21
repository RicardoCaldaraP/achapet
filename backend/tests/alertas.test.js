import { describe, expect, it } from "vitest";
import supertest from "supertest";
import { app, criarAnuncio, criarUsuario, emailFalso, limparBancoAposCadaTeste } from "./ajudantes.js";
import { criarServicoEmail } from "../src/lib/email.js";

const request = supertest(app);
limparBancoAposCadaTeste();

// Praia da Costa (Vila Velha), o mesmo ponto dos anúncios de teste.
const AREA = { latitude: -20.333, longitude: -40.288, raio_m: 3000 };

async function criarAlerta(usuario, extra = {}) {
  const r = await request.post("/api/alertas").set(usuario.auth).send({ ...AREA, ...extra });
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  return r.body;
}

describe("alertas por região", () => {
  it("pede login", async () => {
    expect((await request.get("/api/alertas")).status).toBe(401);
  });

  it("cria e lista o alerta com o centro da área", async () => {
    const u = await criarUsuario(request);
    const alerta = await criarAlerta(u, { especie: "cachorro", tipo: "" });
    expect(alerta).toMatchObject({ raio_m: 3000, especie: "cachorro", tipo: null, ativo: true });
    expect(alerta.latitude).toBeCloseTo(-20.333, 3);
    const lista = await request.get("/api/alertas").set(u.auth);
    expect(lista.body).toHaveLength(1);
  });

  it("valida raio e local no servidor", async () => {
    const u = await criarUsuario(request);
    const r = await request.post("/api/alertas").set(u.auth).send({ latitude: 40, longitude: -40, raio_m: 50000 });
    expect(r.status).toBe(400);
    expect(r.body.detalhes).toHaveProperty("latitude");
    expect(r.body.detalhes).toHaveProperty("raio_m");
  });

  it("limita a 5 alertas por pessoa", async () => {
    const u = await criarUsuario(request);
    for (let i = 0; i < 5; i += 1) await criarAlerta(u);
    const r = await request.post("/api/alertas").set(u.auth).send(AREA);
    expect(r.status).toBe(422);
  });

  it("só o dono pausa ou exclui o alerta", async () => {
    const dono = await criarUsuario(request);
    const outro = await criarUsuario(request);
    const { id } = await criarAlerta(dono);
    expect((await request.delete(`/api/alertas/${id}`).set(outro.auth)).status).toBe(404);
    const pausado = await request.patch(`/api/alertas/${id}`).set(dono.auth).send({ ativo: false });
    expect(pausado.body.ativo).toBe(false);
    expect((await request.delete(`/api/alertas/${id}`).set(dono.auth)).status).toBe(204);
    expect((await request.get("/api/alertas").set(dono.auth)).body).toHaveLength(0);
  });
});

describe("e-mail quando um anúncio é publicado na área", () => {
  it("avisa quem acompanha a área, com o link do anúncio", async () => {
    const vizinha = await criarUsuario(request, { nome: "Bia Vizinha" });
    await criarAlerta(vizinha);
    const tutor = await criarUsuario(request);
    const anuncio = await criarAnuncio(request, tutor);

    expect(emailFalso.enviados).toHaveLength(1);
    const [mensagem] = emailFalso.enviados;
    expect(mensagem.para).toBe(vizinha.email);
    expect(mensagem.assunto).toContain("Thor perdido");
    expect(mensagem.texto).toContain(`/a/${anuncio.codigo}`);
    expect(mensagem.texto).not.toContain("99999"); // nunca manda o telefone de quem anunciou
  });

  it("respeita espécie, tipo, distância, alerta pausado e não avisa o próprio autor", async () => {
    const tutor = await criarUsuario(request);
    await criarAlerta(tutor); // o próprio autor
    await criarAlerta(await criarUsuario(request), { especie: "gato" });
    await criarAlerta(await criarUsuario(request), { tipo: "encontrado" });
    await criarAlerta(await criarUsuario(request), { latitude: -20.2, longitude: -40.25, raio_m: 1000 }); // Serra
    const pausada = await criarUsuario(request);
    const { id } = await criarAlerta(pausada);
    await request.patch(`/api/alertas/${id}`).set(pausada.auth).send({ ativo: false });

    await criarAnuncio(request, tutor); // cachorro perdido na Praia da Costa
    expect(emailFalso.enviados).toHaveLength(0);
  });
});

describe("serviço de e-mail", () => {
  it("sem SMTP configurado só registra no log e não falha", async () => {
    const registros = [];
    const email = criarServicoEmail({ config: {}, logger: { info: (dados) => registros.push(dados) } });
    expect(email.configurado).toBe(false);
    expect(await email.enviar({ para: "a@b.com", assunto: "Oi", texto: "Oi" })).toBe(false);
    expect(registros).toHaveLength(1);
  });
});
