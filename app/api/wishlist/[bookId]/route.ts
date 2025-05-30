// src/app/api/wishlist/[bookId]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    const { bookId } = params;
    if (!bookId) {
      return new NextResponse(JSON.stringify({ error: "ID do livro não fornecido." }), { status: 400 });
    }

    // Verificar se o item existe na wishlist do usuário antes de deletar
    const wishlistItem = await db.wishlistItem.findUnique({
        where: {
            userId_bookId: {
                userId: session.user.id,
                bookId: bookId,
            }
        }
    });

    if (!wishlistItem) {
        return new NextResponse(JSON.stringify({ error: "Item não encontrado na lista de desejos." }), { status: 404 });
    }

    await db.wishlistItem.delete({
      where: {
        userId_bookId: {
          userId: session.user.id,
          bookId: bookId,
        },
      },
    });

    return NextResponse.json({ message: "Livro removido da lista de desejos com sucesso." });

  } catch (error) {
    console.error("[WISHLIST_DELETE_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro ao remover da lista de desejos." }), { status: 500 });
  }
}