import { authorizeRequest } from "@/lib/apiAuth";
import { publishItem } from "@/lib/items";
import { publishSchema } from "@/lib/validation";
import { json, unauthorized, notFound, handleError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/items/:id/publish  (n8n confirma publicação nas redes)
export async function POST(req: Request, { params }: Ctx) {
  const actor = await authorizeRequest(req);
  if (!actor) return unauthorized();
  const { id } = await params;

  try {
    const body = publishSchema.parse(await req.json().catch(() => ({})));
    const actorName = actor.kind === "user" ? actor.name : body.actorName ?? "n8n";
    const publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();
    const item = await publishItem(id, publishedAt, actorName);
    if (!item) return notFound("Item não encontrado.");
    return json({ item });
  } catch (err) {
    return handleError(err);
  }
}
