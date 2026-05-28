import { z } from "zod";
import { Platform, Source, Gate, Decision, Channel } from "@prisma/client";

const platform = z.nativeEnum(Platform);

// Criação de item pela origem (n8n). O cliente pode vir por id OU por nome+contato.
export const createItemSchema = z
  .object({
    clientId: z.string().min(1).optional(),
    clientName: z.string().min(1).optional(),
    clientContactName: z.string().min(1).optional(),
    title: z.string().min(1).max(300),
    script: z.string().min(1),
    source: z.nativeEnum(Source).optional(),
    networks: z.array(platform).min(1),
    externalRef: z.string().optional(),
    previewUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
  })
  .refine((d) => d.clientId || (d.clientName && d.clientContactName), {
    message: "Informe clientId ou clientName + clientContactName.",
  });

// Atualização parcial (n8n posta resultado do render, textos, etc.).
export const updateItemSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  script: z.string().min(1).optional(),
  videoUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  durationSeconds: z.number().int().positive().optional(),
  externalRef: z.string().optional(),
  // Quando o render fica pronto, a origem marca o item como pronto p/ aprovação final.
  markReadyForFinal: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        platform,
        caption: z.string().min(1),
        hook: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

// Decisão em um portão (tela ou WhatsApp).
export const decisionSchema = z.object({
  gate: z.nativeEnum(Gate),
  decision: z.nativeEnum(Decision),
  channel: z.nativeEnum(Channel).optional(),
  // Ator: quando vem da tela, usamos a sessão; quando vem do n8n/WhatsApp, exigimos nome.
  actorName: z.string().min(1).optional(),
  actorUserId: z.string().optional(),
  comment: z.string().optional(),
  isFallback: z.boolean().optional(),
});

export const scheduleSchema = z.object({
  scheduledFor: z.string().datetime(),
  actorName: z.string().min(1).optional(),
});

export const publishSchema = z.object({
  publishedAt: z.string().datetime().optional(),
  actorName: z.string().min(1).optional(),
});
