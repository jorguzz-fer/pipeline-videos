# Pipeline Playbook — Briefing para o próximo MVP

Este documento é o "passa-bastão" da esteira de aprovação de vídeos do **GrowthMinds** (`pipeline.tudomudou.com.br`).
Tudo o que está aqui foi **testado em produção** — não é teoria.

> Como usar: cole este arquivo (ou seu conteúdo) como primeira mensagem da nova sessão. A IA arranca com 80% do contexto que a versão anterior tinha, sem o lastro da conversa antiga.

---

## 1. O que o Pipeline faz, em uma frase

Recebe um pedido por **WhatsApp** → **Claude** gera o roteiro → **HeyGen** renderiza o vídeo → painel web aprova/agenda → publica e notifica.

Três workflows do **n8n** orquestram tudo. A app Next.js é só a **camada de saída** (aprovação + agendamento + estado): ela não sabe (e não precisa saber) de onde o conteúdo veio.

---

## 2. Stack que deu certo

| Camada | Escolha | Por quê |
|---|---|---|
| Web | **Next.js 15** (App Router, Server Actions, Server Components) | RSC + Server Actions matam 90% do JS no cliente. Forms `action={serverAction}` + `useFormStatus` resolvem mutações sem API client |
| Auth | **NextAuth v5 beta** (Credentials + JWT) | Edge-safe se você separar `auth.config.ts` (sem bcrypt/Prisma) de `auth.ts` (com). Sessão por cookie |
| DB | **Prisma 6** + **Postgres** | Migrations versionadas. `prisma generate` no `postinstall` resolve build em Docker |
| Validação | **Zod** | Schemas reusados em API + Server Actions |
| Hospedagem | **Coolify** (VPS) + Dockerfile multi-stage | Free, autossuficiente. Dockerfile abaixo |
| Automação | **n8n** (free, self-host) | Não use `$env.*` no free; use Credentials + Set node |
| WhatsApp | **Z-API** | `Evolution API` foi instável demais. URL: `api.z-api.io/instances/{id}/token/{token}/send-text`, body `{phone, message}`, header `Client-Token` |
| Vídeo IA | **HeyGen API v2** | `POST /v2/video/generate`. Para 9:16 use `dimension: {width: 720, height: 1280}` — `aspect_ratio` é ignorado |
| Texto IA | **Claude (Anthropic Messages API)** | Use `system` param pra contexto/persona (mais barato com cache + mais consistente que mandar no `user`) |

---

## 3. A grande sacada da arquitetura — separar **camada de saída** de **camada de entrada**

```
Entrada (n8n)                Saída (Next.js)              Distribuição (n8n)
─────────────                ──────────────              ────────────────────
WhatsApp Intake ─┐                                  ┌─→ Evento item.published
HeyGen Webhook  ─┼─→ POST /api/items ─→ ContentItem ─┼─→ Evento item.scheduled
OpusClip (futuro)┘   POST /api/items/:id           └─→ Evento item.changes_requested
                          (script, video, etc)            (HMAC sha256, fire-and-forget)
```

A app **não conhece** HeyGen, Z-API, OpusClip. Ela conhece `ContentItem`, `Stage`, `Gate`, `Decision`. Qualquer "entrada" nova é só uma chamada HTTP nova com `x-api-key`. Qualquer "saída" nova é só inscrever no webhook.

**Consequência prática:** o próximo MVP herda esse esqueleto e troca só os adaptadores nas pontas.

---

## 4. Máquina de estados (centro do sistema)

```
AGUARDANDO_ROTEIRO  ─aprova─→  EM_PRODUCAO  ─ready─→  AGUARDANDO_FINAL  ─aprova─→  APROVADO ─→ AGENDADO ─→ PUBLICADO
        │                                                    │
        └──pede ajuste──→  AJUSTE_PEDIDO  ←──pede ajuste─────┘
```

- **Gate** = portão de aprovação (`SCRIPT` ou `FINAL`)
- **Decision** = `APPROVED` ou `CHANGES_REQUESTED`
- Transições centralizadas em `src/lib/stages.ts::nextStageForDecision`. Decisão inválida lança `StageTransitionError`
- Estágios actionables (precisam de humano): `AGUARDANDO_ROTEIRO`, `AGUARDANDO_FINAL`
- Histórico: `AJUSTE_PEDIDO`, `APROVADO`, `AGENDADO`, `PUBLICADO`

Cada transição grava um `ApprovalEvent` (auditoria: quem, qual gate, qual canal, comentário) numa **mesma transação Prisma** do `update` do estágio. Webhook é emitido depois.

