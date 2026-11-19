/** Cartaz A4 para imprimir, com QR code para o anúncio. Sem telefone: o contato é pelo link. */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { api } from "../lib/api.js";
import { urlFoto } from "../lib/supabase.js";
import { ESPECIES, PORTES, SEXOS, tituloAnuncio } from "../lib/rotulos.js";
import { localTexto } from "../lib/formatos.js";
import { Carregando } from "../components/Comuns.jsx";

export default function Cartaz() {
  const { codigo } = useParams();
  const [anuncio, setAnuncio] = useState(undefined);
  const [qr, setQr] = useState(null);
  const link = `${window.location.origin}/a/${codigo.toUpperCase()}`;

  useEffect(() => {
    api(`/anuncios/${codigo}`).then(setAnuncio).catch(() => setAnuncio(null));
    QRCode.toDataURL(link, { margin: 1, width: 400, errorCorrectionLevel: "M" }).then(setQr);
  }, [codigo, link]);

  useEffect(() => {
    if (anuncio) document.title = `Cartaz ${anuncio.codigo} | AchaPet`;
  }, [anuncio]);

  if (anuncio === undefined) return <Carregando />;
  if (anuncio === null) return <p className="p-5 text-center">Anúncio não encontrado.</p>;

  return (
    <div className="cartaz-pagina">
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        .folha { width: 186mm; min-height: 270mm; margin: 0 auto 10mm; background: #fff; padding: 10mm; display: flex; flex-direction: column; gap: 6mm; color: #3b2a20; }
        .faixa { font-family: "Fredoka Variable", sans-serif; font-weight: 700; font-size: 26mm; line-height: 1; text-align: center; color: #fff; padding: 3mm 0 4mm; border-radius: 6mm; background: #ff5a5f; }
        .encontrado .faixa { background: #20a99a; }
        .foto { width: 100%; height: 105mm; object-fit: cover; border-radius: 4mm; }
        .sem-foto-cartaz { height: 50mm; display: grid; place-items: center; border: 1mm dashed #ecd3b4; border-radius: 4mm; font-size: 6mm; color: #7a6355; }
        .folha h1 { font-family: "Fredoka Variable", sans-serif; font-size: 14mm; margin: 0; }
        .dados { font-size: 5.5mm; line-height: 1.4; margin: 0; }
        .rodape-cartaz { margin-top: auto; display: flex; align-items: center; gap: 6mm; border-top: .6mm solid #3b2a20; padding-top: 5mm; }
        .rodape-cartaz img { width: 42mm; height: 42mm; }
        .rodape-cartaz p { margin: 0; font-size: 5mm; }
        .rodape-cartaz .link { font-family: "Fredoka Variable", sans-serif; font-weight: 700; font-size: 7mm; word-break: break-all; }
        @media print { .cartaz-pagina { background: #fff; } .folha { margin: 0; width: auto; min-height: auto; padding: 0; } .acoes { display: none !important; } }
      `}</style>
      <div className="acoes text-center py-3">
        <button type="button" className="btn btn-ap btn-lg" onClick={() => window.print()}>
          <i className="bi bi-printer" /> Imprimir cartaz
        </button>
      </div>
      <article className={`folha ${anuncio.tipo}`}>
        <div className="faixa">{anuncio.tipo === "perdido" ? "PROCURA-SE" : "ENCONTRADO"}</div>
        {anuncio.fotos[0] ? (
          <img className="foto" src={urlFoto(anuncio.fotos[0])} alt={`Foto de ${tituloAnuncio(anuncio).toLowerCase()}`} />
        ) : (
          <div className="sem-foto-cartaz">Sem foto</div>
        )}
        <h1>{anuncio.nome_pet || ESPECIES[anuncio.especie]}</h1>
        <p className="dados">
          {ESPECIES[anuncio.especie]}, porte {PORTES[anuncio.porte].toLowerCase()}, {SEXOS[anuncio.sexo].toLowerCase()}
          {anuncio.raca && `, ${anuncio.raca}`}. Cores: {anuncio.cores.join(", ")}.
          <br />
          {anuncio.tipo === "perdido" ? "Visto pela última vez" : "Encontrado"} em{" "}
          <strong>{localTexto(anuncio) || "Grande Vitória"}</strong> no dia{" "}
          {anuncio.data_ocorrencia.split("-").reverse().join("/")}.
        </p>
        <div className="rodape-cartaz">
          {qr && <img src={qr} alt="QR code para o anúncio" />}
          <div>
            <p>Viu este animal? Aponte a câmera para o código ou acesse:</p>
            <p className="link">{link}</p>
            <p>Nunca faça pagamentos para receber um animal de volta.</p>
          </div>
        </div>
      </article>
    </div>
  );
}
