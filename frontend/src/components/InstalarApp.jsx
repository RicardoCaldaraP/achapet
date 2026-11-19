/** Botão "Instalar o app" (PWA): aparece quando o navegador permite instalar. */
import { useEffect, useState } from "react";

export default function InstalarApp() {
  const [evento, setEvento] = useState(null);

  useEffect(() => {
    const guardar = (e) => {
      e.preventDefault();
      setEvento(e);
    };
    window.addEventListener("beforeinstallprompt", guardar);
    return () => window.removeEventListener("beforeinstallprompt", guardar);
  }, []);

  if (!evento) return null;
  return (
    <button
      type="button"
      className="btn btn-tinta instalar-app"
      onClick={async () => {
        await evento.prompt();
        setEvento(null);
      }}
    >
      <i className="bi bi-phone" /> Instalar o app
    </button>
  );
}
