"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { resetPasswordAction, type ResetState } from "./actions";

export default function ResetPage() {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    {}
  );

  return (
    <div className="login-screen">
      <form className="login-card" action={action}>
        <div className="login-brand">
          <div className="logo">TM</div>
          <div>
            <h2>Resetar senha</h2>
            <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              Tudo Mudou · Conteúdo
            </span>
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 4 }}>
          Use o token de reset configurado no servidor.
        </p>

        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
        />

        <label htmlFor="token">Token de reset</label>
        <input
          id="token"
          name="token"
          type="text"
          autoComplete="off"
          required
        />

        <label htmlFor="newPassword">Nova senha</label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
        />

        {state?.error ? <div className="login-error">{state.error}</div> : null}

        <button type="submit" disabled={pending}>
          {pending ? "Resetando…" : "Resetar senha"}
        </button>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <Link
            href="/login"
            style={{
              fontSize: 12.5,
              color: "var(--brand)",
              fontWeight: 500,
            }}
          >
            ← Voltar para o login
          </Link>
        </div>
      </form>
    </div>
  );
}
