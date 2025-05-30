// src/app/api/dashboard/charts/books-by-category/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!sellerProfile) {
      return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 404 });
    }

    // Buscar categorias que têm livros deste vendedor e contar quantos livros são
    const categoriesWithBookCount = await db.category.findMany({
      where: {
        books: {
          some: { // A categoria deve ter PELO MENOS UM livro deste vendedor
            sellerId: sellerProfile.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            books: { // Contar apenas os livros DESTE vendedor dentro de cada categoria
              where: {
                sellerId: sellerProfile.id,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc'
      }
    });

    const labels = categoriesWithBookCount.map((cat) => cat.name);
    const data = categoriesWithBookCount.map((cat) => cat._count.books);

    // Gerar cores aleatórias ou usar uma paleta predefinida
    const backgroundColors = labels.map(() => `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`);
    const borderColors = backgroundColors.map(color => color.replace('0.6', '1'));


    return NextResponse.json({
      labels,
      datasets: [
        {
          label: 'Nº de Livros por Categoria',
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    });

  } catch (error) {
    console.error("[CHART_BOOKS_BY_CATEGORY_API_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro interno ao buscar dados para o gráfico." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}