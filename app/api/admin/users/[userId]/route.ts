// src/app/api/admin/users/[userId]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest, // req não é usado aqui, mas faz parte da assinatura
  { params }: { params: {
      userIdToDelete: string; userId: string 
} }
) {
  try {
    const session = await getServerSession(authOptions);
    const { userId: userIdToDelete } = params;

    // 1. Autenticação e Autorização do Admin
    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { 
        status: 403, headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (!userIdToDelete) {
      return new NextResponse(JSON.stringify({ error: "ID do usuário não fornecido." }), { 
        status: 400, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 2. Impedir que o admin se autoexclua
    const adminUser = await db.user.findUnique({
        where: { email: process.env.ADMIN_EMAIL }
    });
    if (adminUser && adminUser.id === userIdToDelete) {
        return new NextResponse(JSON.stringify({ error: "O administrador supremo não pode se autoexcluir." }), { 
            status: 403, headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 3. Verificar se o usuário a ser excluído existe
    const userExists = await db.user.findUnique({
      where: { id: userIdToDelete },
    });

    if (!userExists) {
      return new NextResponse(JSON.stringify({ error: "Usuário não encontrado." }), { 
        status: 404, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 4. Excluir o usuário
    // O Prisma cuidará das exclusões em cascata (SellerProfile, Books, Ratings, etc.)
    // conforme definido no seu schema.
    await db.user.delete({
      where: { id: userIdToDelete },
    });

    return NextResponse.json({ message: `Usuário ${userExists.name || userIdToDelete} excluído com sucesso.` });

  } catch (error: any) {
    console.error(`[ADMIN_DELETE_USER_API_ERROR] UserID: ${params.userIdToDelete || 'N/A'}`, error);
    // Tratar erros específicos do Prisma, se necessário (ex: P2025 Record to delete does not exist)
    if (error.code === 'P2025') {
        return new NextResponse(JSON.stringify({ error: "Usuário não encontrado para exclusão." }), { status: 404 });
    }
    return new NextResponse(
      JSON.stringify({ error: "Erro interno ao excluir o usuário." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}