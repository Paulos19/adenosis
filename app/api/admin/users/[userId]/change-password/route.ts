// src/app/api/admin/users/[userId]/change-password/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcrypt";
// Opcional: import { sendMail } from "@/lib/mail";

// Schema Zod para validar a nova senha
const changePasswordSchema = z.object({
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: {
      targetUserId: string; userId: string 
} }
) {
  try {
    const session = await getServerSession(authOptions);
    const { userId: targetUserId } = params;

    // 1. Autenticação e Autorização do Admin
    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { 
        status: 403, headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!targetUserId) {
      return new NextResponse(JSON.stringify({ error: "ID do usuário não fornecido." }), { 
        status: 400, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 2. Impedir que o admin altere a própria senha por esta rota
    // (Idealmente, o admin teria uma seção própria para gerenciar sua conta)
    const adminUserRecord = await db.user.findUnique({ where: { email: process.env.ADMIN_EMAIL }});
    if (adminUserRecord && adminUserRecord.id === targetUserId) {
        return new NextResponse(JSON.stringify({ error: "O administrador não pode alterar a própria senha por esta interface. Use a recuperação de senha padrão se necessário." }), { 
            status: 403, headers: { 'Content-Type': 'application/json' } 
        });
    }


    const body = await req.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { newPassword } = validation.data;

    // 3. Verificar se o usuário alvo existe
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return new NextResponse(JSON.stringify({ error: "Usuário não encontrado." }), { 
        status: 404, headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // 4. Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 5. Atualizar a senha do usuário
    await db.user.update({
      where: { id: targetUserId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(), // Força a atualização do timestamp
      },
    });

    // 6. Opcional: Notificar o usuário por email que sua senha foi alterada por um administrador
    // if (targetUser.email) {
    //   try {
    //     await sendMail({
    //       to: targetUser.email,
    //       subject: "Sua senha na Adenosis Livraria foi alterada",
    //       html: `
    //         <p>Olá ${targetUser.name || 'Usuário'},</p>
    //         <p>Informamos que a senha da sua conta na Adenosis Livraria foi alterada por um administrador.</p>
    //         <p>Se você não reconhece esta atividade ou acredita que isso foi um erro, entre em contato conosco imediatamente.</p>
    //         <p>Atenciosamente,<br>Equipe Adenosis Livraria</p>
    //       `,
    //     });
    //   } catch (emailError) {
    //     console.error("Falha ao enviar email de notificação de troca de senha:", emailError);
    //     // Não bloquear a resposta de sucesso por falha no email, mas logar.
    //   }
    // }

    return NextResponse.json({ message: `Senha do usuário ${targetUser.name || targetUserId} atualizada com sucesso.` });

  } catch (error: any) {
    console.error(`[ADMIN_CHANGE_PASSWORD_API_ERROR] UserID: ${params.targetUserId || 'N/A'}`, error);
    if (error.code === 'P2025') { // Record to update not found
        return new NextResponse(JSON.stringify({ error: "Usuário não encontrado para alteração de senha." }), { status: 404 });
    }
    return new NextResponse(
      JSON.stringify({ error: "Erro interno ao alterar a senha do usuário." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}