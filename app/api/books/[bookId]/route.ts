// src/app/api/books/[bookId]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";
import { z } from "zod";
import { BookCondition } from "@prisma/client";
import { storage } from "@/lib/firebase";
import { deleteObject, ref } from "firebase/storage";

// Schema para validação da atualização (campos são opcionais)
const updateBookSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres.").optional(),
  author: z.string().min(3, "O nome do autor deve ter pelo menos 3 caracteres.").optional(),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres.").max(5000, "Descrição muito longa.").optional(),
  price: z.number().positive("O preço deve ser um valor positivo.").optional(),
  coverImageUrl: z.string().url("URL da imagem de capa inválida.").min(1, "URL da imagem é obrigatória.").optional(), // Ainda string, upload lida com URL
  condition: z.nativeEnum(BookCondition, { errorMap: () => ({ message: "Condição do livro inválida."}) }).optional(),
  stock: z.number().int().min(0, "O estoque não pode ser negativo.").optional(),
  categoryId: z.string().cuid("ID da categoria inválido.").optional(),
  isbn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publicationYear: z.number().int().optional().nullable(),
  language: z.string().optional().nullable(),
  pages: z.number().int().optional().nullable(),
});


// --- GET Handler: Buscar um livro específico ---
export async function GET(
  req: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const { bookId } = params;

    if (!bookId) {
      return new NextResponse(JSON.stringify({ error: "ID do livro não fornecido." }), { status: 400 });
    }

    const book = await db.book.findUnique({
      where: { id: bookId },
      // include: { category: true, seller: { include: { user: true } } }, // Inclua o que for necessário
    });

    if (!book) {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado." }), { status: 404 });
    }

    // Opcional: verificar se o usuário logado (se houver) tem permissão para ver certos detalhes
    // Para um GET público de livro, geralmente não precisa de autenticação, mas
    // se esta rota for SÓ para o vendedor editar, então adicione a verificação de sessão e posse.
    // Assumindo que esta rota GET também pode ser usada para exibir detalhes do livro publicamente,
    // não adicionaremos verificação de posse aqui. Se for apenas para edição, adicione.

    return NextResponse.json(book);

  } catch (error) {
    console.error("[BOOK_GET_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro interno ao buscar o livro." }), { status: 500 });
  }
}


// --- PUT Handler: Atualizar um livro específico ---
export async function PUT(
  req: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { bookId } = params;

    if (!session || !session.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    if (!bookId) {
      return new NextResponse(JSON.stringify({ error: "ID do livro não fornecido." }), { status: 400 });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!sellerProfile) {
      return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 403 });
    }

    const bookToUpdate = await db.book.findUnique({
      where: { id: bookId },
    });

    if (!bookToUpdate) {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado." }), { status: 404 });
    }

    // Verificar posse: o livro pertence ao vendedor logado?
    if (bookToUpdate.sellerId !== sellerProfile.id && session.user.role !== "ADMIN") {
      return new NextResponse(JSON.stringify({ error: "Você não tem permissão para editar este livro." }), { status: 403 });
    }

    const body = await req.json();
    const validation = updateBookSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400 }
      );
    }
    
    const { categoryId, ...updateData } = validation.data;

    // Se categoryId foi fornecido e é diferente, verificar se a nova categoria existe
    if (categoryId && categoryId !== bookToUpdate.categoryId) {
        const categoryExists = await db.category.findUnique({ where: { id: categoryId } });
        if (!categoryExists) {
            return new NextResponse(JSON.stringify({ error: "Nova categoria não encontrada." }), { status: 400 });
        }
    }


    const updatedBook = await db.book.update({
      where: { id: bookId },
      data: {
        ...updateData,
        categoryId: categoryId || bookToUpdate.categoryId, // Mantém a original se não for fornecida nova
        // Outros campos são atualizados se presentes em updateData
      },
    });

    return NextResponse.json(updatedBook);

  } catch (error) {
    console.error("[BOOK_PUT_API_ERROR]", error);
    let errorMessage = "Erro interno ao atualizar o livro.";
    if (error instanceof z.ZodError) {
        errorMessage = "Dados inválidos fornecidos.";
        return new NextResponse(JSON.stringify({ error: errorMessage, details: error.flatten().fieldErrors }), { status: 400 });
    }
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, // req não é usado, mas é necessário para a assinatura
  { params }: { params: { bookId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { bookId } = params;

    if (!session || !session.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    if (!bookId) {
      return new NextResponse(JSON.stringify({ error: "ID do livro não fornecido." }), { status: 400 });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!sellerProfile) {
      // Isso não deveria acontecer se o usuário é um SELLER, mas é uma boa verificação
      return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 403 });
    }

    const bookToDelete = await db.book.findUnique({
      where: { id: bookId },
    });

    if (!bookToDelete) {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado." }), { status: 404 });
    }

    // Verificar posse: o livro pertence ao vendedor logado? (Admin pode excluir qualquer um)
    if (bookToDelete.sellerId !== sellerProfile.id && session.user.role !== "ADMIN") {
      return new NextResponse(JSON.stringify({ error: "Você não tem permissão para excluir este livro." }), { status: 403 });
    }

    // 1. Deletar a imagem de capa do Firebase Storage, se existir
    if (bookToDelete.coverImageUrl) {
      try {
        // Tenta converter a URL de download para uma referência de storage.
        // Isso funciona para URLs no formato gs:// ou https://firebasestorage.googleapis.com/...
        const imageRef = ref(storage, bookToDelete.coverImageUrl);
        await deleteObject(imageRef);
        console.log(`Imagem ${bookToDelete.coverImageUrl} deletada do Firebase Storage.`);
      } catch (storageError: any) {
        // Se o arquivo não existir no Storage (ex: URL inválida ou já deletado), o Firebase lança um erro 'storage/object-not-found'.
        // Podemos optar por ignorar esse erro específico e continuar com a exclusão do livro no DB.
        if (storageError.code === 'storage/object-not-found') {
          console.warn(`Imagem ${bookToDelete.coverImageUrl} não encontrada no Firebase Storage, pode já ter sido deletada.`);
        } else {
          // Para outros erros de storage, pode ser melhor logar e talvez não prosseguir,
          // dependendo da sua política (ex: se o livro não puder existir sem a imagem).
          // Por ora, vamos logar o erro mas continuar com a deleção do DB.
          console.error("Erro ao deletar imagem do Firebase Storage:", storageError);
          // Você pode optar por retornar um erro aqui se a deleção da imagem for crítica:
          // return new NextResponse(JSON.stringify({ error: "Erro ao deletar imagem de capa associada." }), { status: 500 });
        }
      }
    }

    // 2. Deletar o livro do banco de dados
    await db.book.delete({
      where: { id: bookId },
    });

    return NextResponse.json({ message: "Livro excluído com sucesso!" });

  } catch (error) {
    console.error("[BOOK_DELETE_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro interno ao excluir o livro." }), { status: 500 });
  }
}