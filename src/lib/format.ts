import { Platform } from "@prisma/client";

export const PLATFORM_LABEL: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function durationLabel(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// "Aguardando há 12 min" — tempo desde que entrou no estágio atual.
export function waitingLabel(since: Date, now = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - since.getTime()) / 60000));
  if (mins < 1) return "Aguardando agora";
  if (mins < 60) return `Aguardando há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Aguardando há ${hours} h`;
  const days = Math.round(hours / 24);
  return `Aguardando há ${days} ${days === 1 ? "dia" : "dias"}`;
}

// "agora" / "há 12 min" / "ontem" / "há 3 dias" — para o histórico.
export function agoLabel(when: Date, now = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - when.getTime()) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

// "hoje 18h" / "amanhã 9h" / "dd/mm HH'h'" — para itens agendados.
export function scheduleLabel(when: Date, now = new Date()): string {
  const hh = when.getHours();
  const time = when.getMinutes()
    ? `${hh}:${String(when.getMinutes()).padStart(2, "0")}`
    : `${hh}h`;
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(when) - startOfDay(now)) / 86400000
  );
  if (dayDiff === 0) return `hoje ${time}`;
  if (dayDiff === 1) return `amanhã ${time}`;
  const d = String(when.getDate()).padStart(2, "0");
  const m = String(when.getMonth() + 1).padStart(2, "0");
  return `${d}/${m} ${time}`;
}
