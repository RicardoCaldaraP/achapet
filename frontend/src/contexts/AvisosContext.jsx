/** Mensagens rápidas (sucesso, erro, aviso) mostradas no topo da página. */
import { createContext, useCallback, useContext, useState } from "react";

const AvisosContext = createContext(null);

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const fechar = useCallback((id) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);
  const avisar = useCallback(
    (mensagem, tipo = "success") => {
      const id = crypto.randomUUID();
      setAvisos((lista) => [...lista, { id, mensagem, tipo }]);
      setTimeout(() => fechar(id), 6000);
    },
    [fechar],
  );

  return (
    <AvisosContext.Provider value={avisar}>
      <div className="container mt-3 avisos" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`alert alert-${a.tipo} alert-dismissible`} role="alert">
            {a.mensagem}
            <button type="button" className="btn-close" aria-label="Fechar" onClick={() => fechar(a.id)} />
          </div>
        ))}
      </div>
      {children}
    </AvisosContext.Provider>
  );
}

export function useAvisos() {
  return useContext(AvisosContext);
}
