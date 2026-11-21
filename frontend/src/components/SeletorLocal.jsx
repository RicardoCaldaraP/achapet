/**
 * Escolha do local no formulário: tocar no mapa, arrastar o marcador, usar o GPS
 * ou buscar pelo CEP. Quando o ponto muda, pede o bairro à API (Nominatim).
 */
import { useEffect, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { CENTRO_PADRAO } from "../lib/rotulos.js";
import { buscarCep } from "../lib/geo.js";

const iconePino = L.divIcon({
  className: "pino-mapa",
  html: '<div class="pino perdido"></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function Cliques({ aoMarcar }) {
  useMapEvents({ click: (e) => aoMarcar(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Centralizar({ alvo, zoom }) {
  const mapa = useMap();
  useEffect(() => {
    if (alvo) mapa.setView(alvo, zoom);
  }, [alvo, mapa, zoom]);
  return null;
}

export default function SeletorLocal({ latitude, longitude, aoMarcar, aoEncontrarEndereco = () => {}, raioM, zoomPonto = 16 }) {
  const [status, setStatus] = useState("Ou toque no mapa para marcar o ponto. Você pode arrastar o marcador.");
  const [cep, setCep] = useState("");
  const [alvo, setAlvo] = useState(null);
  const temPonto = latitude != null && longitude != null;

  function marcar(lat, lng, centralizar = false) {
    aoMarcar(lat, lng);
    if (centralizar) setAlvo([lat, lng]);
    setStatus("Local marcado. Arraste o marcador se precisar ajustar.");
  }

  function usarGps() {
    if (!navigator.geolocation) {
      setStatus("Seu navegador não permite localização. Use o CEP ou toque no mapa.");
      return;
    }
    setStatus("Buscando sua localização...");
    navigator.geolocation.getCurrentPosition(
      (p) => marcar(p.coords.latitude, p.coords.longitude, true),
      () => setStatus("Não conseguimos sua localização. Use o CEP ou toque no mapa."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function procurarCep() {
    setStatus("Buscando o CEP...");
    try {
      const d = await buscarCep(cep);
      aoEncontrarEndereco(d);
      if (d.lat && d.lng) {
        marcar(d.lat, d.lng, true);
        setStatus("CEP encontrado. Ajuste o marcador no ponto exato, se souber.");
      } else {
        setStatus("CEP encontrado, mas sem coordenadas. Toque no mapa para marcar o ponto.");
      }
    } catch (e) {
      setStatus(e.message || "Não foi possível buscar o CEP agora.");
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 mb-2">
        <button type="button" className="btn btn-contorno btn-sm" onClick={usarGps}>
          <i className="bi bi-crosshair" /> Usar minha localização
        </button>
        <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
          <input className="form-control" placeholder="CEP" inputMode="numeric" aria-label="CEP" value={cep}
                 onChange={(e) => setCep(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), procurarCep())} />
          <button type="button" className="btn btn-tinta" onClick={procurarCep}>Buscar CEP</button>
        </div>
      </div>
      <p className="form-text mt-0" aria-live="polite">{status}</p>
      <MapContainer id="mapa-form" center={temPonto ? [latitude, longitude] : CENTRO_PADRAO} zoom={temPonto ? zoomPonto : 12}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <Cliques aoMarcar={(lat, lng) => marcar(lat, lng)} />
        <Centralizar alvo={alvo} zoom={zoomPonto} />
        {temPonto && raioM && (
          <Circle center={[latitude, longitude]} radius={raioM}
                  pathOptions={{ color: "#d97b26", weight: 2, fillOpacity: 0.08 }} />
        )}
        {temPonto && (
          <Marker position={[latitude, longitude]} icon={iconePino} draggable
                  eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); marcar(p.lat, p.lng); } }} />
        )}
      </MapContainer>
    </div>
  );
}
