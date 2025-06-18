// src/app/api/dashboard/books/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
    });

    if (!sellerProfile) {
        return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 404 });
    }
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const searchQuery = searchParams.get("q")?.trim();

    const whereClause: Prisma.BookWhereInput = {
      sellerId: sellerProfile.id,
    };

    if (searchQuery) {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { author: { contains: searchQuery, mode: 'insensitive' } },
        { isbn: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const books = await db.book.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: "desc" },
    });

    const totalBooks = await db.book.count({ where: whereClause });

    return NextResponse.json({
      data: books,
      pagination: {
        totalItems: totalBooks,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalBooks / limit),
      },
    });

  } catch (error) {
    console.error("[DASHBOARD_BOOKS_GET_API_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro ao buscar os seus livros." }),
      { status: 500 }
    );
  }
}
