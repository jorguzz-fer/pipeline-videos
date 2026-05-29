import { z } from "zod";
import {
  Stage,
  Gate,
  Decision,
  Channel,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  nextStageForDecision,
  StageTransitionError,
} from "@/lib/stages";
import {
  createItemSchema,
  updateItemSchema,
  decisionSchema,
} from "@/lib/validation";
import { emitEvent, type DomainEvent } from "@/lib/events";

// Mapeia o estágio resultante de uma decisão para o evento de domínio.
const DECISION_EVENT: Partial<Record<Stage, DomainEvent>> = {
  [Stage.EM_PRODUCAO]: "item.script_approved",
  [Stage.AJUSTE_PEDIDO]: "item.changes_requested",
  [Stage.APROVADO]: "item.final_approved",
};

const itemInclude = {
  client: true,
  variants: true,
  events: {
    orderBy: { createdAt: "desc" as const },
    include: { actor: { select: { id: true, name: true } } },
  },
} satisfies Prisma.ContentItemInclude;

export type ItemWithRelations = Prisma.ContentItemGetPayload<{
  include: typeof itemInclude;
}>;

export function getItem(id: string) {
  return prisma.contentItem.findUnique({ where: { id }, include: itemInclude });
}

export function listItems(opts: { stages?: Stage[]; clientId?: string } = {}) {
  return prisma.contentItem.findMany({
    where: {
      ...(opts.stages ? { stage: { in: opts.stages } } : {}),
      ...(opts.clientId ? { clientId: opts.clientId } : {}),
    },
    include: itemInclude,
    orderBy: { stageChangedAt: "asc" },
  });
}

export async function createItem(input: z.infer<typeof createItemSchema>) {
  const data = createItemSchema.parse(input);

  const clientId = data.clientId ?? (await resolveClientId(data));

  const item = await prisma.contentItem.create({
    data: {
      clientId,
      title: data.title,
      script: data.script ?? "",
      source: data.source ?? undefined,
      networks: data.networks,
      externalRef: data.externalRef,
      previewUrl: data.previewUrl,
      thumbnailUrl: data.thumbnailUrl,
      stage: Stage.AGUARDANDO_ROTEIRO,
      stageChangedAt: new Date(),
    },
    include: itemInclude,
  });

  emitEvent("item.created", item);
  return item;
}

// Encontra um cliente por nome+contato; cria se não existir.
async function resolveClientId(data: {
  clientName?: string;
  clientContactName?: string;
}) {
  const name = data.clientName!;
  const contactName = data.clientContactName!;
  const existing = await prisma.client.findFirst({
    where: { name, contactName },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.client.create({ data: { name, contactName } });
  return created.id;
}

export async function updateItem(
  id: string,
  input: z.infer<typeof updateItemSchema>
) {
  const data = updateItemSchema.parse(input);
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) return null;

  const willBeReady =
    data.markReadyForFinal && item.stage === Stage.EM_PRODUCAO;

  const updated = await prisma.$transaction(async (tx) => {
    if (data.variants?.length) {
      for (const v of data.variants) {
        await tx.contentVariant.upsert({
          where: {
            contentItemId_platform: {
              contentItemId: id,
              platform: v.platform,
            },
          },
          update: {
            caption: v.caption,
            hook: v.hook,
            hashtags: v.hashtags ?? [],
          },
          create: {
            contentItemId: id,
            platform: v.platform,
            caption: v.caption,
            hook: v.hook,
            hashtags: v.hashtags ?? [],
          },
        });
      }
    }

    return tx.contentItem.update({
      where: { id },
      data: {
        title: data.title,
        script: data.script,
        videoUrl: data.videoUrl,
        previewUrl: data.previewUrl,
        thumbnailUrl: data.thumbnailUrl,
        durationSeconds: data.durationSeconds,
        externalRef: data.externalRef,
        ...(willBeReady
          ? { stage: Stage.AGUARDANDO_FINAL, stageChangedAt: new Date() }
          : {}),
      },
      include: itemInclude,
    });
  });

  if (willBeReady) emitEvent("item.ready_for_final", updated);
  return updated;
}

export type DecisionInput = z.infer<typeof decisionSchema> & {
  // Resolvidos pela camada chamadora (sessão da tela ou corpo do n8n).
  resolvedActorName: string;
  resolvedActorUserId?: string | null;
};

export async function recordDecision(id: string, input: DecisionInput) {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) return null;

  const target = nextStageForDecision(item.stage, input.gate, input.decision);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.approvalEvent.create({
      data: {
        contentItemId: id,
        gate: input.gate,
        decision: input.decision,
        channel: input.channel ?? Channel.SCREEN,
        actorUserId: input.resolvedActorUserId ?? undefined,
        actorName: input.resolvedActorName,
        comment: input.comment,
        isFallback: input.isFallback ?? false,
      },
    });

    return tx.contentItem.update({
      where: { id },
      data: { stage: target, stageChangedAt: new Date() },
      include: itemInclude,
    });
  });

  const event = DECISION_EVENT[target];
  if (event) emitEvent(event, updated);
  return updated;
}

export async function scheduleItem(
  id: string,
  scheduledFor: Date,
  actorName: string
) {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) return null;
  if (item.stage !== Stage.APROVADO) {
    throw new StageTransitionError(
      `Só itens APROVADO podem ser agendados (atual: ${item.stage}).`
    );
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.approvalEvent.create({
      data: {
        contentItemId: id,
        gate: Gate.FINAL,
        decision: Decision.APPROVED,
        channel: Channel.SCREEN,
        actorName,
        comment: `Agendado para ${scheduledFor.toISOString()}`,
      },
    });
    return tx.contentItem.update({
      where: { id },
      data: {
        stage: Stage.AGENDADO,
        scheduledFor,
        stageChangedAt: new Date(),
      },
      include: itemInclude,
    });
  });

  emitEvent("item.scheduled", updated);
  return updated;
}

export async function publishItem(
  id: string,
  publishedAt: Date,
  actorName: string
) {
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) return null;
  if (item.stage !== Stage.AGENDADO && item.stage !== Stage.APROVADO) {
    throw new StageTransitionError(
      `Só itens AGENDADO/APROVADO podem ser publicados (atual: ${item.stage}).`
    );
  }
  const updated = await prisma.contentItem.update({
    where: { id },
    data: { stage: Stage.PUBLICADO, publishedAt, stageChangedAt: new Date() },
    include: itemInclude,
  });

  emitEvent("item.published", updated);
  return updated;
}
