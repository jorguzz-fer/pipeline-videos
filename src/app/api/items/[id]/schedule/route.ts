import { authorizeRequest } from "@/lib/apiAuth";
import { scheduleItem } from "@/lib/items";
import { scheduleSchema } from "@/lib/validation";
import { json, unauthorized, notFound, handleError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/items/:id/schedule  (n8n agenda no horário)
export async function POST(req: Request, { params }: Ctx) {
  const actor = await authorizeRequest(req);
  if (!actor) return unauthorized();
  const { id } = await params;

  try {
    const body = scheduleSchema.parse(await req.json());
    const actorName = actor.kind === "user" ? actor.name : body.actorName ?? "n8n";
    const item = await scheduleItem(id, new Date(body.scheduledFor), actorName);
    if (!item) return notFound("Item não encontrado.");
    return json({ item });
  } catch (err) {
    return handleError(err);
  }
}
