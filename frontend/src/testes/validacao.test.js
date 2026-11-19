import { describe, expect, it } from "vitest";
import { anuncioSchema, cadastroSchema, telefoneValido } from "../lib/validacao.js";
import { dataBR, distancia, linkWhatsApp, telefoneBR } from "../lib/formatos.js";

describe("validação dos formulários", () => {
  it("aceita telefones brasileiros com DDD", () => {
    expect(telefoneValido("(27) 99876-5432")).toBe(true);
    expect(telefoneValido("27 3333-4444")).toBe(true);
    expect(telefoneValido("(20) 99876-5432")).toBe(false);
    expect(telefoneValido("123")).toBe(false);
  });

  it("confere senha, confirmação e aceite no cadastro", () => {
    const base = {
      nome: "Ana", email: "ana@x.com", telefone: "27999991111", perfil: "pessoa",
      senha: "abc12345", confirmar_senha: "abc12345", aceite_termos: true,
    };
    expect(cadastroSchema.safeParse(base).success).toBe(true);
    const semAceite = cadastroSchema.safeParse({ ...base, aceite_termos: false });
    expect(semAceite.error.issues[0].path).toEqual(["aceite_termos"]);
    const diferente = cadastroSchema.safeParse({ ...base, confirmar_senha: "outra123" });
    expect(diferente.error.issues[0].message).toBe("As senhas não conferem.");
  });

  it("exige tipo, cor e local no anúncio", () => {
    const r = anuncioSchema.safeParse({ especie: "gato", porte: "medio", sexo: "nao_sei", cores: [], data_ocorrencia: "2026-01-01" });
    const campos = r.error.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["tipo", "cores", "latitude", "longitude"]));
  });
});

describe("formatos", () => {
  it("formata datas, distâncias, telefone e links", () => {
    expect(dataBR("2026-11-19")).toBe("19 nov 2026");
    expect(distancia(750)).toBe("750 m");
    expect(distancia(2500)).toBe("2,5 km");
    expect(telefoneBR("5527999991234")).toBe("(27) 99999-1234");
    expect(linkWhatsApp("Oi tudo", "5527999990000")).toBe("https://wa.me/5527999990000?text=Oi%20tudo");
  });
});
