// src/app/api/wishlist/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";
import { z } from "zod";

// Schema para adicionar item à wishlist
const addToWishlistSchema = z.object({
  bookId: z.string().cuid("ID do livro inválido."),
});

// GET: Buscar todos os itens da wishlist do usuário logado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    const wishlistItems = await db.wishlistItem.findMany({
      where: { userId: session.user.id },
      include: {
        book: { // Inclui todos os detalhes do livro
          include: {
            category: true,
            seller: {
              select: { id: true, storeName: true, whatsappNumber: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Mapeia para retornar apenas os objetos de livro, como BookWithDetails
    const books = wishlistItems.map(item => item.book);

    return NextResponse.json(books);

  } catch (error) {
    console.error("[WISHLIST_GET_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro ao buscar lista de desejos." }), { status: 500 });
  }
}

// POST: Adicionar um item à wishlist
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado. Faça login para adicionar à wishlist." }), { status: 401 });
    }

    const body = await req.json();
    const validation = addToWishlistSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400 }
      );
    }

    const { bookId } = validation.data;

    // Verificar se o livro existe
    const bookExists = await db.book.findUnique({ where: { id: bookId } });
    if (!bookExists) {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado." }), { status: 404 });
    }

    // Verificar se já está na wishlist para evitar duplicatas (o schema do Prisma já tem @@unique)
    const existingItem = await db.wishlistItem.findUnique({
      where: {
        userId_bookId: {
          userId: session.user.id,
          bookId: bookId,
        },
      },
    });

    if (existingItem) {
      return NextResponse.json(existingItem, { status: 200 }); // Já existe, retorna sucesso silencioso ou o item
    }

    const wishlistItem = await db.wishlistItem.create({
      data: {
        userId: session.user.id,
        bookId: bookId,
      },
    });

    return NextResponse.json(wishlistItem, { status: 201 });

  } catch (error) {
    console.error("[WISHLIST_POST_API_ERROR]", error);
    // ... (tratamento de erro Zod se necessário)
    return new NextResponse(JSON.stringify({ error: "Erro ao adicionar à lista de desejos." }), { status: 500 });
  }
}