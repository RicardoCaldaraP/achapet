import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "leaflet/dist/leaflet.css";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "./styles/app.css";

import { registerSW } from "virtual:pwa-register";

import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { AvisosProvider } from "./contexts/AvisosContext.jsx";

// PWA: registra o service worker e recarrega a página quando sai uma versão nova,
// para ninguém ficar preso na versão guardada em cache depois de um deploy.
registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AvisosProvider>
          <App />
        </AvisosProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
