import {
  useEffect,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { message } from "../lib/api";
export function Field({
  label,
  error,
  required,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <small id={`${id}-error`} className="error">
          {error}
        </small>
      )}
    </div>
  );
}
export function PasswordField(
  props: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
  },
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <Field {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${props.label.toLowerCase()}`}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}
export function MobilePageHeader({
  title,
  to = "/",
}: {
  title: string;
  to?: "/" | "/carrinho";
}) {
  return (
    <div className="mobile-page-heading">
      <Link to={to} aria-label="Voltar">
        <ChevronLeft size={22} />
      </Link>
      <h1>{title}</h1>
    </div>
  );
}
export function GoogleMark() {
  const positions = [
    "57.68% 17.83% 0 7.11%",
    "71.33% 17.83% 0 50%",
    "24.69% 75.25% 24.69% 0",
    "38.28% 0 11.97% 47.07%",
    "38.28% 0 11.97% 50%",
    "0 17.01% 57.68% 7.11%",
    "0 17.01% 70.51% 50%",
  ];
  return (
    <span className="google-mark" aria-hidden="true">
      {positions.map((inset, i) => (
        <span key={inset} style={{ inset }}>
          <img src={`/assets/google-${i}.svg`} alt="" />
        </span>
      ))}
    </span>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        {children}
      </select>
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <p>{message(error)}</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function Skeleton({
  kind = "grid",
}: {
  kind?: "grid" | "detail" | "summary";
}) {
  return (
    <div role="status" aria-label="Carregando" className={`skeleton-${kind}`}>
      <span className="sr-only">Carregando conteúdo…</span>
      {Array.from(
        { length: kind === "grid" ? 9 : kind === "detail" ? 2 : 4 },
        (_, i) => (
          <div className="skeleton" key={i} />
        ),
      )}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Quantity({
  value,
  max,
  onChange,
  disabled = false,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
      >
        −
      </button>
      <output aria-label="Quantidade">{value}</output>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
      >
        +
      </button>
    </div>
  );
}
