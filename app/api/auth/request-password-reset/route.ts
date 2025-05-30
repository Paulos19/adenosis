// src/app/api/auth/request-password-reset/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return new NextResponse(
        JSON.stringify({ error: "Email é obrigatório." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user) {
      // Mesmo que o usuário exista, não revelamos isso diretamente.
      // Procedemos com a geração do token e envio do email.
      // Se o email não existir, o email simplesmente não será enviado para ninguém.

      // Opcional: Impedir redefinição se o email não estiver verificado
      // if (!user.emailVerified) {
      //   return new NextResponse(
      //     JSON.stringify({ error: "Por favor, verifique seu email primeiro." }),
      //     { status: 403, headers: { 'Content-Type': 'application/json' } }
      //   );
      // }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenExpires = new Date(Date.now() + 3600000); // Token expira em 1 hora

      // Deletar tokens de reset antigos para este usuário, se houver
      await db.verificationToken.deleteMany({
        where: {
          identifier: user.id,
          // Se você adicionar um campo 'type' ao VerificationToken, filtre por tipo aqui
        }
      });

      await db.verificationToken.create({
        data: {
          identifier: user.id,
          token: resetToken,
          expires: tokenExpires,
        },
      });

      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

      await sendMail({
        to: user.email!,
        subject: "Redefinição de Senha - Adenosis Livraria",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h1 style="color: #059669;">Solicitação de Redefinição de Senha</h1>
            <p>Olá ${user.name || 'Usuário'},</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta na Adenosis Livraria.</p>
            <p>Por favor, clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetLink}" target="_blank" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir Senha</a>
            <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
            <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
            <p>Este link é válido por 1 hora. Se você não solicitou esta redefinição, por favor, ignore este email.</p>
            <p>Atenciosamente,<br>Equipe Adenosis Livraria</p>
          </div>
        `,
      });
    }

    // Sempre retorne uma mensagem genérica para não revelar se um email está ou não no sistema.
    return NextResponse.json({
      message: "Se um usuário com este email estiver registrado, um link para redefinição de senha foi enviado.",
    });

  } catch (error) {
    console.error("[REQUEST_PASSWORD_RESET_API_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}