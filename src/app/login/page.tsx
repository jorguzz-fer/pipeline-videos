"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import { authenticate, type LoginState } from "./actions";

function ResetBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("reset") !== "ok") return null;
  return (
    <div
      style={{
        background: "var(--ok-soft)",
        color: "var(--ok)",
        fontSize: 12.5,
        padding: "9px 12px",
        borderRadius: "var(--radius-sm)",
        marginBottom: 4,
      }}
    >
      Senha redefinida. Faça login com a nova senha.
    </div>
  );
}

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    authenticate,
    {}
  );

  return (
    <div className="login-screen">
      <form className="login-card" action={action}>
        <div className="login-brand">
          <div className="logo">TM</div>
          <div>
            <h2>Central de Aprovação</h2>
            <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              Tudo Mudou · Conteúdo
            </span>
          </div>
        </div>

        <Suspense fallback={null}>
          <ResetBanner />
        </Suspense>

        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
        />

        <label htmlFor="password">Senha</label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
        />

        {state?.error ? <div className="login-error">{state.error}</div> : null}

        <button type="submit" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <Link
            href="/login/reset"
            style={{
              fontSize: 12.5,
              color: "var(--brand)",
              fontWeight: 500,
            }}
          >
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </div>
  );
}
