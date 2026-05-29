"use client";

import { useState } from "react";

export function PasswordInput({
  id,
  name,
  autoComplete = "current-password",
  required = true,
  autoFocus = false,
}: {
  id: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-wrap">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M2 2l20 20" />
            <path d="M6.7 6.7C4.5 8.2 3 10 2 12c2 4 6 7 10 7 2.1 0 4-.7 5.6-1.7" />
            <path d="M9.9 4.2C10.6 4.1 11.3 4 12 4c4 0 8 3 10 7-.6 1.2-1.4 2.3-2.4 3.2" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
