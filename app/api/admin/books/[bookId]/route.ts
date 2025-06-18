// src/app/api/admin/books/[bookId]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";
import { storage } from "@/lib/firebase"; // Sua configuração do Firebase
import { ref, deleteObject } from "firebase/storage";
import { z } from "zod";
import { BookCondition, BookStatus, Prisma } from "@prisma/client";

// Schema Zod para ATUALIZAR um livro pelo Admin
// Todos os campos são opcionais, mas se fornecidos, são validados.
const adminUpdateBookSchema = z.object({
  title: z.string().min(3, "Título muito curto").max(255, "Título muito longo").optional(),
  author: z.string().min(3, "Autor muito curto").max(255, "Autor muito longo").optional(),
  description: z.string().min(1, "Descrição não pode ser vazia se fornecida.").max(10000, "Descrição excede o limite.").optional().nullable(),
  price: z.coerce.number({invalid_type_error: "Preço deve ser um número."}).positive("Preço deve ser positivo.").optional(),
  coverImageUrl: z.string().url("URL da imagem inválida.").nullable().optional(),
  condition: z.nativeEnum(BookCondition).optional(),
  stock: z.coerce.number({invalid_type_error: "Estoque deve ser um número."}).int("Estoque deve ser inteiro.").min(0, "Estoque não pode ser negativo.").optional(),
  categoryId: z.string().cuid("ID de categoria inválido.").optional(),
  status: z.nativeEnum(BookStatus).optional(),
  isbn: z.string().max(20, "ISBN muito longo.").optional().nullable(),
  publisher: z.string().max(100, "Nome da editora muito longo.").optional().nullable(),
  publicationYear: z.coerce.number({invalid_type_error: "Ano deve ser um número."}).int().min(1000, "Ano inválido.").max(new Date().getFullYear() + 5, "Ano futuro demais.").optional().nullable(),
  language: z.string().max(50, "Idioma muito longo.").optional().nullable(),
  pages: z.coerce.number({invalid_type_error: "Páginas deve ser um número."}).int().positive("Número de páginas inválido.").optional().nullable(),
  tags: z.array(z.string().max(50, "Tag individual muito longa.")).max(10, "Máximo de 10 tags.").optional(),
});

// GET: Buscar um livro específico para visualização/edição pelo Admin
export async function GET(
  req: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    const { bookId } = params;
    if (!bookId) {
        return new NextResponse(JSON.stringify({ error: "ID do livro não fornecido." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const book = await db.book.findUnique({ 
        where: { id: bookId }, 
        include: { 
            category: true, 
            seller: { 
                include: { 
                    user: {select: {name: true, email: true }} 
                } 
            } 
        } 
    });

    if (!book) {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    return NextResponse.json(book, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(`[ADMIN_GET_BOOK_API_ERROR] BookID: ${params.bookId}`, error);
    return new NextResponse(JSON.stringify({ error: "Erro ao buscar detalhes do livro." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
    let hasChanges = false;

    for (const key in validatedData) {
        if (Object.prototype.hasOwnProperty.call(validatedData, key)) {
            const typedKey = key as keyof typeof validatedData;
            if (validatedData[typedKey] !== undefined) { // Apenas considera campos enviados
                if (typedKey === 'tags' && Array.isArray(validatedData.tags)) {
                    (updatePayload as any)[typedKey] = { set: validatedData.tags };
                } else {
                    (updatePayload as any)[typedKey] = validatedData[typedKey];
                }
                hasChanges = true;
            }
        }
    }
    
    if (Object.prototype.hasOwnProperty.call(validatedData, 'coverImageUrl')) {
        const newUrl = validatedData.coverImageUrl;
        const oldUrl = bookToUpdate.coverImageUrl;
        if (oldUrl && oldUrl !== newUrl && oldUrl.includes("firebasestorage.googleapis.com")) {
            if (newUrl === null || (newUrl && newUrl !== oldUrl)) {
                try {
                    const oldImageRef = ref(storage, oldUrl);
                    await deleteObject(oldImageRef);
                    console.log("Admin: Imagem antiga do Firebase deletada:", oldUrl);
                } catch (e: any) {
                    if (e.code === 'storage/object-not-found') {
                        console.warn("Admin: Imagem antiga não encontrada no Firebase para deleção:", oldUrl);
                    } else {
                        console.error("Admin: Erro ao deletar imagem antiga do Firebase:", e);
                    }
                }
            }
        }
        // Se newUrl é undefined (não foi enviado), não altera coverImageUrl no payload.
        // Se newUrl é null, ele será incluído no payload e setará a imagem para null.
        // Se newUrl é uma string, ele será incluído.
        if (newUrl !== undefined) { // Só adiciona ao payload se foi explicitamente enviado
            updatePayload.coverImageUrl = newUrl;
        }
    }

    if (!hasChanges) {
        return NextResponse.json(bookToUpdate, { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    updatePayload.updatedAt = new Date();
        
    const updatedBook = await db.book.update({
      where: { id: bookId },
      data: updatePayload,
    });

    return NextResponse.json(updatedBook, { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(`[ADMIN_UPDATE_BOOK_API_ERROR] BookID: ${params.bookId}`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('isbn')) { // Exemplo de tratamento de erro de ISBN único
        return new NextResponse(JSON.stringify({ error: "Este ISBN já está em uso por outro livro." }), { status: 409 });
    }
    if (error.code === 'P2025') {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado para atualização." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    return new NextResponse(JSON.stringify({ error: "Erro interno ao atualizar o livro." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// DELETE: Admin exclui um livro
export async function DELETE(
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

    const bookToDelete = await db.book.findUnique({ where: { id: bookId } });
    if (!bookToDelete) {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (bookToDelete.coverImageUrl && bookToDelete.coverImageUrl.includes("firebasestorage.googleapis.com")) {
      try {
        const imageRef = ref(storage, bookToDelete.coverImageUrl);
        await deleteObject(imageRef);
        console.log(`Admin: Imagem ${bookToDelete.coverImageUrl} deletada do Firebase Storage.`);
      } catch (storageError: any) { /* ... (tratamento de erro como antes) ... */ }
    }

    await db.book.delete({ where: { id: bookId } });

    return NextResponse.json({ message: `Livro "${bookToDelete.title}" excluído com sucesso.` }, { headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) { /* ... (tratamento de erro como antes, incluindo P2025 e P2003) ... */ }
}