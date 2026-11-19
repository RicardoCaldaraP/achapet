/* Página do anúncio: troca de foto, copiar link e mapa da região aproximada. */
(function () {
  "use strict";

  const principal = document.getElementById("foto-principal");
  document.querySelectorAll("[data-foto]").forEach((botao) => {
    botao.addEventListener("click", () => {
      principal.src = botao.dataset.foto;
      document.querySelectorAll(".miniaturas img").forEach((img) => img.classList.remove("ativa"));
      botao.querySelector("img").classList.add("ativa");
    });
  });

  const copiar = document.getElementById("copiar-link");
  if (copiar) {
    copiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copiar.dataset.link);
        copiar.innerHTML = '<i class="bi bi-check2"></i> Link copiado';
      } catch (e) {
        prompt("Copie o link:", copiar.dataset.link);
      }
    });
  }

  const elMapa = document.getElementById("mapa-detalhe");
  if (elMapa && elMapa.dataset.lat) {
    const centro = [Number(elMapa.dataset.lat), Number(elMapa.dataset.lng)];
    const mapa = L.map(elMapa, { scrollWheelZoom: false }).setView(centro, 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    L.circle(centro, { radius: 300, color: "#14213d", weight: 2, fillColor: "#ffc93c", fillOpacity: 0.35 }).addTo(mapa);
  }
})();
