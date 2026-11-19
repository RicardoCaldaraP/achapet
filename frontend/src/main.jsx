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

import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { AvisosProvider } from "./contexts/AvisosContext.jsx";

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
