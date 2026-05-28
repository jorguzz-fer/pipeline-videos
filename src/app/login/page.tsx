"use client";

import { useActionState } from "react";
import { authenticate, type LoginState } from "./actions";

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
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />

        {state?.error ? <div className="login-error">{state.error}</div> : null}

        <button type="submit" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
