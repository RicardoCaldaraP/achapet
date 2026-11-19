import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../contexts/AuthContext.jsx", () => ({
  useAuth: () => ({ entrar: vi.fn(async () => { throw new Error("E-mail ou senha incorretos."); }) }),
}));
vi.mock("../contexts/AvisosContext.jsx", () => ({ useAvisos: () => vi.fn() }));

import { CardAnuncio, EtiquetaAnuncio } from "../components/Comuns.jsx";
import Entrar from "../pages/Entrar.jsx";

const anuncio = {
  codigo: "ABC234", tipo: "perdido", status: "ativo", especie: "cachorro", porte: "medio",
  nome_pet: "Thor", bairro: "Praia da Costa", cores: ["caramelo"], data_ocorrencia: "2026-11-18", foto_capa: null,
};

describe("componentes", () => {
  it("o card mostra nome, etiqueta e link curto do anúncio", () => {
    render(<MemoryRouter><CardAnuncio anuncio={anuncio} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Thor" })).toBeInTheDocument();
    expect(screen.getByText("Perdido")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/a/ABC234");
    expect(screen.getByRole("img", { name: "Anúncio sem foto" })).toBeInTheDocument();
  });

  it("a etiqueta troca para o status quando o pet foi reencontrado", () => {
    render(<EtiquetaAnuncio anuncio={{ ...anuncio, status: "reencontrado" }} />);
    expect(screen.getByText("Reencontrado")).toBeInTheDocument();
  });

  it("o login valida os campos antes de enviar e mostra o erro do servidor", async () => {
    const usuario = userEvent.setup();
    render(<MemoryRouter><Entrar /></MemoryRouter>);
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("E-mail inválido.")).toBeInTheDocument();
    await usuario.type(screen.getByLabelText("E-mail"), "ana@teste.com");
    await usuario.type(screen.getByLabelText("Senha"), "errada");
    await usuario.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
  });
});
