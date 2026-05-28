import crypto from "crypto";
import type { ItemWithRelations } from "@/lib/items";

// Eventos de domínio emitidos pela camada de saída para a orquestração (n8n).
export type DomainEvent =
  | "item.created"
  | "item.script_approved"
  | "item.changes_requested"
  | "item.ready_for_final"
  | "item.final_approved"
  | "item.scheduled"
  | "item.published";

// Dispara um webhook para o n8n (fire-and-forget). Não bloqueia nem lança:
// a camada de saída é a fonte da verdade; o webhook é só notificação.
// Requer servidor Node de longa duração (não serverless/edge).
export function emitEvent(event: DomainEvent, item: ItemWithRelations) {
  const url = process.env.OUTBOUND_WEBHOOK_URL;
  if (!url) return;

  const payload = JSON.stringify({
    event,
    item,
    sentAt: new Date().toISOString(),
  });

  const headers: Record<string, string> = { "content-type": "application/json" };
  const secret = process.env.OUTBOUND_WEBHOOK_SECRET;
  if (secret) {
    const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    headers["x-signature"] = `sha256=${sig}`;
  }

  void fetch(url, { method: "POST", headers, body: payload }).catch((err) => {
    console.error("emitEvent falhou:", event, err);
  });
}
