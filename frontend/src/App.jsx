/** Rotas do site (React Router). */
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { Carregando, RotaProtegida } from "./components/Comuns.jsx";
import Inicio from "./pages/Inicio.jsx";

// Páginas carregadas sob demanda (deixa a primeira visita mais leve no 4G).
const Mural = lazy(() => import("./pages/Mural.jsx"));
const Anuncio = lazy(() => import("./pages/Anuncio.jsx"));
const Cartaz = lazy(() => import("./pages/Cartaz.jsx"));
const FormAnuncio = lazy(() => import("./pages/FormAnuncio.jsx"));
const MeusAnuncios = lazy(() => import("./pages/MeusAnuncios.jsx"));
const Entrar = lazy(() => import("./pages/Entrar.jsx"));
const Cadastro = lazy(() => import("./pages/Cadastro.jsx"));
const Conta = lazy(() => import("./pages/Conta.jsx"));
const Moderacao = lazy(() => import("./pages/Moderacao.jsx"));
const Alertas = lazy(() => import("./pages/Alertas.jsx"));
const Termos = lazy(() => import("./pages/Termos.jsx"));
const NaoEncontrado = lazy(() => import("./pages/NaoEncontrado.jsx"));

export default function App() {
  return (
    <Suspense fallback={<Carregando />}>
      <Routes>
        <Route path="/a/:codigo/cartaz" element={<Cartaz />} />
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="mural" element={<Mural />} />
          <Route path="a/:codigo" element={<Anuncio />} />
          <Route path="entrar" element={<Entrar />} />
          <Route path="cadastro" element={<Cadastro />} />
          <Route path="termos" element={<Termos />} />
          <Route path="anuncios/novo" element={<RotaProtegida><FormAnuncio /></RotaProtegida>} />
          <Route path="a/:codigo/editar" element={<RotaProtegida><FormAnuncio /></RotaProtegida>} />
          <Route path="meus-anuncios" element={<RotaProtegida><MeusAnuncios /></RotaProtegida>} />
          <Route path="conta" element={<RotaProtegida><Conta /></RotaProtegida>} />
          <Route path="alertas" element={<RotaProtegida><Alertas /></RotaProtegida>} />
          <Route path="moderacao" element={<RotaProtegida moderador><Moderacao /></RotaProtegida>} />
          <Route path="*" element={<NaoEncontrado />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
