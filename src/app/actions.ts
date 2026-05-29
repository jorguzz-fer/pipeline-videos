"use server";

import { revalidatePath } from "next/cache";
import { Gate, Decision, Channel } from "@prisma/client";
import { auth, signOut } from "@/auth";
import { recordDecision, publishItem, scheduleItem, archiveItem } from "@/lib/items";

function parseGate(value: FormDataEntryValue | null): Gate {
  return value === "FINAL" ? Gate.FINAL : Gate.SCRIPT;
}

async function decide(formData: FormData, decision: Decision) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id ausente.");
  const gate = parseGate(formData.get("gate"));
  const comment = String(formData.get("comment") ?? "").trim() || undefined;

  // Aprovação por owner/time no lugar do cliente conta como fallback.
  const isFallback =
    decision === Decision.APPROVED && session.user.role !== "CLIENT";

  await recordDecision(id, {
    gate,
    decision,
    channel: Channel.SCREEN,
    comment,
    isFallback,
    resolvedActorName: session.user.name ?? session.user.email ?? "Usuário",
    resolvedActorUserId: session.user.id,
  });

  revalidatePath("/");
}

export async function approveAction(formData: FormData) {
  await decide(formData, Decision.APPROVED);
}

export async function rejectAction(formData: FormData) {
  await decide(formData, Decision.CHANGES_REQUESTED);
}

async function actorFromSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  return session.user.name ?? session.user.email ?? "Usuário";
}

// Aprova o vídeo final e publica na hora (AGUARDANDO_FINAL → PUBLICADO).
export async function publishNowAction(formData: FormData) {
  const actorName = await actorFromSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id ausente.");

  await publishItem(id, new Date(), actorName);
  revalidatePath("/");
}

// Aprova o vídeo final e agenda a publicação (AGUARDANDO_FINAL → AGENDADO).
export async function scheduleAction(formData: FormData) {
  const actorName = await actorFromSession();
  const id = String(formData.get("id") ?? "");
  const when = String(formData.get("scheduledFor") ?? "");
  if (!id) throw new Error("id ausente.");

  const date = new Date(when);
  if (Number.isNaN(date.getTime())) throw new Error("Data de agendamento inválida.");

  await scheduleItem(id, date, actorName);
  revalidatePath("/");
}

export async function archiveAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id ausente.");
  await archiveItem(id);
  revalidatePath("/");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
