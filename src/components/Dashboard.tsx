"use client";

import { useState } from "react";
import type { ItemVM } from "@/lib/viewModel";
import { initials } from "@/lib/format";
import { signOutAction } from "@/app/actions";
import Card from "@/components/Card";

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
      <p>{text}</p>
    </div>
  );
}

export default function Dashboard({
  userName,
  pending,
  history,
  pendingCount,
}: {
  userName: string;
  pending: ItemVM[];
  history: ItemVM[];
  pendingCount: number;
}) {
  const [view, setView] = useState<"pending" | "history">("pending");

  return (
    <>
      <header>
        <div className="wrap topbar">
          <div className="brand">
            <div className="logo">TM</div>
            <div>
              <h1>
                Central de Aprovação<span>Tudo Mudou · Conteúdo</span>
              </h1>
            </div>
          </div>
          <div className="me">
            <span>{userName}</span>
            <div className="avatar">{initials(userName)}</div>
            <form action={signOutAction}>
              <button type="submit" className="signout">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="pagehead">
          <div>
            <h2>Conteúdo para aprovar</h2>
            <p>
              Revise, aprove ou peça ajuste. O cliente é avisado pelo WhatsApp; o
              que passar aqui vai pro agendamento.
            </p>
          </div>
          <div className="tabs">
            <button
              className={`tab ${view === "pending" ? "active" : ""}`}
              onClick={() => setView("pending")}
            >
              <span>Pendentes</span>
              <span className="count">{pendingCount}</span>
            </button>
            <button
              className={`tab ${view === "history" ? "active" : ""}`}
              onClick={() => setView("history")}
            >
              <span>Histórico</span>
            </button>
          </div>
        </div>

        {view === "pending" ? (
          <div className="channel-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>
              Notificações ativas via WhatsApp — o Dr. Kleber aprova direto na
              conversa, e tudo aparece aqui no histórico.
            </span>
          </div>
        ) : null}

        <div className={`grid ${view !== "pending" ? "hide" : ""}`}>
          {pending.length === 0 ? (
            <EmptyState text="Nada pendente por aqui. Tudo em dia." />
          ) : (
            pending.map((item) => <Card key={item.id} item={item} />)
          )}
        </div>

        <div className={`grid ${view !== "history" ? "hide" : ""}`}>
          {history.length === 0 ? (
            <EmptyState text="Ainda não há histórico de aprovações." />
          ) : (
            history.map((item) => <Card key={item.id} item={item} />)
          )}
        </div>
      </div>
    </>
  );
}
