import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../lib/api.js";
import { PERFIS } from "../lib/rotulos.js";
import { telefoneBR } from "../lib/formatos.js";
import { perfilSchema } from "../lib/validacao.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useAvisos } from "../contexts/AvisosContext.jsx";
import { Carregando, ErroCampo } from "../components/Comuns.jsx";

export default function Conta() {
  const { perfil, recarregarPerfil, sair, entrar } = useAuth();
  const avisar = useAvisos();
  const navegar = useNavigate();
  const [senha, setSenha] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(perfilSchema) });

  useEffect(() => { document.title = "Minha conta | AchaPet"; }, []);
  useEffect(() => {
    if (perfil) reset({ nome: perfil.nome, telefone: telefoneBR(perfil.telefone), perfil: perfil.perfil });
  }, [perfil, reset]);

  if (!perfil) return <Carregando />;

  async function salvar(dados) {
    try {
      await api("/usuarios/eu", { metodo: "PATCH", corpo: dados });
      await recarregarPerfil();
      avisar("Dados atualizados.");
    } catch (erro) {
      Object.entries(erro.detalhes ?? {}).forEach(([c, m]) => setError(c, { message: m }));
    }
  }

  async function excluirConta(e) {
    e.preventDefault();
    if (!window.confirm("Excluir sua conta e todos os anúncios? Essa ação não pode ser desfeita.")) return;
    setExcluindo(true);
    try {
      await entrar(perfil.email, senha); // confirma que é o titular
      await api("/usuarios/eu", { metodo: "DELETE" });
      await sair();
      avisar("Sua conta, seus anúncios e suas fotos foram apagados.", "info");
      navegar("/");
    } catch {
      avisar("Senha incorreta. A conta não foi excluída.", "danger");
      setExcluindo(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="mb-1">Minha conta</h1>
      <p className="texto-suave mb-4">{perfil.email}{perfil.papel === "moderador" && ", moderador(a)"}</p>

      <form className="painel mb-4" onSubmit={handleSubmit(salvar)} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="nome">Nome completo</label>
          <input id="nome" className={`form-control${errors.nome ? " is-invalid" : ""}`} {...register("nome")} />
          <ErroCampo erro={errors.nome} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="telefone">WhatsApp (com DDD)</label>
          <input id="telefone" className={`form-control${errors.telefone ? " is-invalid" : ""}`} {...register("telefone")} />
          <div className="form-text">Só aparece para pessoas logadas, dentro dos seus anúncios.</div>
          <ErroCampo erro={errors.telefone} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="perfil">Você é</label>
          <select id="perfil" className="form-select" {...register("perfil")}>
            {Object.entries(PERFIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </div>
        <button className="btn btn-tinta" type="submit" disabled={isSubmitting}>Salvar alterações</button>
      </form>

      <form className="painel border-danger" onSubmit={excluirConta}>
        <h2 className="h3 text-danger">Excluir conta</h2>
        <p className="texto-suave">Apaga para sempre seus dados, todos os seus anúncios e as fotos (LGPD). Não dá para desfazer.</p>
        <div className="mb-3">
          <label className="form-label" htmlFor="senha-excluir">Digite sua senha para confirmar</label>
          <input id="senha-excluir" type="password" autoComplete="current-password" className="form-control" required
                 value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <button className="btn btn-outline-danger" type="submit" disabled={excluindo || !senha}>Excluir minha conta</button>
      </form>
    </div>
  );
}
