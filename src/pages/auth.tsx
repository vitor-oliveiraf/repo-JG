import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { api, fields, queryClient } from "../lib/api";
import type { User } from "../domain";
import { Button } from "../components/ui/button";
import { ErrorBox, Field } from "../components/common";
import { Catalog } from "./catalog";
import { Dialog } from "../components/ui/dialog";
export function AuthPage({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [show, setShow] = useState(false);
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
    <section className="auth-page">
      <Link to="/" className="auth-logo">
        KURIO
      </Link>
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
        <Field
          label="Senha"
          name="password"
          type={show ? "text" : "password"}
          minLength={8}
          autoComplete={register ? "new-password" : "current-password"}
          required
          error={errs?.password}
        />
        {register && (
          <Field
            label="Confirmar senha"
            name="confirm"
            type={show ? "text" : "password"}
            minLength={8}
            autoComplete="new-password"
            required
            error={validation}
          />
        )}
        <label className="show-password">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />
          Mostrar senha
        </label>
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
      <p className="auth-demo muted">
        Demonstração: nova@kurio.test
        <br />
        Senha: Kurio123!
      </p>
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
