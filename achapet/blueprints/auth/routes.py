"""Rotas de autenticação e conta do usuário."""

from urllib.parse import urlparse

from flask import flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user

from achapet.blueprints.auth import bp
from achapet.blueprints.auth.forms import CadastroForm, ContaForm, ExcluirContaForm, LoginForm
from achapet.services import RegraNegocioError, usuarios


def _destino_seguro(padrao: str) -> str:
    """Só redireciona para caminhos internos (evita open redirect via ?next=)."""
    destino = request.args.get("next", "")
    if destino and not urlparse(destino).netloc and destino.startswith("/"):
        return destino
    return padrao


@bp.route("/cadastro", methods=["GET", "POST"])
def cadastro():
    if current_user.is_authenticated:
        return redirect(url_for("mural.index"))
    form = CadastroForm()
    if form.validate_on_submit():
        try:
            usuario = usuarios.cadastrar(
                form.nome.data,
                form.email.data,
                form.telefone.data,
                form.senha.data,
                form.perfil.data,
            )
        except RegraNegocioError as erro:
            form.email.errors.append(str(erro))
        else:
            login_user(usuario)
            flash(f"Bem-vindo(a) ao AchaPet, {usuario.primeiro_nome}!", "success")
            return redirect(_destino_seguro(url_for("mural.index")))
    return render_template("auth/cadastro.html", form=form)


@bp.route("/entrar", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("mural.index"))
    form = LoginForm()
    if form.validate_on_submit():
        usuario = usuarios.autenticar(form.email.data, form.senha.data)
        if usuario:
            login_user(usuario, remember=form.lembrar.data)
            flash(f"Olá, {usuario.primeiro_nome}!", "success")
            return redirect(_destino_seguro(url_for("mural.index")))
        flash("E-mail ou senha incorretos.", "danger")
    return render_template("auth/login.html", form=form)


@bp.route("/sair", methods=["POST"])
@login_required
def logout():
    logout_user()
    flash("Você saiu da sua conta.", "info")
    return redirect(url_for("main.index"))


@bp.route("/conta", methods=["GET", "POST"])
@login_required
def conta():
    form = ContaForm(obj=current_user)
    excluir_form = ExcluirContaForm()
    if form.validate_on_submit():
        usuarios.atualizar_dados(current_user, form.nome.data, form.telefone.data, form.perfil.data)
        flash("Dados atualizados.", "success")
        return redirect(url_for("auth.conta"))
    if request.method == "GET":
        form.telefone.data = current_user.telefone_formatado
    return render_template("auth/conta.html", form=form, excluir_form=excluir_form)


@bp.route("/conta/excluir", methods=["POST"])
@login_required
def excluir_conta():
    form = ExcluirContaForm()
    if form.validate_on_submit() and current_user.verificar_senha(form.senha.data):
        usuarios.excluir_conta(current_user._get_current_object())
        logout_user()
        flash("Sua conta, seus anúncios e suas fotos foram apagados.", "info")
        return redirect(url_for("main.index"))
    flash("Senha incorreta. A conta não foi excluída.", "danger")
    return redirect(url_for("auth.conta"))
