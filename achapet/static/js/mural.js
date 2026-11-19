/* Mural: busca os anúncios na API conforme os filtros e desenha mapa + lista. */
(function () {
  "use strict";

  const form = document.getElementById("filtros");
  const lista = document.getElementById("lista");
  const resumo = document.getElementById("resumo");
  const modelo = document.getElementById("modelo-item");
  const elMapa = document.getElementById("mapa");
  const campoLat = document.getElementById("lat");
  const campoLng = document.getElementById("lng");
  const campoRaio = document.getElementById("raio");

  const [latPadrao, lngPadrao] = elMapa.dataset.centro.split(",").map(Number);
  const centroInicial = [Number(campoLat.value) || latPadrao, Number(campoLng.value) || lngPadrao];

  const mapa = L.map(elMapa).setView(centroInicial, 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);

  const camadaPinos = L.layerGroup().addTo(mapa);
  let circulo = null;
  let centro = centroInicial;

  const icone = (tipo) => L.divIcon({ className: "", html: `<div class="pino ${tipo}"></div>`,
                                      iconSize: [26, 26], iconAnchor: [13, 26] });

  const formatarDistancia = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
  const formatarData = (iso) => iso.split("-").reverse().join("/");
  // Escapa texto digitado por usuários antes de usar em HTML (evita XSS no popup).
  const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function montarItem(a) {
    const item = modelo.content.firstElementChild.cloneNode(true);
    item.href = `/a/${a.codigo}`;
    item.classList.add(a.tipo);
    const img = item.querySelector("img");
    if (a.foto_url) {
      img.src = a.foto_url;
    } else {
      const vazio = document.createElement("div");
      vazio.className = "sem-foto";
      img.replaceWith(vazio);
    }
    item.querySelector("strong").textContent = a.nome_pet || a.especie_rotulo;
    const etiqueta = item.querySelector(".etiqueta");
    etiqueta.textContent = a.tipo_rotulo;
    etiqueta.classList.add(`etiqueta-${a.tipo}`);
    item.querySelector(".cores").textContent = a.nome_pet
      ? `${a.especie_rotulo}, ${a.cores || "cor não informada"}`
      : `Porte ${a.porte === "medio" ? "médio" : a.porte}, ${a.cores || "cor não informada"}`;
    item.querySelector(".local").textContent =
      `${formatarDistancia(a.distancia_m)} daqui${a.bairro ? ", " + a.bairro : ""}, ${formatarData(a.data_ocorrencia)}`;
    return item;
  }

  function atualizarUrl() {
    const params = new URLSearchParams(new FormData(form));
    history.replaceState(null, "", `${location.pathname}?${params}`);
  }

  async function carregar() {
    campoLat.value = centro[0].toFixed(5);
    campoLng.value = centro[1].toFixed(5);
    const params = new URLSearchParams(new FormData(form));
    resumo.textContent = "Carregando anúncios...";
    try {
      const r = await fetch(`/api/anuncios?${params}`);
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro || "Erro ao buscar anúncios.");
      desenhar(dados);
      atualizarUrl();
    } catch (e) {
      resumo.textContent = "Não foi possível carregar os anúncios. Verifique sua conexão.";
    }
  }

  function desenhar(dados) {
    camadaPinos.clearLayers();
    lista.innerHTML = "";
    if (circulo) circulo.remove();
    circulo = L.circle(dados.centro, { radius: dados.raio_m, color: "#14213d", weight: 1, fillOpacity: 0.04 }).addTo(mapa);

    const raioKm = dados.raio_m / 1000;
    resumo.textContent = dados.total === 0
      ? `Nenhum anúncio ativo em ${raioKm} km. Aumente o raio ou mude os filtros.`
      : `${dados.total} anúncio(s) em ${raioKm} km. A posição no mapa é aproximada (cerca de 300 m).`;

    if (dados.total === 0) {
      const vazio = document.createElement("div");
      vazio.className = "vazio";
      vazio.innerHTML = document.getElementById("modelo-vazio").innerHTML;
      lista.appendChild(vazio);
    }

    dados.anuncios.forEach((a) => {
      const item = montarItem(a);
      lista.appendChild(item);
      const pino = L.marker([a.lat_aprox, a.lng_aprox], { icon: icone(a.tipo), title: a.nome_pet || a.especie_rotulo })
        .bindPopup(`<strong>${escapar(a.nome_pet || a.especie_rotulo)}</strong><br>` +
                   `${escapar(a.tipo_rotulo)}, ${escapar(a.bairro)}<br>` +
                   `<a href="/a/${escapar(a.codigo)}">Ver anúncio</a>`)
        .addTo(camadaPinos);
      item.addEventListener("mouseenter", () => pino.openPopup());
      pino.on("click", () => {
        document.querySelectorAll(".item-lista.destaque").forEach((el) => el.classList.remove("destaque"));
        item.classList.add("destaque");
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  form.addEventListener("change", carregar);
  campoRaio.addEventListener("input", () => {
    document.getElementById("raio-valor").textContent = campoRaio.value;
  });

  // Buscar de novo quando o usuário arrasta o mapa para outra região.
  mapa.on("moveend", () => {
    const c = mapa.getCenter();
    if (mapa.distance(c, centro) > 300) {
      centro = [c.lat, c.lng];
      carregar();
    }
  });

  document.getElementById("perto-de-mim").addEventListener("click", () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      centro = [pos.coords.latitude, pos.coords.longitude];
      mapa.setView(centro, 14);
      carregar();
    });
  });

  carregar();
})();
