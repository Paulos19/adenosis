// src/app/api/books/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) { // Exige pelo menos 2 caracteres para buscar
    return NextResponse.json({ data: [], message: 'Query muito curta.' }, { status: 400 });
  }

  try {
    const books = await db.book.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { author: { contains: query, mode: 'insensitive' } },
          { isbn: { contains: query, mode: 'insensitive' } },
          // Considerar adicionar busca na descrição com cuidado (pode ser lento)
          // { description: { contains: query, mode: 'insensitive' } },
          { category: { name: { contains: query, mode: 'insensitive' } } },
          { seller: { storeName: { contains: query, mode: 'insensitive' } } },
        ],
        // Adicionar um filtro para apenas livros visíveis/em estoque, se aplicável
        // stock: { gt: 0 }, 
        // isPublished: true, 
      },
      include: {
        category: true,
        seller: {
          select: { storeName: true, id: true, whatsappNumber: true }, // Inclui whatsappNumber se precisar no card de resultado
        },
      },
      take: 10, // Limita o número de resultados para a busca rápida
    });

    return NextResponse.json({ data: books });
  } catch (error) {
    console.error('[BOOKS_SEARCH_API_ERROR]', error);
    return NextResponse.json({ error: 'Erro ao buscar livros.' }, { status: 500 });
  }
}