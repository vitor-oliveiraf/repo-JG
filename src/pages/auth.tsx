import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { api, fields, queryClient } from "../lib/api";
import type { User } from "../domain";
import { Button } from "../components/ui/button";
import {
  ErrorBox,
  Field,
  PasswordField,
  GoogleMark,
} from "../components/common";
import { Catalog } from "./catalog";
import { Dialog } from "../components/dialog";
export function AuthPage({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [validation, setValidation] = useState("");
  const [info, setInfo] = useState("");
  const [desktop, setDesktop] = useState(
    () => matchMedia("(min-width:601px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(min-width:601px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const email = String(form.get("email"));
      const password = String(form.get("password"));
      if (register) {
        if (password !== form.get("confirm"))
          throw new Error("As senhas não coincidem.");
        await api.post("/auth/register", {
          name: form.get("name"),
          email,
          password,
        });
      }
      return (
        await api.post<{ token: string; user: User }>("/auth/login", {
          email,
          password,
        })
      ).data;
    },
    onSuccess: async (data) => {
      await queryClient.cancelQueries();
      queryClient.clear();
      localStorage.setItem("kurio.token", data.token);
      queryClient.setQueryData(["session"], data.user);
      void navigate({
        to:
          search.redirect?.startsWith("/") && !search.redirect.startsWith("//")
            ? search.redirect
            : "/perfil",
      });
    },
  });
  const errs = fields(mutation.error);
  const content = (
    <section className={`auth-page ${register ? "is-register" : ""}`}>
      <Link to="/" className="auth-logo">
        KURIO
      </Link>
      <div className="auth-tabs">
        <Link to="/login" search={{ redirect: search.redirect }}>
          Entrar
        </Link>
        <span>|</span>
        <Link to="/cadastro" search={{ redirect: search.redirect }}>
          Criar conta
        </Link>
      </div>
      <p className="auth-intro">
        {register
          ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
          : "Entre para gerenciar sua carteira, coleção e perfil de criador."}
      </p>
      <h1>{register ? "Criar perfil de colecionador" : "Entrar"}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setValidation("");
          const form = new FormData(e.currentTarget);
          if (register && form.get("password") !== form.get("confirm")) {
            setValidation("As senhas não coincidem.");
            return;
          }
          mutation.mutate(form);
        }}
      >
        {register && (
          <Field
            label="Nome de exibição"
            name="name"
            placeholder="Nome de exibição"
            autoComplete="name"
            required
            error={errs?.name}
          />
        )}
        <Field
          label="E-mail"
          name="email"
          type="email"
          placeholder="contato@email.com"
          autoComplete="email"
          required
          error={errs?.email}
        />
        <PasswordField
          label="Senha"
          name="password"
          placeholder="Senha"
          minLength={8}
          autoComplete={register ? "new-password" : "current-password"}
          required
          error={errs?.password}
        />
        {register && (
          <PasswordField
            label="Confirmar senha"
            name="confirm"
            placeholder="Confirmar senha"
            minLength={8}
            autoComplete="new-password"
            required
            error={validation}
          />
        )}
        {!register && (
          <button
            type="button"
            className="forgot"
            onClick={() =>
              setInfo(
                "Recuperação de senha não faz parte desta simulação. Use as credenciais de demonstração ou crie uma conta.",
              )
            }
          >
            Esqueceu a senha?
          </button>
        )}
        {mutation.isError && <ErrorBox error={mutation.error} />}
        <Button className="w-full" type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Aguarde…"
            : register
              ? "Criar perfil"
              : "Entrar"}
        </Button>
      </form>
      <div className="auth-social">
        <div className="social-divider">Ou continue com</div>
        <Button
          variant="outline"
          onClick={() =>
            setInfo(
              "Login com Google indisponível nesta demonstração. Use e-mail e senha.",
            )
          }
        >
          <GoogleMark />
          Continuar com Google
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setInfo(
              "Login com Facebook indisponível nesta demonstração. Use e-mail e senha.",
            )
          }
        >
          <img src="/assets/auth-facebook.svg" alt="" />
          Continuar com Facebook
        </Button>
      </div>
      {info && <p role="status">{info}</p>}
      <p>
        {register ? "Já tem uma conta? " : "Novo na Kurio? "}
        <Link
          to={register ? "/login" : "/cadastro"}
          search={{ redirect: search.redirect }}
        >
          {register ? "Entre" : "Crie uma conta"}
        </Link>
      </p>
    </section>
  );
  return desktop ? (
    <>
      <div className="auth-backdrop" inert aria-hidden="true">
        <Catalog />
      </div>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) void navigate({ to: "/" });
        }}
        title={register ? "Criar conta" : "Entrar"}
        description={
          register
            ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
            : "Entre para gerenciar sua carteira, coleção e perfil de criador."
        }
        className="auth-dialog"
        overlayClassName="fixed inset-0 z-50 bg-black/20"
      >
        {content}
      </Dialog>
    </>
  ) : (
    content
  );
}
