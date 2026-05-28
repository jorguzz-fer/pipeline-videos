import { Stage } from "@prisma/client";
import { authorizeRequest } from "@/lib/apiAuth";
import { createItem, listItems } from "@/lib/items";
import { json, unauthorized, handleError } from "@/lib/http";

// GET /api/items?stage=AGUARDANDO_ROTEIRO&clientId=...
export async function GET(req: Request) {
  const actor = await authorizeRequest(req);
  if (!actor) return unauthorized();

  try {
    const url = new URL(req.url);
    const stageParam = url.searchParams.getAll("stage");
    const stages = stageParam.filter((s): s is Stage => s in Stage);
    const clientId = url.searchParams.get("clientId") ?? undefined;
    const items = await listItems({
      stages: stages.length ? stages : undefined,
      clientId,
    });
    return json({ items });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/items  (origem/n8n cria um item de conteúdo)
export async function POST(req: Request) {
  const actor = await authorizeRequest(req);
  if (!actor) return unauthorized();

  try {
    const body = await req.json();
    const item = await createItem(body);
    return json({ item }, 201);
  } catch (err) {
    return handleError(err);
  }
}