---

## 5. Schema Prisma (núcleo)

```prisma
model ContentItem {
  id        String   @id @default(cuid())
  clientId  String
  client    Client   @relation(...)
  title     String
  script    String   @db.Text
  source    Source   @default(HEYGEN)
  stage     Stage    @default(AGUARDANDO_ROTEIRO)
  networks  Platform[]
  videoUrl  String?
  thumbnailUrl String?
  durationSeconds Int?
  externalRef String?
  scheduledFor DateTime?
  publishedAt  DateTime?
  stageChangedAt DateTime @default(now())  // ← "aguardando há X"
  archived  Boolean  @default(false)       // ← soft delete (filtra em listItems)
  variants  ContentVariant[]                // ← caption/hook/hashtags por rede
  events    ApprovalEvent[]                 // ← auditoria
}

model ApprovalEvent {
  contentItemId String
  gate     Gate
  decision Decision
  channel  Channel  @default(SCREEN)        // SCREEN ou WHATSAPP
  actorUserId String?                       // null se decidido por serviço
  actorName   String                        // denormalizado p/ aprovação via WhatsApp
  comment    String? @db.Text
  isFallback Boolean @default(false)        // owner aprovou no lugar do cliente
}
```

**Princípio:** denormalize `actorName` no evento — assim aprovações de WhatsApp/n8n não precisam de `User`.

---

## 6. Autenticação dupla (essencial)

Toda rota de API aceita **dois modos**:

```ts
// src/lib/apiAuth.ts
export async function authorizeRequest(req: Request): Promise<Actor | null> {
  // 1. n8n / serviços: header x-api-key
  const key = req.headers.get("x-api-key");
  if (key && constantTimeEqual(key, process.env.SERVICE_API_KEY)) {
    return { kind: "service", name: "n8n" };
  }
  // 2. Painel web: cookie de sessão NextAuth
  const session = await auth();
  if (session?.user) return { kind: "user", ...session.user };
  return null;
}
```

Compare com `timingSafeEqual` pra evitar timing attack. Isso permite que **n8n** e **humanos** chamem as mesmas rotas sem ter duas APIs.

---

## 7. Eventos de domínio (notificação fire-and-forget)

```ts
// src/lib/events.ts
emitEvent("item.published", item);
```

- Faz `fetch(OUTBOUND_WEBHOOK_URL, {method: POST, headers: {x-signature: sha256-hmac}, body: JSON})`
- **Não bloqueia. Não lança.** Banco já é fonte da verdade
- Verificação HMAC do lado do n8n: `crypto.createHmac("sha256", secret).update(rawBody).digest("hex")`
- **Não funciona em Edge runtime** — precisa Node runtime

---

## 8. n8n: três workflows

### 00 — WhatsApp Intake (Z-API)
```
Z-API Webhook → Filtra remetente → Claude interpreta JSON → Se válido: POST /api/items + WA confirma
```
Z-API manda `body.text.message`, `body.phone`, `body.fromMe`, `body.isGroup`. Filtre `fromMe=false`, `isGroup=false`, `phone=DR_KLEBER`.

### 01 — Produção
```
Webhook → Config → Set Normaliza → Pipeline Cria Item → Set Item ID
  → Claude Gera Roteiro (com system prompt!) → Set Extrai Roteiro
  → Pipeline Salva Roteiro → HeyGen Submete Video → Set HeyGen ID
  → Aguarda 5min → HeyGen Verifica Status → IF Pronto
    ├ true:  Pipeline marca pronto → WA Notifica Aprovação
    └ false: volta pro Aguarda 5min (loop)
```

**Claude com system prompt** — não meta a persona inteira no `user`. Use o campo `system` da Anthropic Messages API, fica mais consistente e barato com cache.

```json
{
  "model": "claude-opus-4-7",
  "max_tokens": 2000,
  "system": "<briefing estratégico, persona, regras de tom...>",
  "messages": [{"role": "user", "content": "Crie roteiro sobre: ..."}]
}
```

### 02 — Eventos
```
Webhook → Verifica HMAC → Switch (event)
  ├ item.final_approved   → WA "aprovado"
  ├ item.changes_requested → WA "ajuste pedido"
  ├ item.scheduled         → Wait até scheduledFor → Pipeline Publica → WA "publicado"
  └ item.published         → WA "publicado direto"
```

---

## 9. Credenciais no n8n (free plan)

`$env.*` **não funciona no free**. Use:

