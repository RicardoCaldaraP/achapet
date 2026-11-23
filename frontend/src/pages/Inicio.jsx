import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { CardAnuncio, Vazio } from "../components/Comuns.jsx";
import { Cachorro, Gato, TrilhaPatas } from "../components/Pets.jsx";

export default function Inicio() {
  const [recentes, setRecentes] = useState([]);
  const [numeros, setNumeros] = useState({ perdidos: 0, encontrados: 0, reencontrados: 0 });

  useEffect(() => {
    document.title = "AchaPet | Animais perdidos e encontrados na Grande Vitória";
    api("/anuncios/recentes?limite=6").then(setRecentes).catch(() => {});
    api("/anuncios/estatisticas").then(setNumeros).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <TrilhaPatas />
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <h1>Bicho perdido? Bora trazer ele de volta pra casa.</h1>
              <p className="lead mt-3">
                Perdeu seu pet ou achou um na rua? Coloque no mapa da Grande Vitória em 3 minutos, mande
                o link no WhatsApp e imprima um cartaz com QR code.
              </p>
              <div className="d-flex flex-wrap gap-3 mt-4">
                <Link className="btn btn-ap btn-lg" to="/anuncios/novo">Publicar anúncio</Link>
                <Link className="btn btn-contorno btn-lg" to="/mural">Ver o mapa</Link>
              </div>
              <div className="contadores" aria-label="Números do AchaPet">
                <div className="perdidos">
                  <strong>{numeros.perdidos}</strong>{numeros.perdidos === 1 ? "perdido" : "perdidos"}
                </div>
                <div className="encontrados">
                  <strong>{numeros.encontrados}</strong>{numeros.encontrados === 1 ? "encontrado" : "encontrados"}
                </div>
                <div className="reencontrados">
                  <i className="bi bi-house-heart-fill" aria-hidden="true" />
                  <strong>{numeros.reencontrados}</strong>
                  {numeros.reencontrados === 1 ? "já voltou pra casa" : "já voltaram pra casa"}
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="cena" aria-hidden="true">
                <div className="sol" />
                <div className="grama" />
                <svg className="pino-cena" viewBox="0 0 80 100">
                  <path d="M40 98 C 40 98, 8 60, 8 38 A 32 32 0 1 1 72 38 C 72 60, 40 98, 40 98 Z" fill="#FF5A5F" stroke="#fff" strokeWidth="5" />
                  <g fill="#fff" transform="translate(22 18) scale(.56)">
                    <ellipse cx="32" cy="42" rx="15" ry="13" /><ellipse cx="14" cy="27" rx="6.5" ry="8.5" />
                    <ellipse cx="25" cy="16" rx="6.5" ry="8.5" /><ellipse cx="39" cy="16" rx="6.5" ry="8.5" />
                    <ellipse cx="50" cy="27" rx="6.5" ry="8.5" />
                  </g>
                </svg>
                <div className="balao">Au! Alguém viu o Thor?</div>
                <Cachorro />
                <Gato />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-3">
        <h2 className="mb-3">Como funciona</h2>
        <div className="row g-3 passos">
          <div className="col-md-4">
            <div className="passo">
              <h3>Marque no mapa</h3>
              <p className="texto-suave mb-0">Foto, cores e onde o bichinho foi visto pela última vez. Pelo GPS, pelo CEP ou tocando no mapa.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="passo">
              <h3>Espalhe um link só</h3>
              <p className="texto-suave mb-0">Todo grupo de WhatsApp aponta para o mesmo anúncio. Quando ele voltar pra casa, todo mundo fica sabendo.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="passo">
              <h3>A gente cruza os anúncios</h3>
              <p className="texto-suave mb-0">O AchaPet compara perdidos com encontrados da mesma espécie, porte e cor num raio de 5 km.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-4">
        <div className="d-flex justify-content-between align-items-end mb-3">
          <h2 className="mb-0">Quem está procurando casa</h2>
          <Link to="/mural">Ver todos no mapa</Link>
        </div>
        {recentes.length ? (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
            {recentes.map((a) => (
              <div className="col" key={a.codigo}><CardAnuncio anuncio={a} /></div>
            ))}
          </div>
        ) : (
          <Vazio>
            <p className="fs-5 mb-2">Nenhum anúncio ativo por enquanto.</p>
            <Link className="btn btn-ap" to="/anuncios/novo">Publicar o primeiro</Link>
          </Vazio>
        )}
      </section>
    </>
  );
}
