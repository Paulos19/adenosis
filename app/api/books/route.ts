// src/app/api/books/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho se necessário
import { db } from "@/lib/prisma";
import { z } from "zod";
import { BookCondition } from "@prisma/client"; // Importe o enum

// Schema Zod para validação do corpo da requisição
const createBookSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  author: z.string().min(3, "O nome do autor deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.number().positive("O preço deve ser um valor positivo."),
  coverImageUrl: z.string().url("URL da imagem de capa inválida.").min(1, "URL da imagem é obrigatória."),
  condition: z.nativeEnum(BookCondition, { errorMap: () => ({ message: "Condição do livro inválida."}) }),
  stock: z.number().int().min(0, "O estoque não pode ser negativo.").optional().default(1),
  categoryId: z.string().cuid("ID da categoria inválido."),
  // Outros campos opcionais que você pode querer adicionar:
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  publicationYear: z.number().int().optional(),
  language: z.string().optional(),
  pages: z.number().int().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "12"); // Padrão 12 livros por página
  const page = parseInt(searchParams.get("page") || "1");
  const sort = searchParams.get("sort"); // ex: "recent", "price_asc", "price_desc"
  const categoryId = searchParams.get("categoryId");
  const searchQuery = searchParams.get("q"); // Para busca por título/autor

  let orderBy: any = { createdAt: "desc" }; // Padrão para mais recentes
  if (sort === "price_asc") orderBy = { price: "asc" };
  if (sort === "price_desc") orderBy = { price: "desc" };
  // Adicionar mais opções de sort se necessário

  const whereClause: any = {};
  if (categoryId) {
    whereClause.categoryId = categoryId;
  }
  if (searchQuery) {
    whereClause.OR = [ // Busca no título OU no autor
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { author: { contains: searchQuery, mode: 'insensitive' } }
    ];
  }

  try {
    const books = await db.book.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: orderBy,
      include: {
        category: true,
        seller: {       
          select: {
            id: true,
            storeName: true,
            whatsappNumber: true, 
          }
        }
      }
    });

    const totalBooks = await db.book.count({ where: whereClause });

    return NextResponse.json({
      data: books,
      pagination: {
        totalItems: totalBooks,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalBooks / limit),
      }
    });
  } catch (error) {
    console.error("[BOOKS_GET_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro ao buscar livros." }), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
    }

    // Encontrar o SellerProfile associado ao userId da sessão
    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!sellerProfile) {
      return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 404 });
    }

    const body = await req.json();
    const validation = createBookSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400 }
      );
    }

    const { title, author, description, price, coverImageUrl, condition, stock, categoryId, ...optionalFields } = validation.data;

    // Verificar se a categoria existe
    const categoryExists = await db.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      return new NextResponse(JSON.stringify({ error: "Categoria não encontrada." }), { status: 400 });
    }

    const newBook = await db.book.create({
      data: {
        title,
        author,
        description,
        price,
        coverImageUrl, // Por enquanto, uma URL de texto
        condition,
        stock,
        categoryId,
        sellerId: sellerProfile.id, // Associar ao vendedor logado
        ...optionalFields,
      },
    });

    return NextResponse.json(newBook, { status: 201 });

  } catch (error) {
    console.error("[BOOKS_POST_API_ERROR]", error);
    let errorMessage = "Erro interno do servidor ao criar o livro.";
    if (error instanceof z.ZodError) { // Se for erro de validação não pego pelo safeParse (improvável aqui)
        errorMessage = "Dados inválidos fornecidos.";
        return new NextResponse(JSON.stringify({ error: errorMessage, details: error.flatten().fieldErrors }), { status: 400 });
    }
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}