import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../lib/validacao.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useAvisos } from "../contexts/AvisosContext.jsx";
import { ErroCampo } from "../components/Comuns.jsx";

/** Só aceita caminhos internos em ?voltar= (evita redirecionar para outro site). */
export const destinoSeguro = (v) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/mural");

export default function Entrar() {
  const { entrar } = useAuth();
  const avisar = useAvisos();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const [erro, setErro] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) });

  useEffect(() => { document.title = "Entrar | AchaPet"; }, []);

  async function enviar({ email, senha }) {
    setErro(null);
    try {
      await entrar(email, senha);
      avisar("Que bom te ver de novo!");
      navegar(destinoSeguro(params.get("voltar")));
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 460 }}>
      <h1 className="mb-4">Entrar</h1>
      <form className="painel" onSubmit={handleSubmit(enviar)} noValidate>
        {erro && <div className="alert alert-danger">{erro}</div>}
        <div className="mb-3">
          <label className="form-label" htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" className={`form-control${errors.email ? " is-invalid" : ""}`} {...register("email")} />
          <ErroCampo erro={errors.email} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="senha">Senha</label>
          <input id="senha" type="password" autoComplete="current-password" className={`form-control${errors.senha ? " is-invalid" : ""}`} {...register("senha")} />
          <ErroCampo erro={errors.senha} />
        </div>
        <button className="btn btn-ap w-100" type="submit" disabled={isSubmitting}>{isSubmitting ? "Entrando..." : "Entrar"}</button>
      </form>
      <p className="mt-3 text-center">
        Ainda não tem conta? <Link to={`/cadastro${params.get("voltar") ? `?voltar=${params.get("voltar")}` : ""}`}>Criar conta</Link>
      </p>
    </div>
  );
}
