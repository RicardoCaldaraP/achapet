import { describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { app } from "./ajudantes.js";
import { carregarConfig } from "../src/config.js";
import { normalizarTelefone } from "../src/schemas.js";
import { criarServicoGeo } from "../src/services/geo.js";

const request = supertest(app);

describe("API em geral", () => {
  it("responde o health check", async () => {
    const r = await request.get("/api/health");
    expect(r.body).toEqual({ status: "ok" });
  });

  it("devolve 404 em JSON para rotas inexistentes", async () => {
    const r = await request.get("/api/nao-existe");
    expect(r.status).toBe(404);
    expect(r.body.erro).toBe("Rota não encontrada.");
  });

  it("recusa JSON malformado", async () => {
    const r = await request.post("/api/usuarios").set("Content-Type", "application/json").send("{oops");
    expect(r.status).toBe(400);
  });

  it("valida as coordenadas do endereço", async () => {
    expect((await request.get("/api/geo/endereco?lat=abc&lng=1")).status).toBe(400);
    const r = await request.get("/api/geo/endereco?lat=-20.33&lng=-40.28");
    expect(r.body.cidade).toBe("Vila Velha");
  });

  it("envia cabeçalhos de segurança (helmet)", async () => {
    const r = await request.get("/api/health");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("configuração", () => {
  it("explica o que falta no .env", () => {
    expect(() => carregarConfig({})).toThrow(/DATABASE_URL/);
  });
});

describe("telefone", () => {
  it.each([
    ["(27) 99876-5432", "5527998765432"],
    ["27 3333-4444", "552733334444"],
    ["+55 27 99876-5432", "5527998765432"],
    ["27 89876-5432", null],
    ["(20) 99876-5432", null],
    ["123", null],
  ])("normaliza %s", (entrada, esperado) => {
    expect(normalizarTelefone(entrada)).toBe(esperado);
  });
});

describe("Nominatim", () => {
  it("converte a resposta, usa cache e respeita o intervalo", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({ address: { suburb: "Itapuã", city: "Vila Velha", state: "Espírito Santo" } }),
    }));
    const geo = criarServicoGeo({ userAgent: "teste", fetchFn, intervaloMs: 0 });
    const esperado = { bairro: "Itapuã", cidade: "Vila Velha", uf: "ES" };
    expect(await geo.enderecoPorPonto(-20.3401, -40.2902)).toEqual(esperado);
    expect(await geo.enderecoPorPonto(-20.3404, -40.2899)).toEqual(esperado); // mesmo ponto arredondado
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("devolve null se o serviço estiver fora do ar", async () => {
    const geo = criarServicoGeo({ userAgent: "t", intervaloMs: 0, fetchFn: async () => { throw new Error("off"); } });
    expect(await geo.enderecoPorPonto(1, 1)).toBeNull();
  });
});
