// src/app/api/auth/verify-email/route.ts
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(
        JSON.stringify({ error: "Token não fornecido." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const verificationToken = await db.verificationToken.findUnique({
      where: { token: token },
    });

    if (!verificationToken) {
      return new NextResponse(
        JSON.stringify({ error: "Token inválido." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(verificationToken.expires) < new Date()) {
      // Opcional: Deletar token expirado
      await db.verificationToken.delete({ where: { token: token } });
      return new NextResponse(
        JSON.stringify({ error: "Token expirado." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Token válido e não expirado, marcar email como verificado
    const user = await db.user.update({
      where: { id: verificationToken.identifier }, // identifier é o userId
      data: { emailVerified: new Date() },
    });

    // Deletar o token após o uso bem-sucedido
    await db.verificationToken.delete({
      where: { token: token },
    });

    // Não retorne dados sensíveis do usuário
    return NextResponse.json({ message: "Email verificado com sucesso!" });

  } catch (error) {
    console.error("[VERIFY_EMAIL_API_ERROR]", error);
    return new NextResponse(
        JSON.stringify({ error: "Erro interno do servidor ao verificar o email." }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}