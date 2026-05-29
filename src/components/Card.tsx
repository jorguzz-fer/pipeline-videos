"use client";

import { useState } from "react";
import type { ItemVM } from "@/lib/viewModel";
import { PLATFORM_LABEL } from "@/lib/format";
import {
  approveAction,
  rejectAction,
  publishNowAction,
  scheduleAction,
  archiveAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

const GRADIENTS = [
  "linear-gradient(135deg,#2a1740,#5b2c83)",
  "linear-gradient(135deg,#1f3a2e,#0e201a)",
  "linear-gradient(135deg,#3a2a14,#1c1408)",
  "linear-gradient(135deg,#16304a,#0c1b2b)",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function previewBackground(item: ItemVM): React.CSSProperties {
  if (item.thumbnailUrl) {
    return { backgroundImage: `url(${item.thumbnailUrl})` };
  }
  if (item.stage === "AGUARDANDO_ROTEIRO") {
    return { background: "linear-gradient(135deg,#3a3a3a,#1c1c1c)" };
  }
  if (item.stage === "EM_PRODUCAO") {
    return { background: GRADIENTS[0] };
  }
  if (item.stage === "AJUSTE_PEDIDO") {
    return { background: "linear-gradient(135deg,#3a1f1f,#1c0e0e)" };
  }
  return { background: GRADIENTS[hash(item.id) % GRADIENTS.length] };
}

function tagStyle(tone: ItemVM["stageTag"]["tone"]): React.CSSProperties {
  if (tone === "wait") return { color: "var(--wait)" };
  if (tone === "no") return { color: "var(--no)" };
  return {};
}

function DocIcon() {
  return (
    <svg
      style={{ width: 42, height: 42, color: "rgba(255,255,255,.5)" }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function RejectForm({
  id,
  gate,
  onCancel,
}: {
  id: string;
  gate: "SCRIPT" | "FINAL";
  onCancel: () => void;
}) {
  return (
    <form className="reject-form" action={rejectAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="gate" value={gate} />
      <textarea
        name="comment"
        required
        placeholder="O que ajustar? (ex.: título ficou agressivo demais pro tom do canal)"
      />
      <div className="reject-row">
        <SubmitButton className="btn btn-no" pendingLabel="Enviando…">
          Enviar ajuste
        </SubmitButton>
        <button type="button" className="btn btn-soft" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Roteiro (gate SCRIPT): aprovar texto ou pedir ajuste.
function ScriptActions({ id }: { id: string }) {
  const [showReject, setShowReject] = useState(false);

  if (showReject) {
    return <RejectForm id={id} gate="SCRIPT" onCancel={() => setShowReject(false)} />;
  }

  return (
    <div className="actions">
      <form action={approveAction} style={{ flex: 1, display: "flex" }}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="gate" value="SCRIPT" />
        <SubmitButton className="btn btn-ok" pendingLabel="Aprovando…">
          Aprovar roteiro
        </SubmitButton>
      </form>
      <button className="btn btn-no" onClick={() => setShowReject(true)}>
        Pedir ajuste
      </button>
    </div>
  );
}

// Vídeo final (gate FINAL): aprovar, publicar agora, agendar ou pedir ajuste.
function VideoActions({ id }: { id: string }) {
  const [mode, setMode] = useState<"idle" | "reject" | "schedule">("idle");
  const [dt, setDt] = useState("");

  if (mode === "reject") {
    return <RejectForm id={id} gate="FINAL" onCancel={() => setMode("idle")} />;
  }

  if (mode === "schedule") {
    return (
      <form className="schedule-form" action={scheduleAction}>
        <input type="hidden" name="id" value={id} />
        <input
          type="hidden"
          name="scheduledFor"
          value={dt ? new Date(dt).toISOString() : ""}
        />
        <label>Publicar em</label>
        <input
          type="datetime-local"
          value={dt}
          onChange={(e) => setDt(e.target.value)}
          required
        />
        <div className="reject-row">
          <SubmitButton className="btn btn-ok" pendingLabel="Agendando…">
            Confirmar agendamento
          </SubmitButton>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => setMode("idle")}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="video-actions">
      <form action={publishNowAction} className="span2">
        <input type="hidden" name="id" value={id} />
        <SubmitButton className="btn btn-ok" pendingLabel="Publicando…">
          Publicar agora
        </SubmitButton>
      </form>
      <button className="btn btn-soft" onClick={() => setMode("schedule")}>
        Agendar
      </button>
      <form action={approveAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="gate" value="FINAL" />
        <SubmitButton className="btn btn-soft" pendingLabel="Aprovando…">
          Só aprovar
        </SubmitButton>
      </form>
      <button
        className="btn btn-no span2"
        onClick={() => setMode("reject")}
      >
        Pedir ajuste
      </button>
    </div>
  );
}

export default function Card({ item }: { item: ItemVM }) {
  const showDocIcon =
    item.stage === "AGUARDANDO_ROTEIRO" || item.stage === "EM_PRODUCAO";
  const hasPlayer = Boolean(item.videoUrl);

  return (
    <div className="card">
      {hasPlayer ? (
        <div className="preview preview-video">
          <span className="stage-tag" style={tagStyle(item.stageTag.tone)}>
            {item.stageTag.label}
          </span>
          <video
            src={item.videoUrl!}
            poster={item.thumbnailUrl ?? undefined}
            controls
            preload="metadata"
            playsInline
          />
        </div>
      ) : (
        <div className="preview" style={previewBackground(item)}>
          <span className="stage-tag" style={tagStyle(item.stageTag.tone)}>
            {item.stageTag.label}
          </span>
          {item.showPlay ? <div className="play" /> : null}
          {item.showPlay && item.durationLabel ? (
            <span className="dur">{item.durationLabel}</span>
          ) : null}
          {!item.showPlay && showDocIcon ? <DocIcon /> : null}
        </div>
      )}

      <div className="body">
        <div className="client">
          <span className="dot" />
          {item.clientLabel}
        </div>
        <h3>{item.title}</h3>
        {item.script ? <div className="script">{item.script}</div> : null}
        {item.networks.length > 0 ? (
          <div className="nets">
            {item.networks.map((n) => (
              <span className="net" key={n}>
                {PLATFORM_LABEL[n]}
              </span>
            ))}
          </div>
        ) : null}
        {item.tab === "pending" && (item.waitingLabel || item.metaRight) ? (
          <div className="meta">
            <span className="when">
              {item.waitingLabel ? `⏱ ${item.waitingLabel}` : ""}
            </span>
            {item.metaRight ? <span>{item.metaRight}</span> : null}
          </div>
        ) : null}
      </div>

      {item.gate === "SCRIPT" ? <ScriptActions id={item.id} /> : null}
      {item.gate === "FINAL" ? <VideoActions id={item.id} /> : null}

      {item.inProduction ? (
        <div className="stamp">
          <div className="stamp-inner stamp-wait">
            <ClockIcon />
            <span>
              <b>Em produção</b>{" "}
              <small>— HeyGen renderizando voz + vídeo</small>
            </span>
          </div>
        </div>
      ) : null}

      {item.stamp ? (
        <div className="stamp">
          <div className={`stamp-inner stamp-${item.stamp.tone}`}>
            {item.stamp.tone === "ok" ? <CheckIcon /> : <XIcon />}
            <span>
              <b>{item.stamp.title}</b>
              {item.stamp.channel ? <> · {item.stamp.channel}</> : null}{" "}
              {item.stamp.detail ? <small>{item.stamp.detail}</small> : null}
            </span>
          </div>
        </div>
      ) : null}

      <form action={archiveAction}>
        <input type="hidden" name="id" value={item.id} />
        <SubmitButton className="btn-archive" pendingLabel="Arquivando…">
          <TrashIcon /> Arquivar
        </SubmitButton>
      </form>
    </div>
  );
}
