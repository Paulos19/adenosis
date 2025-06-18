// src/app/api/admin/books/[bookId]/status/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho se necessário
import { db } from "@/lib/prisma";
import { BookStatus } from "@prisma/client";
import { z } from "zod";

// Schema para validar o corpo da requisição PATCH
const changeStatusSchema = z.object({
  status: z.nativeEnum(BookStatus, {
    errorMap: () => ({ message: "Status inválido fornecido. Valores esperados: PUBLISHED, UNPUBLISHED, PENDING_APPROVAL." }),
  }),
});

export async function PATCH(
  req: NextRequest, // Importante usar NextRequest
  { params }: { params: { bookId: string } } // Pegar bookId dos parâmetros da rota
) {
  try {
    const session = await getServerSession(authOptions);
    const { bookId } = params;

    // 1. Autenticação e Autorização do Admin
    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(
        JSON.stringify({ error: "Não autorizado. Acesso restrito ao administrador." }), 
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!bookId) {
      return new NextResponse(
        JSON.stringify({ error: "ID do livro não fornecido na URL." }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validar o corpo da requisição
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new NextResponse(JSON.stringify({ error: "Corpo da requisição JSON inválido." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const validation = changeStatusSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { status: newStatus } = validation.data;

    // 3. Verificar se o livro existe
    const bookToUpdate = await db.book.findUnique({ 
      where: { id: bookId } 
    });

    if (!bookToUpdate) {
      return new NextResponse(
        JSON.stringify({ error: "Livro não encontrado." }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Atualizar o status do livro
    const updatedBook = await db.book.update({
      where: { id: bookId },
      data: {
        status: newStatus,
        updatedAt: new Date(), // Atualiza o timestamp de modificação
      },
    });

    return NextResponse.json(
      { message: `Status do livro '${updatedBook.title}' atualizado para ${newStatus}.`, book: updatedBook },
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[ADMIN_CHANGE_BOOK_STATUS_API_ERROR] BookID: ${params?.bookId || 'N/A'}`, error);
    if (error.code === 'P2025') { // Prisma: Record to update not found
        return new NextResponse(
            JSON.stringify({ error: "Livro não encontrado para atualização de status." }), 
            { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
    }
    return new NextResponse(
      JSON.stringify({ error: "Erro interno ao atualizar status do livro." }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}