/* Formulário de anúncio: mapa para marcar o local, GPS, CEP e compressão das fotos. */
(function () {
  "use strict";

  const elMapa = document.getElementById("mapa-form");
  const campoLat = document.getElementById("latitude");
  const campoLng = document.getElementById("longitude");
  const status = document.getElementById("status-local");
  const [latCentro, lngCentro] = elMapa.dataset.centro.split(",").map(Number);

  const mapa = L.map(elMapa).setView([latCentro, lngCentro], 12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);

  let marcador = null;

  function preencherEndereco(dados) {
    if (!dados) return;
    for (const campo of ["bairro", "cidade", "uf"]) {
      const el = document.getElementById(campo);
      if (dados[campo] && !el.dataset.editado) el.value = dados[campo];
    }
  }

  async function buscarEndereco(lat, lng) {
    try {
      const r = await fetch(`/api/endereco?lat=${lat}&lng=${lng}`);
      if (r.ok) preencherEndereco(await r.json());
    } catch (e) { /* sem internet: o usuário preenche à mão */ }
  }

  function marcar(lat, lng, zoom) {
    campoLat.value = lat.toFixed(6);
    campoLng.value = lng.toFixed(6);
    if (marcador) {
      marcador.setLatLng([lat, lng]);
    } else {
      marcador = L.marker([lat, lng], { draggable: true }).addTo(mapa);
      marcador.on("dragend", () => {
        const p = marcador.getLatLng();
        marcar(p.lat, p.lng);
      });
    }
    if (zoom) mapa.setView([lat, lng], zoom);
    status.textContent = "Local marcado. Arraste o marcador se precisar ajustar.";
    buscarEndereco(lat, lng);
  }

  // Ao editar (ou quando o formulário volta com erro), mostra o ponto já escolhido.
  if (elMapa.dataset.lat && elMapa.dataset.lng) {
    marcar(Number(elMapa.dataset.lat), Number(elMapa.dataset.lng), 16);
  }

  mapa.on("click", (e) => marcar(e.latlng.lat, e.latlng.lng));

  // Campos editados à mão não são sobrescritos pela busca automática.
  for (const campo of ["bairro", "cidade", "uf"]) {
    document.getElementById(campo).addEventListener("input", (e) => { e.target.dataset.editado = "1"; });
  }

  document.getElementById("usar-gps").addEventListener("click", () => {
    if (!navigator.geolocation) {
      status.textContent = "Seu navegador não permite localização. Use o CEP ou toque no mapa.";
      return;
    }
    status.textContent = "Buscando sua localização...";
    navigator.geolocation.getCurrentPosition(
      (pos) => marcar(pos.coords.latitude, pos.coords.longitude, 17),
      () => { status.textContent = "Não conseguimos sua localização. Use o CEP ou toque no mapa."; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  document.getElementById("buscar-cep").addEventListener("click", async () => {
    const cep = document.getElementById("cep").value.replace(/\D/g, "");
    if (cep.length !== 8) {
      status.textContent = "Digite um CEP com 8 números.";
      return;
    }
    status.textContent = "Buscando o CEP...";
    try {
      const r = await fetch(`/api/cep/${cep}`);
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro);
      preencherEndereco(dados);
      if (dados.lat && dados.lng) {
        marcar(dados.lat, dados.lng, 16);
        status.textContent = "CEP encontrado. Ajuste o marcador no ponto exato, se souber.";
      } else {
        status.textContent = "CEP encontrado, mas sem coordenadas. Toque no mapa para marcar o ponto.";
      }
    } catch (e) {
      status.textContent = e.message || "Não foi possível buscar o CEP agora.";
    }
  });

  // ---------- Fotos: limite de 3, prévia e compressão para até 1 MB ----------
  const inputFotos = document.getElementById("fotos");
  const previas = document.getElementById("previas");
  const form = document.getElementById("form-anuncio");
  const botao = document.getElementById("enviar");

  inputFotos.addEventListener("change", async () => {
    previas.innerHTML = "";
    let arquivos = Array.from(inputFotos.files).slice(0, 3);
    if (inputFotos.files.length > 3) {
      alert("Escolha no máximo 3 fotos. Vamos usar as 3 primeiras.");
    }
    if (window.imageCompression) {
      botao.disabled = true;
      botao.textContent = "Preparando fotos...";
      try {
        arquivos = await Promise.all(arquivos.map(async (arquivo) => {
          const reduzida = await imageCompression(arquivo, {
            maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true, fileType: "image/jpeg",
          });
          return new File([reduzida], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
        }));
      } catch (e) { /* se falhar, envia o original; o servidor também reduz */ }
      botao.disabled = false;
      botao.textContent = form.dataset.textoBotao;
    }
    const lista = new DataTransfer();
    arquivos.forEach((a) => lista.items.add(a));
    inputFotos.files = lista.files;

    arquivos.forEach((arquivo, i) => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(arquivo);
      img.alt = `Prévia da foto ${i + 1}`;
      previas.appendChild(img);
    });
  });

  form.dataset.textoBotao = botao.textContent;
  form.addEventListener("submit", () => {
    botao.disabled = true;
    botao.textContent = "Enviando...";
  });
})();
