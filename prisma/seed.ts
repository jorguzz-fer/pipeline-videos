import {
  PrismaClient,
  Role,
  Platform,
  Stage,
  Gate,
  Decision,
  Channel,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

async function main() {
  const now = Date.now();

  // --- Usuários (multi-usuário: cliente + dono + time) ---
  const ownerEmail = (process.env.SEED_OWNER_EMAIL ?? "fer.jorge@gmail.com").toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "mudar123";

  const [fernando, kleber] = await Promise.all([
    prisma.user.upsert({
      where: { email: ownerEmail },
      update: {},
      create: {
        name: "Fernando Jorge",
        email: ownerEmail,
        passwordHash: await bcrypt.hash(ownerPassword, 10),
        role: Role.OWNER,
      },
    }),
    prisma.user.upsert({
      where: { email: "kleber@growthminds.com" },
      update: {},
      create: {
        name: "Dr. Kleber",
        email: "kleber@growthminds.com",
        passwordHash: await bcrypt.hash("kleber123", 10),
        role: Role.CLIENT,
        phone: "+5511999990000",
      },
    }),
    prisma.user.upsert({
      where: { email: "time@tudomudou.com" },
      update: {},
      create: {
        name: "Time Tudo Mudou",
        email: "time@tudomudou.com",
        passwordHash: await bcrypt.hash("time123", 10),
        role: Role.TEAM,
      },
    }),
  ]);

  // --- Cliente ---
  const existingClient = await prisma.client.findFirst({
    where: { name: "GrowthMinds", contactName: "Dr. Kleber" },
  });
  const client =
    existingClient ??
    (await prisma.client.create({
      data: { name: "GrowthMinds", contactName: "Dr. Kleber" },
    }));

  // Recria os itens a cada seed (demo determinística).
  await prisma.contentItem.deleteMany({ where: { clientId: client.id } });

  // --- PENDENTES ---
  await prisma.contentItem.create({
    data: {
      clientId: client.id,
      title: "Por que a maioria dos negócios trava no operacional",
      script:
        "Se o seu negócio para quando você sai de férias, você não tem uma empresa — tem um emprego que você criou pra si mesmo. O operacional precisa rodar sem você, e isso começa com...",
      networks: [Platform.INSTAGRAM, Platform.TIKTOK, Platform.LINKEDIN],
      stage: Stage.AGUARDANDO_ROTEIRO,
      stageChangedAt: new Date(now - 12 * MIN),
    },
  });

  await prisma.contentItem.create({
    data: {
      clientId: client.id,
      title: "Como dizer não para um cliente sem perder a conta",
      script:
        "Dizer não não é sobre fechar a porta — é sobre proteger o que você já entregou de qualidade. Quando você aceita tudo, a sua melhor entrega vira a média...",
      networks: [Platform.INSTAGRAM, Platform.LINKEDIN],
      stage: Stage.EM_PRODUCAO,
      externalRef: "heygen_video_demo_001",
      stageChangedAt: new Date(now - 25 * MIN),
    },
  });

  await prisma.contentItem.create({
    data: {
      clientId: client.id,
      title: "3 erros que sabotam a delegação na sua equipe",
      script:
        "Delegar não é largar. Quando você passa uma tarefa sem contexto e sem critério de pronto, você não delegou — você abandonou. O primeiro erro é...",
      networks: [Platform.INSTAGRAM, Platform.TIKTOK, Platform.YOUTUBE],
      stage: Stage.AGUARDANDO_FINAL,
      videoUrl: "https://example.com/videos/delegacao.mp4",
      durationSeconds: 52,
      stageChangedAt: new Date(now - 1 * HOUR),
      variants: {
        create: [
          {
            platform: Platform.INSTAGRAM,
            caption:
              "Delegar não é largar. 3 erros que fazem sua equipe travar 👇",
            hook: "Você não delegou — você abandonou.",
            hashtags: ["#gestao", "#lideranca", "#delegacao"],
          },
          {
            platform: Platform.TIKTOK,
            caption: "O erro nº1 da delegação que ninguém te conta.",
            hook: "Passar tarefa sem critério de pronto = abandono.",
            hashtags: ["#gestao", "#empreendedorismo"],
          },
        ],
      },
    },
  });

  await prisma.contentItem.create({
    data: {
      clientId: client.id,
      title: "O indicador que todo gestor deveria olhar toda semana",
      script:
        "Faturamento é vaidade, lucro é sanidade, mas caixa é realidade. Se você só olha quanto vendeu e nunca quanto sobrou no fim do mês, você está dirigindo olhando o retrovisor...",
      networks: [Platform.INSTAGRAM, Platform.LINKEDIN],
      stage: Stage.AGUARDANDO_FINAL,
      videoUrl: "https://example.com/videos/indicador.mp4",
      durationSeconds: 47,
      stageChangedAt: new Date(now - 3 * HOUR),
    },
  });

  // --- HISTÓRICO ---
  // Aprovado pelo Kleber via WhatsApp, agendado p/ hoje 18h.
  const scheduled = new Date();
  scheduled.setHours(18, 0, 0, 0);
  const agendado = await prisma.contentItem.create({
    data: {
      clientId: client.id,
      title: "Como contratar sem errar nas primeiras 3 vagas",
      script: "Contratar errado custa caro...",
      networks: [Platform.INSTAGRAM, Platform.TIKTOK, Platform.LINKEDIN],
      stage: Stage.AGENDADO,
      videoUrl: "https://example.com/videos/contratar.mp4",
      durationSeconds: 58,
      scheduledFor: scheduled,
      stageChangedAt: new Date(now - 20 * HOUR),
    },
  });
  await prisma.approvalEvent.create({
    data: {
      contentItemId: agendado.id,
      gate: Gate.FINAL,
      decision: Decision.APPROVED,
      channel: Channel.WHATSAPP,
      actorUserId: kleber.id,
      actorName: "Dr. Kleber",
      createdAt: new Date(now - 20 * HOUR),
    },
  });

  // Aprovado pelo Fernando (fallback do time), publicado há 2 dias.
  const publicado = await prisma.contentItem.create({
    data: {
      clientId: client.id,
      title: "A diferença entre preço e valor que ninguém te explica",
      script: "Preço é o que você paga, valor é o que você leva...",
      networks: [Platform.INSTAGRAM, Platform.YOUTUBE],
      stage: Stage.PUBLICADO,
      videoUrl: "https://example.com/videos/preco-valor.mp4",
      durationSeconds: 44,
      publishedAt: new Date(now - 2 * DAY),
      stageChangedAt: new Date(now - 2 * DAY),
    },
  });
  await prisma.approvalEvent.create({
    data: {
      contentItemId: publicado.id,
      gate: Gate.FINAL,
      decision: Decision.APPROVED,
      channel: Channel.SCREEN,
      actorUserId: fernando.id,
      actorName: "Fernando",
      isFallback: true,
      createdAt: new Date(now - 2 * DAY),
    },
  });

  // Ajuste pedido pelo Kleber, voltou pro roteiro (3 dias atrás).
  const ajuste = await prisma.contentItem.create({
    data: {
      clientId: client.id,
      title: "5 sinais de que está na hora de demitir",
      script: "Texto original do roteiro...",
      networks: [Platform.INSTAGRAM, Platform.LINKEDIN],
      stage: Stage.AJUSTE_PEDIDO,
      stageChangedAt: new Date(now - 3 * DAY),
    },
  });
  await prisma.approvalEvent.create({
    data: {
      contentItemId: ajuste.id,
      gate: Gate.SCRIPT,
      decision: Decision.CHANGES_REQUESTED,
      channel: Channel.WHATSAPP,
      actorUserId: kleber.id,
      actorName: "Dr. Kleber",
      comment:
        "O título ficou agressivo demais pro tom do canal. Reescreve focando em 'quando a parceria não está funcionando'.",
      createdAt: new Date(now - 3 * DAY),
    },
  });

  console.log("Seed concluído.");
  console.log(`  Owner:  ${ownerEmail} / ${ownerPassword}`);
  console.log("  Cliente: kleber@growthminds.com / kleber123");
  console.log("  Time:    time@tudomudou.com / time123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
