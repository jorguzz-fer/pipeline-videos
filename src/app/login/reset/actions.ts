"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type ResetState = { error?: string; ok?: boolean };

export async function resetPasswordAction(
  _prev: ResetState | undefined,
  formData: FormData
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!email || !token || !newPassword) {
    return { error: "Preencha todos os campos." };
  }
  if (newPassword.length < 6) {
    return { error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }

  const expected = process.env.PASSWORD_RESET_TOKEN;
  if (!expected) {
    return {
      error:
        "Reset desabilitado: defina PASSWORD_RESET_TOKEN no servidor.",
    };
  }
  if (token !== expected) {
    return { error: "Token de reset inválido." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Usuário não encontrado." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  redirect("/login?reset=ok");
}
