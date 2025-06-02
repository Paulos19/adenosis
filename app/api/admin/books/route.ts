// src/app/api/admin/books/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";
import { Book, Category, SellerProfile, User, BookStatus, Prisma } from "@prisma/client"; // Importe os tipos

// Tipo para o retorno da API, incluindo detalhes do vendedor e categoria
export type AdminBookView = Book & {
  category: Pick<Category, 'id' | 'name'> | null;
  seller: (Pick<SellerProfile, 'id' | 'storeName'> & {
    user: Pick<User, 'id' | 'name' | 'email'> | null;
  }) | null;
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Validação de Admin Supremo pelo email
    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { 
        status: 403, headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10"); // 10 livros por página
    const searchQuery = searchParams.get("q")?.trim();
    const statusFilter = searchParams.get("status") as BookStatus | undefined;
    const categoryIdFilter = searchParams.get("categoryId");
    const sellerIdFilter = searchParams.get("sellerId"); // ID do SellerProfile

    let orderBy: Prisma.BookOrderByWithRelationInput = { createdAt: "desc" }; // Padrão
    const sortParam = searchParams.get("sort");
    if (sortParam === "title_asc") orderBy = { title: "asc" };
    if (sortParam === "title_desc") orderBy = { title: "desc" };
    if (sortParam === "price_asc") orderBy = { price: "asc" };
    if (sortParam === "price_desc") orderBy = { price: "desc" };
    if (sortParam === "stock_asc") orderBy = { stock: "asc" };
    if (sortParam === "stock_desc") orderBy = { stock: "desc" };


    const whereClause: Prisma.BookWhereInput = {};
    if (searchQuery) {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { author: { contains: searchQuery, mode: 'insensitive' } },
        { isbn: { contains: searchQuery, mode: 'insensitive' } },
        { seller: { storeName: { contains: searchQuery, mode: 'insensitive' } } },
      ];
    }
    if (statusFilter && Object.values(BookStatus).includes(statusFilter)) {
        whereClause.status = statusFilter;
    }
    if (categoryIdFilter) {
        whereClause.categoryId = categoryIdFilter;
    }
    if (sellerIdFilter) {
        whereClause.sellerId = sellerIdFilter;
    }

    const books = await db.book.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: orderBy,
      include: {
        category: {
          select: { id: true, name: true }
        },
        seller: {       
          select: {
            id: true,
            storeName: true,
            user: { // Para saber quem é o vendedor (usuário)
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    const totalBooks = await db.book.count({ where: whereClause });

    return NextResponse.json({
      data: books as AdminBookView[], // Cast para o tipo de retorno esperado
      pagination: {
        totalItems: totalBooks,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalBooks / limit),
      }
    }, { headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("[ADMIN_BOOKS_GET_API_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro interno ao buscar todos os livros." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}