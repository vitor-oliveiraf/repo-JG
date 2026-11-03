import { useId, type InputHTMLAttributes, type ReactNode } from "react";
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
