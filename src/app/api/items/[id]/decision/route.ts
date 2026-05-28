import { authorizeRequest } from "@/lib/apiAuth";
import { recordDecision } from "@/lib/items";
import { decisionSchema } from "@/lib/validation";
import { json, unauthorized, notFound, handleError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/items/:id/decision
// Tela: usa a sessão como ator. n8n/WhatsApp: passa actorName (+ channel WHATSAPP).
export async function POST(req: Request, { params }: Ctx) {
  const actor = await authorizeRequest(req);
  if (!actor) return unauthorized();
  const { id } = await params;

  try {
    const body = decisionSchema.parse(await req.json());

    const resolvedActorName =
      actor.kind === "user" ? actor.name : body.actorName ?? "n8n";
    if (!resolvedActorName) {
      return json({ error: "actorName é obrigatório para serviço." }, 422);
    }

    const item = await recordDecision(id, {
      ...body,
      resolvedActorName,
      resolvedActorUserId:
        actor.kind === "user" ? actor.userId : body.actorUserId ?? null,
    });
    if (!item) return notFound("Item não encontrado.");
    return json({ item });
  } catch (err) {
    return handleError(err);
  }
}
