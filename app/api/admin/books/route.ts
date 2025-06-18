// src/app/api/admin/books/[bookId]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho se necessário
import { db } from "@/lib/prisma";
import { storage } from "@/lib/firebase"; // Sua configuração do Firebase Storage
import { ref, deleteObject } from "firebase/storage";
import { z } from "zod";
import { Book, BookCondition, BookStatus, Category, Prisma, SellerProfile, User } from "@prisma/client";

// Schema Zod para ATUALIZAR um livro pelo Admin
// Todos os campos são opcionais, mas se fornecidos, são validados.
const adminUpdateBookSchema = z.object({
  title: z.string().min(3, "Título muito curto").max(255, "Título muito longo").optional(),
  author: z.string().min(3, "Autor muito curto").max(255, "Autor muito longo").optional(),
  description: z.string().min(10, "Descrição muito curta").max(10000, "Descrição excede o limite").optional().nullable(), // Permitir null para limpar
  price: z.coerce.number().positive("Preço deve ser positivo").optional(),
  coverImageUrl: z.string().url("URL da imagem inválida.").nullable().optional(), // Permite null para remover
  condition: z.nativeEnum(BookCondition).optional(),
  stock: z.coerce.number().int().min(0, "Estoque não pode ser negativo.").optional(),
  categoryId: z.string().cuid("ID de categoria inválido.").optional(),
  status: z.nativeEnum(BookStatus).optional(), // Admin pode mudar status por aqui também
  isbn: z.string().max(20, "ISBN muito longo.").optional().nullable(),
  publisher: z.string().max(100, "Nome da editora muito longo.").optional().nullable(),
  publicationYear: z.coerce.number().int().min(1000, "Ano inválido.").max(new Date().getFullYear() + 5, "Ano futuro demais.").optional().nullable(),
  language: z.string().max(50, "Idioma muito longo.").optional().nullable(),
  pages: z.coerce.number().int().positive("Número de páginas inválido.").optional().nullable(),
  tags: z.array(z.string().max(50, "Tag individual muito longa.")).max(10, "Máximo de 10 tags.").optional(),
  // Opcional: Admin poderia mudar o sellerId, mas isso tem implicações.
  // sellerId: z.string().cuid("ID de vendedor inválido").optional(),
});

export type AdminBookView = Book & { // Adicionado 'export' aqui
  category: Pick<Category, 'id' | 'name'> | null;
  seller: (Pick<SellerProfile, 'id' | 'storeName'> & {
    user: Pick<User, 'id' | 'name' | 'email'> | null;
  }) | null;
};


