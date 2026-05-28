import type { NextAuthConfig } from "next-auth";

// Configuração "leve" (sem Prisma/bcrypt) compartilhada com o middleware (Edge).
// Os providers reais ficam em auth.ts (runtime Node).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    // Usado pelo middleware para proteger rotas de página.
    authorized({ auth, request: { nextUrl } }) {
      const p = nextUrl.pathname;
      // API (n8n/WhatsApp) cuida da própria auth via x-api-key; login é público.
      if (p.startsWith("/api") || p.startsWith("/login")) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
