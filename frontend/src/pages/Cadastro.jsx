import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../lib/api.js";
import { PERFIS } from "../lib/rotulos.js";
import { cadastroSchema } from "../lib/validacao.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useAvisos } from "../contexts/AvisosContext.jsx";
import { ErroCampo } from "../components/Comuns.jsx";
import { destinoSeguro } from "./Entrar.jsx";

export default function Cadastro() {
  const { entrar } = useAuth();
  const avisar = useAvisos();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { perfil: "pessoa", aceite_termos: false },
  });

  useEffect(() => { document.title = "Criar conta | AchaPet"; }, []);

  async function enviar(dados) {
    try {
      // eslint-disable-next-line no-unused-vars
      const { confirmar_senha, ...corpo } = dados;
      await api("/usuarios", { metodo: "POST", corpo });
      await entrar(dados.email, dados.senha);
      avisar(`Bem-vindo(a) ao AchaPet, ${dados.nome.split(" ")[0]}!`);
      navegar(destinoSeguro(params.get("voltar")));
    } catch (erro) {
      const campos = Object.entries(erro.detalhes ?? {});
      campos.forEach(([campo, mensagem]) => setError(campo, { message: mensagem }));
      if (!campos.length) setError("root", { message: erro.message });
    }
  }

  const campo = (nome) => `form-control${errors[nome] ? " is-invalid" : ""}`;

  return (
    <div className="container py-5" style={{ maxWidth: 560 }}>
      <h1 className="mb-2">Criar conta</h1>
      <p className="texto-suave mb-4">Você precisa de uma conta para publicar anúncios e ver o contato de quem anunciou.</p>
      <form className="painel" onSubmit={handleSubmit(enviar)} noValidate>
        {errors.root && <div className="alert alert-danger">{errors.root.message}</div>}
        <div className="mb-3">
          <label className="form-label" htmlFor="nome">Nome completo</label>
          <input id="nome" autoComplete="name" className={campo("nome")} {...register("nome")} />
          <ErroCampo erro={errors.nome} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" className={campo("email")} {...register("email")} />
          <ErroCampo erro={errors.email} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="telefone">WhatsApp (com DDD)</label>
          <input id="telefone" type="tel" autoComplete="tel" placeholder="(27) 99999-1234" className={campo("telefone")} {...register("telefone")} />
          <div className="form-text">Só aparece para pessoas logadas, dentro do seu anúncio. Nunca no mural nem no cartaz.</div>
          <ErroCampo erro={errors.telefone} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="perfil">Você é</label>
          <select id="perfil" className="form-select" {...register("perfil")}>
            {Object.entries(PERFIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </div>
        <div className="row">
          <div className="col-sm-6 mb-3">
            <label className="form-label" htmlFor="senha">Senha</label>
            <input id="senha" type="password" autoComplete="new-password" className={campo("senha")} {...register("senha")} />
            <ErroCampo erro={errors.senha} />
          </div>
          <div className="col-sm-6 mb-3">
            <label className="form-label" htmlFor="confirmar_senha">Confirme a senha</label>
            <input id="confirmar_senha" type="password" autoComplete="new-password" className={campo("confirmar_senha")} {...register("confirmar_senha")} />
            <ErroCampo erro={errors.confirmar_senha} />
          </div>
        </div>
        <div className="form-check mb-3">
          <input id="aceite_termos" type="checkbox" className={`form-check-input${errors.aceite_termos ? " is-invalid" : ""}`} {...register("aceite_termos")} />
          <label className="form-check-label" htmlFor="aceite_termos">
            Li e aceito os <Link to="/termos" target="_blank">termos de uso e a política de privacidade</Link>
          </label>
          <ErroCampo erro={errors.aceite_termos} />
        </div>
        <button className="btn btn-ap w-100" type="submit" disabled={isSubmitting}>{isSubmitting ? "Criando conta..." : "Criar conta"}</button>
      </form>
      <p className="mt-3 text-center">Já tem conta? <Link to="/entrar">Entrar</Link></p>
    </div>
  );
}
