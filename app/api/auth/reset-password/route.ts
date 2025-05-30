// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return new NextResponse(
        JSON.stringify({ error: "Token e nova senha são obrigatórios." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar a força da senha aqui se desejar (ex: mínimo de caracteres)
    if (password.length < 6) {
        return new NextResponse(
            JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres." }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const resetTokenEntry = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!resetTokenEntry) {
      return new NextResponse(
        JSON.stringify({ error: "Token inválido." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(resetTokenEntry.expires) < new Date()) {
      await db.verificationToken.delete({ where: { token } }); // Limpar token expirado
      return new NextResponse(
        JSON.stringify({ error: "Token expirado." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { id: resetTokenEntry.identifier }, // identifier é o userId
      data: { password: hashedPassword, emailVerified: new Date() }, // Opcional: re-verificar email se quiser
    });

    // Deletar o token após o uso
    await db.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json({ message: "Senha redefinida com sucesso!" });

  } catch (error) {
    console.error("[RESET_PASSWORD_API_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro interno do servidor ao redefinir a senha." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}