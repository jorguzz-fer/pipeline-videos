"use server";

import { revalidatePath } from "next/cache";
import { Gate, Decision, Channel } from "@prisma/client";
import { auth, signOut } from "@/auth";
import { recordDecision } from "@/lib/items";

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

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