// GET: Buscar um livro específico para visualização/edição pelo Admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { 
        status: 403, headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const searchQuery = searchParams.get("q")?.trim();
    const statusFilter = searchParams.get("status") as BookStatus | undefined;
    const categoryIdFilter = searchParams.get("categoryId");
    const sellerIdFilter = searchParams.get("sellerId");

    let orderBy: Prisma.BookOrderByWithRelationInput = { createdAt: "desc" };
    const sortParam = searchParams.get("sort");
    if (sortParam === "title_asc") orderBy = { title: "asc" };
    if (sortParam === "title_desc") orderBy = { title: "desc" };
    // Adicione mais ordenações se necessário

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
        category: { select: { id: true, name: true } },
        seller: {       
          select: {
            id: true,
            storeName: true,
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const totalBooks = await db.book.count({ where: whereClause });

    return NextResponse.json({
      data: books as AdminBookView[], // Cast para o tipo exportado
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
// PUT: Admin atualiza os detalhes de um livro
export async function PUT(
  req: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { bookId } = params;

    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    if (!bookId) {
        return new NextResponse(JSON.stringify({ error: "ID do livro não fornecido." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new NextResponse(JSON.stringify({ error: "Corpo da requisição JSON inválido." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const validation = adminUpdateBookSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos para atualização.", details: validation.error.flatten().fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const bookToUpdate = await db.book.findUnique({ where: { id: bookId } });
    if (!bookToUpdate) {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado para atualização." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const validatedData = validation.data;
    const updatePayload: Prisma.BookUpdateInput = {};

    // Construir payload dinamicamente com campos fornecidos
    let hasChanges = false;
    for (const key in validatedData) {
        if (Object.prototype.hasOwnProperty.call(validatedData, key)) {
            const typedKey = key as keyof typeof validatedData;
            // Adiciona ao payload se o valor for fornecido (não undefined)
            // E se for diferente do valor existente (para evitar updates desnecessários, opcional)
            // ou se a chave for 'coverImageUrl' e o valor for null (para permitir remoção de imagem)
            if (validatedData[typedKey] !== undefined) {
                if (typedKey === 'tags' && Array.isArray(validatedData.tags)) {
                    (updatePayload as any)[typedKey] = { set: validatedData.tags };
                    hasChanges = true;
                } else if (validatedData[typedKey] !== bookToUpdate[typedKey as keyof Book] || typedKey === 'coverImageUrl') {
                     // Tratar números que podem vir como string vazia do formulário e foram coercidos para NaN
                    if ((typedKey === 'publicationYear' || typedKey === 'pages' || typedKey === 'price' || typedKey === 'stock') && isNaN(Number(validatedData[typedKey]))) {
                         if(adminUpdateBookSchema.shape[typedKey].isOptional()){ // Checa se o campo é opcional no schema Zod
                            (updatePayload as any)[typedKey] = null; // Converte NaN para null para campos numéricos opcionais
                         }
                    } else {
                        (updatePayload as any)[typedKey] = validatedData[typedKey];
                    }
                    hasChanges = true;
                }
            }
        }
    }
    
    // Lógica para deletar imagem antiga do Firebase
    if (Object.prototype.hasOwnProperty.call(validatedData, 'coverImageUrl')) {
        const newUrl = validatedData.coverImageUrl; // Pode ser string ou null
        const oldUrl = bookToUpdate.coverImageUrl;
        if (oldUrl && oldUrl !== newUrl && oldUrl.includes("firebasestorage.googleapis.com")) {
            if (newUrl === null || (newUrl && newUrl !== oldUrl)) { // Deleta se nova URL é null ou diferente
                try {
                    const oldImageRef = ref(storage, oldUrl);
                    await deleteObject(oldImageRef);
                    console.log("Admin: Imagem antiga do Firebase deletada:", oldUrl);
                } catch (e: any) { /* ... (tratamento de erro de deleção de imagem) ... */ }
            }
        }
    }

    if (!hasChanges) {
        return NextResponse.json(bookToUpdate, { status: 200, headers: { 'Content-Type': 'application/json' } }); // Nenhum dado útil para atualizar
    }
    
    updatePayload.updatedAt = new Date(); // Sempre atualiza o timestamp
        
    const updatedBook = await db.book.update({
      where: { id: bookId },
      data: updatePayload,
    });

    return NextResponse.json(updatedBook, { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(`[ADMIN_UPDATE_BOOK_API_ERROR] BookID: ${params.bookId}`, error);
    if (error.code === 'P2025') {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado para atualização." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    return new NextResponse(JSON.stringify({ error: "Erro interno ao atualizar o livro." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


// DELETE: Admin exclui um livro
export async function DELETE(
  req: NextRequest, // req não é usado, mas é parte da assinatura
  { params }: { params: { bookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { bookId } = params;

    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    if (!bookId) {
        return new NextResponse(JSON.stringify({ error: "ID do livro não fornecido." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const bookToDelete = await db.book.findUnique({ where: { id: bookId } });
    if (!bookToDelete) {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Deletar imagem do Firebase Storage se ela existir e for uma URL do Firebase
    if (bookToDelete.coverImageUrl && bookToDelete.coverImageUrl.includes("firebasestorage.googleapis.com")) {
      try {
        const imageRef = ref(storage, bookToDelete.coverImageUrl);
        await deleteObject(imageRef);
        console.log(`Admin: Imagem ${bookToDelete.coverImageUrl} deletada do Firebase Storage.`);
      } catch (storageError: any) {
        if (storageError.code !== 'storage/object-not-found') {
          console.error("Admin: Erro ao deletar imagem do Firebase Storage:", storageError);
        } else {
          console.warn("Admin: Imagem não encontrada no Firebase para deleção:", bookToDelete.coverImageUrl);
        }
      }
    }

    // O Prisma deve cuidar das exclusões em cascata (WishlistItems, Reservations)
    await db.book.delete({ where: { id: bookId } });

    return NextResponse.json({ message: `Livro "${bookToDelete.title}" e imagem associada (se houver) foram excluídos com sucesso.` }, { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(`[ADMIN_DELETE_BOOK_API_ERROR] BookID: ${params.bookId}`, error);
    if (error.code === 'P2025') { // Prisma: Record to delete does not exist.
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado para exclusão." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    // Tratar P2003: Foreign key constraint failed (se uma relação não tem onDelete: Cascade e impede a exclusão)
    if (error.code === 'P2003') {
        return new NextResponse(JSON.stringify({ error: "Não foi possível excluir o livro pois ele está referenciado em outros registros (ex: reservas ativas não cascadeadas)." }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
    return new NextResponse(JSON.stringify({ error: "Erro interno ao excluir o livro." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}