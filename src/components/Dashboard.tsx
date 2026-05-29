"use client";

import { useState } from "react";
import type { ItemVM } from "@/lib/viewModel";
import { initials } from "@/lib/format";
import { signOutAction } from "@/app/actions";
import Card from "@/components/Card";

type View = "roteiro" | "video" | "history";

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
  roteiros,
  videos,
  history,
  roteiroCount,
  videoCount,
}: {
  userName: string;
  roteiros: ItemVM[];
  videos: ItemVM[];
  history: ItemVM[];
  roteiroCount: number;
  videoCount: number;
}) {
  const [view, setView] = useState<View>(videoCount > 0 ? "video" : "roteiro");

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
            <h2>Central de aprovação</h2>
            <p>
              Aprove o roteiro, assista ao vídeo final e publique. O Dr. Kleber
              é avisado pelo WhatsApp a cada etapa.
            </p>
          </div>
          <div className="tabs">
            <button
              className={`tab ${view === "roteiro" ? "active" : ""}`}
              onClick={() => setView("roteiro")}
            >
              <span>Roteiros</span>
              {roteiroCount > 0 ? (
                <span className="count">{roteiroCount}</span>
              ) : null}
            </button>
            <button
              className={`tab ${view === "video" ? "active" : ""}`}
              onClick={() => setView("video")}
            >
              <span>Vídeos</span>
              {videoCount > 0 ? (
                <span className="count">{videoCount}</span>
              ) : null}
            </button>
            <button
              className={`tab ${view === "history" ? "active" : ""}`}
              onClick={() => setView("history")}
            >
              <span>Histórico</span>
            </button>
          </div>
        </div>

        {view !== "history" ? (
          <div className="channel-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>
              {view === "video"
                ? "Assista ao vídeo, então aprove, publique na hora ou agende. Tudo aparece no histórico."
                : "Notificações ativas via WhatsApp — o Dr. Kleber acompanha cada etapa pela conversa."}
            </span>
          </div>
        ) : null}

        <div className={`grid ${view !== "roteiro" ? "hide" : ""}`}>
          {roteiros.length === 0 ? (
            <EmptyState text="Nenhum roteiro aguardando aprovação." />
          ) : (
            roteiros.map((item) => <Card key={item.id} item={item} />)
          )}
        </div>

        <div className={`grid ${view !== "video" ? "hide" : ""}`}>
          {videos.length === 0 ? (
            <EmptyState text="Nenhum vídeo em produção ou aguardando aprovação." />
          ) : (
            videos.map((item) => <Card key={item.id} item={item} />)
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