1. **n8n Credentials** (tipo Header Auth) para cada API key: Anthropic, HeyGen, Z-API Client-Token, Pipeline (`x-api-key`)
2. **Set node "Config"** no início do workflow pra constantes não-secretas (URLs, instance IDs, telefones)

**Pegadinha de Header Auth:** o campo "Name" é o **nome do header HTTP** (ex.: `x-api-key`, `Authorization`), não o display name da credencial. Confundir aqui dá `ERR_INVALID_HTTP_TOKEN`.

---

## 10. Deploy (Coolify + Dockerfile multi-stage)

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl   # ← Prisma precisa

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma              # ← schema precisa estar aqui antes do npm ci
RUN npm ci || npm install         # postinstall roda prisma generate

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p 3000"]
```

**Migrations rodam no startup** — não no build. Banco precisa estar pronto antes do CMD.

**Env vars (Coolify → Environment Variables):**
```
DATABASE_URL=postgres://user:pass@host:5432/db
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://seu-dominio.com
AUTH_TRUST_HOST=true
SERVICE_API_KEY=<random hex 32>
OUTBOUND_WEBHOOK_URL=https://n8n.../webhook/eventos
OUTBOUND_WEBHOOK_SECRET=<random hex 32>
SEED_OWNER_EMAIL=...
SEED_OWNER_PASSWORD=...
PASSWORD_RESET_TOKEN=<random>  # ativa /login/reset
```

---

## 11. Pegadinhas que custaram tempo (não repita)

| Sintoma | Causa | Fix |
|---|---|---|
| `Can't reach database server` no build | Tentando migrar no build em vez de no startup | `prisma migrate deploy` no CMD, não no RUN |
| `useSearchParams() should be wrapped in suspense` no build | Next 15 + prerender estático | Envolva o **trecho** que usa `useSearchParams` em `<Suspense>` |
| HeyGen render em landscape | `aspect_ratio: '9:16'` é ignorado pela v2 | Use `dimension: {width: 720, height: 1280}` |
| Item criado sem script → 422 | `script` era required no Zod schema | Torna opcional: API cria item vazio, n8n preenche depois |
| `POST /api/items/null` no n8n | Lendo `$json.id` quando resposta é `{item: {id}}` | `$json.item.id` |
| `==={{ ... }}` no n8n | Dois `=` no início do expression | n8n já adiciona o primeiro — você só escreve `{{ ... }}` |
| Wait node não espera | Faltou `amount: 5` | Sempre setar `unit` E `amount` |
| Z-API webhook não dispara | `ReceivedCallback` precisa estar habilitado no painel do Z-API | Ativar manualmente |
| `prisma/schema.prisma not found` no Docker | `postinstall` rodou antes do schema ser copiado | `COPY prisma ./prisma` ANTES do `npm ci` |
| Login falha "credenciais inválidas" mesmo com seed | Seed não rodou em produção | `npm run db:seed` dentro do container |
| Botão de toggle no login virou roxo gigante | CSS `.login-card button` pegando todos os buttons | Escopar `button[type="submit"]` |
| `Set` node "Unused Respond to Webhook node" | `responseMode: "lastNode"` mas sem nó Respond | Use `responseMode: "onReceived"` |

---

## 12. UI patterns que funcionaram

- **3 abas** (Pendentes-Roteiros / Pendentes-Vídeos / Histórico) com chip de contagem
- **Card uniforme** com preview (vídeo ou gradiente colorido por hash do id) → corpo → ações
- **Server Actions** + `useFormStatus()` no botão → "Aprovando…" sem JS de client
- **Modos inline no card** (`useState<"idle"|"reject"|"schedule">`) — sem modal
- **Soft delete via `archived` boolean** + filtro em `listItems`. Bem mais simples que lixeira/restore
- **Reset de senha via env token** (`PASSWORD_RESET_TOKEN`) — sem precisar configurar email
- **Toggle olhinho de senha** (`<PasswordInput>`) reusável
- **Cor por estado**: roxo (brand), laranja (wait), vermelho (no), verde (ok)
- **Texto rolável em vez de truncado**: `max-height + overflow-y: auto + white-space: pre-wrap`

---

## 13. Estrutura de arquivos (cola pronta para o próximo MVP)

