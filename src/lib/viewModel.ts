import { Stage, Platform, Decision, Channel } from "@prisma/client";
import type { ItemWithRelations } from "@/lib/items";
import { STAGE_LABEL } from "@/lib/stages";
import { durationLabel, waitingLabel, agoLabel, scheduleLabel } from "@/lib/format";

export type StampVM = {
  tone: "ok" | "no";
  title: string;
  channel: string | null;
  detail: string | null;
};

export type ItemVM = {
  id: string;
  clientLabel: string;
  title: string;
  script: string | null;
  stage: Stage;
  tab: "pending" | "history";
  stageTag: { label: string; tone: "brand" | "wait" | "no" };
  networks: Platform[];
  showPlay: boolean;
  durationLabel: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  gate: "SCRIPT" | "FINAL" | null;
  waitingLabel: string | null;
  metaRight: string | null;
  inProduction: boolean;
  stamp: StampVM | null;
};

const HISTORY_STAGES = new Set<Stage>([
  Stage.AJUSTE_PEDIDO,
  Stage.APROVADO,
  Stage.AGENDADO,
  Stage.PUBLICADO,
]);

function stageTag(stage: Stage): ItemVM["stageTag"] {
  switch (stage) {
    case Stage.AGUARDANDO_ROTEIRO:
      return { label: "Roteiro", tone: "wait" };
    case Stage.EM_PRODUCAO:
      return { label: "Em produção", tone: "wait" };
    case Stage.AGUARDANDO_FINAL:
      return { label: "Vídeo final", tone: "brand" };
    case Stage.AJUSTE_PEDIDO:
      return { label: "Ajuste pedido", tone: "no" };
    case Stage.AGENDADO:
      return { label: "Agendado", tone: "brand" };
    case Stage.PUBLICADO:
      return { label: "Publicado", tone: "brand" };
    case Stage.APROVADO:
      return { label: "Aprovado", tone: "brand" };
    default:
      return { label: STAGE_LABEL[stage], tone: "brand" };
  }
}

function buildStamp(item: ItemWithRelations, now: Date): StampVM | null {
  const last = item.events[0];
  if (!last) return null;
  const approved = last.decision === Decision.APPROVED;
  const channel = last.channel === Channel.WHATSAPP ? "WhatsApp" : null;

  const base =
    item.stage === Stage.PUBLICADO && item.publishedAt
      ? `publicado ${agoLabel(item.publishedAt, now)}`
      : agoLabel(last.createdAt, now);

  const extras: string[] = [];
  if (item.stage === Stage.AGENDADO && item.scheduledFor) {
    extras.push(`agendado p/ ${scheduleLabel(item.scheduledFor, now)}`);
  }
  if (last.decision === Decision.CHANGES_REQUESTED) {
    extras.push("voltou pro roteiro");
  }
  if (last.isFallback) {
    extras.push("fallback do time");
  }

  const detail = `— ${base}${extras.length ? " · " + extras.join(" · ") : ""}`;

  const verb = approved ? "Aprovado" : "Ajuste pedido";
  return {
    tone: approved ? "ok" : "no",
    title: `${verb} por ${last.actorName}`,
    channel,
    detail,
  };
}

export function toItemVM(item: ItemWithRelations, now = new Date()): ItemVM {
  const isHistory = HISTORY_STAGES.has(item.stage);
  const clientLabel = `${item.client.name} · ${item.client.contactName}`;
  const hasVideo = Boolean(item.videoUrl || item.durationSeconds);

  const gate =
    item.stage === Stage.AGUARDANDO_ROTEIRO
      ? "SCRIPT"
      : item.stage === Stage.AGUARDANDO_FINAL
      ? "FINAL"
      : null;

  // Para ajuste pedido, mostramos o comentário (motivo) no lugar do roteiro.
  const lastComment = item.events[0]?.comment ?? null;
  const script =
    item.stage === Stage.AJUSTE_PEDIDO ? lastComment : item.script;

  let metaRight: string | null = null;
  if (item.stage === Stage.AGUARDANDO_ROTEIRO) metaRight = "Antes do vídeo";
  else if (item.stage === Stage.AGUARDANDO_FINAL) metaRight = "Voz + vídeo prontos";
  else if (item.stage === Stage.EM_PRODUCAO) metaRight = "Renderizando…";

  return {
    id: item.id,
    clientLabel,
    title: item.title,
    script,
    stage: item.stage,
    tab: isHistory ? "history" : "pending",
    stageTag: stageTag(item.stage),
    networks: item.networks,
    showPlay: hasVideo && item.stage !== Stage.AJUSTE_PEDIDO,
    durationLabel: durationLabel(item.durationSeconds),
    thumbnailUrl: item.thumbnailUrl ?? null,
    videoUrl: item.videoUrl ?? null,
    gate,
    waitingLabel:
      gate != null ? waitingLabel(item.stageChangedAt, now) : null,
    metaRight,
    inProduction: item.stage === Stage.EM_PRODUCAO,
    stamp: isHistory ? buildStamp(item, now) : null,
  };
}
