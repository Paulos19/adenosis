// src/app/api/books/batch-delete/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/prisma";
import { storage } from "@/lib/firebase";
import { ref, deleteObject } from "firebase/storage";
import { z } from "zod";

const batchDeleteSchema = z.object({
  bookIds: z.array(z.string().cuid()).min(1, "Pelo menos um ID de livro é necessário."),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== 'SELLER' && session.user.role !== 'ADMIN')) {
      return new NextResponse(JSON.stringify({ error: 'Não autorizado.' }), { status: 401 });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!sellerProfile) {
      return new NextResponse(JSON.stringify({ error: 'Perfil de vendedor não encontrado.' }), { status: 404 });
    }

    const body = await req.json();
    const validation = batchDeleteSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify({ error: "Dados inválidos.", details: validation.error.flatten() }), { status: 400 });
    }

    const { bookIds } = validation.data;

    // Buscar os livros para garantir que pertencem ao vendedor e obter as URLs das imagens
    const booksToDelete = await db.book.findMany({
      where: {
        id: { in: bookIds },
        sellerId: sellerProfile.id, // Garante que o vendedor só apague os seus próprios livros
      },
      select: {
        id: true,
        coverImageUrl: true,
      },
    });

    // Deletar imagens do Firebase Storage
    const imageDeletePromises = booksToDelete
      .map(book => {
        if (book.coverImageUrl && book.coverImageUrl.includes("firebasestorage.googleapis.com")) {
          const imageRef = ref(storage, book.coverImageUrl);
          return deleteObject(imageRef).catch(error => {
            // Não impede a exclusão do DB, mas regista o erro
            console.error(`Falha ao excluir a imagem ${book.coverImageUrl} do livro ${book.id}:`, error);
          });
        }
        return null;
      })
      .filter(Boolean);
      
    await Promise.all(imageDeletePromises);

    // Deletar os livros do banco de dados
    const idsToDelete = booksToDelete.map(book => book.id);
    const { count } = await db.book.deleteMany({
      where: {
        id: { in: idsToDelete },
      },
    });

    return NextResponse.json({ message: `${count} livros foram excluídos com sucesso.` });

  } catch (error) {
    console.error("[BOOKS_BATCH_DELETE_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro interno ao excluir livros." }), { status: 500 });
  }
}