```
src/
├── auth.ts                 # NextAuth v5 com Prisma + bcrypt (Node runtime)
├── auth.config.ts          # Config Edge-safe (sem Prisma/bcrypt) — middleware usa isso
├── middleware.ts           # Redireciona não-logado para /login
├── lib/
│   ├── prisma.ts           # Singleton client
│   ├── apiAuth.ts          # authorizeRequest (x-api-key OU sessão)
│   ├── events.ts           # emitEvent fire-and-forget com HMAC
│   ├── stages.ts           # Máquina de estados + StageTransitionError
│   ├── items.ts            # createItem, updateItem, recordDecision, scheduleItem, publishItem, archiveItem
│   ├── validation.ts       # Zod schemas (criar, atualizar, decisão)
│   ├── viewModel.ts        # ContentItem do banco → ItemVM da UI (datas formatadas, stamps, etc)
│   └── format.ts           # durationLabel, agoLabel, scheduleLabel
├── app/
│   ├── api/
│   │   ├── items/route.ts                # POST cria, GET lista (com auth dupla)
│   │   ├── items/[id]/route.ts           # GET, PATCH
│   │   ├── items/[id]/decision/route.ts  # POST decisão (gate + decision + comment)
│   │   ├── items/[id]/publish/route.ts   # POST força publicação (usado pelo agendamento)
│   │   ├── items/[id]/schedule/route.ts  # POST agenda
│   │   ├── auth/[...nextauth]/route.ts   # handlers do NextAuth
│   │   └── health/route.ts               # smoke check
│   ├── login/
│   │   ├── page.tsx                      # Form com PasswordInput + link reset
│   │   ├── actions.ts                    # authenticate (signIn credentials)
│   │   └── reset/
│   │       ├── page.tsx                  # Form: email + token + nova senha
│   │       └── actions.ts                # Valida PASSWORD_RESET_TOKEN + bcrypt update
│   ├── actions.ts                        # approveAction, rejectAction, publishNowAction, scheduleAction, archiveAction, signOutAction
│   ├── page.tsx                          # Dashboard (lista + 3 abas)
│   ├── globals.css                       # design system todo aqui
│   └── layout.tsx
├── components/
│   ├── Dashboard.tsx                     # Tabs + grid
│   ├── Card.tsx                          # ScriptActions, VideoActions, RejectForm
│   ├── SubmitButton.tsx                  # useFormStatus → "…" durante pending
│   └── PasswordInput.tsx                 # type=password com toggle olhinho
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                           # OWNER + CLIENT + TEAM + dados demo
│   └── migrations/
├── n8n/
│   ├── workflow-00-whatsapp-intake.json
│   ├── workflow-01-producao.json
│   └── workflow-02-eventos.json
└── Dockerfile
```

---

## 14. Para um MVP novo, eu recomendaria:

1. **Clonar este repo e renomear** (90% reaproveitável: auth, schema-base, eventos, dual auth, Dockerfile, padrões UI)
2. Manter o **mesmo modelo de aprovação** se a esteira é "input externo → IA gera → humano aprova → distribui"
3. **Renomear** `ContentItem` para o substantivo do novo domínio (ex.: `Post`, `Email`, `Anuncio`)
4. **Trocar adaptadores** nas pontas (workflow 00, 01, 02) mas **manter a forma**
5. Começar com **3 estágios** se o fluxo é mais simples (`PENDENTE → APROVADO → PUBLICADO`) — a máquina de estados é trivial de mexer
6. Já criar `PASSWORD_RESET_TOKEN` e botão arquivar **desde o dia 1** — foram features adicionadas depois e eu queria ter feito antes

---

## 15. Comandos rápidos

```bash
# Dev local
npm run dev

# Migration
npx prisma migrate dev --name minha_mudanca

# Seed
npm run db:seed

# Resetar banco local (CUIDADO)
npm run db:reset

# Build (testar antes de pushar)
npm run build

# Type check
npx tsc --noEmit
```

---

## 16. Decisões que NÃO compensaram

- ❌ **Evolution API** pra WhatsApp — instabilidade alta. **Z-API é melhor**, mais previsível
- ❌ **`aspect_ratio` no HeyGen v2** — ignorado. **Use `dimension`**
- ❌ **Tentar usar `$env` no n8n free** — só pago. **Use Credentials + Set node**
- ❌ **`useSearchParams` sem Suspense** — falha o build estático. **Sempre envolva**
- ❌ **Migrations no build** — DB não tá pronto ainda. **Roda no startup**

---

*Doc gerado no fim da sessão do Pipeline. Última verificação: estado funcional em produção, deploy verde no Coolify, fluxo WhatsApp → Claude → HeyGen → painel → WhatsApp validado end-to-end.*
