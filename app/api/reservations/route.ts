// src/app/api/reservations/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/prisma";
import { z } from "zod";
import { sendMail } from "@/lib/mail";
import { User } from "@prisma/client"; // Importe o tipo User

const createReservationSchema = z.object({
  bookId: z.string().cuid("ID do livro inválido."),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id || !session.user.email) { // Garante que temos o email do usuário para notificação
      return new NextResponse(JSON.stringify({ error: "Não autorizado. Faça login para reservar." }), { status: 401 });
    }

    const body = await req.json();
    const validation = createReservationSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400 }
      );
    }

    const { bookId } = validation.data;
    const customer = session.user as User & { id: string; email: string; name?: string | null }; // Cast para ter acesso ao name

    // 1. Verificar se o livro existe e tem estoque
    const book = await db.book.findUnique({
      where: { id: bookId },
      include: { 
        seller: { // Para pegar o ID do SellerProfile e o email do vendedor
            include: {
                user: {
                    select: { email: true, name: true }
                }
            }
        } 
      },
    });

    if (!book) {
      return new NextResponse(JSON.stringify({ error: "Livro não encontrado." }), { status: 404 });
    }
    if (book.stock <= 0) {
      return new NextResponse(JSON.stringify({ error: "Livro fora de estoque." }), { status: 400 });
    }
    if (!book.seller || !book.seller.user?.email) {
        return new NextResponse(JSON.stringify({ error: "Informações do vendedor incompletas para este livro." }), { status: 500 });
    }

    // 2. Verificar se o cliente não é o próprio vendedor do livro
    if (book.seller.userId === customer.id) {
        return new NextResponse(JSON.stringify({ error: "Você não pode reservar seus próprios livros." }), { status: 403 });
    }

    // 3. Criar a reserva
    const reservation = await db.reservation.create({
      data: {
        bookId: book.id,
        userId: customer.id,
        sellerProfileId: book.sellerId, // sellerId no Book é o SellerProfile ID
        status: "PENDING",
      },
    });

    // 4. Enviar email para o VENDEDOR
    const sellerEmail = book.seller.user.email;
    const sellerName = book.seller.user.name || "Vendedor(a)";
    const customerName = customer.name || "Um cliente";
    const customerEmail = customer.email; // Email do cliente para o vendedor contatar

    await sendMail({
      to: sellerEmail,
      subject: `Nova Reserva para o Livro: ${book.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #059669;">Nova Reserva na Adenosis Livraria!</h1>
          <p>Olá ${sellerName},</p>
          <p>Você recebeu uma nova reserva para o livro "<strong>${book.title}</strong>".</p>
          <p><strong>Detalhes da Reserva:</strong></p>
          <ul>
            <li><strong>Livro:</strong> ${book.title}</li>
            <li><strong>Autor:</strong> ${book.author}</li>
            <li><strong>Cliente:</strong> ${customerName}</li>
            <li><strong>Email do Cliente:</strong> ${customerEmail}</li>
            <li><strong>Data da Reserva:</strong> ${new Date(reservation.createdAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</li>
          </ul>
          <p>Esta reserva já consta no seu painel de controle em "Livros Reservados". Por favor, entre em contato com o cliente para combinar os próximos passos.</p>
          <p>Para gerenciar suas reservas, acesse seu dashboard:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations" target="_blank" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Ir para o Dashboard
          </a>
          <p>Atenciosamente,<br>Equipe Adenosis Livraria</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "Reserva criada e vendedor notificado.", reservationId: reservation.id }, { status: 201 });

  } catch (error) {
    console.error("[RESERVATIONS_POST_API_ERROR]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ error: "Dados inválidos.", details: error.flatten().fieldErrors }), { status: 400 });
    }
    // Tratar erro de constraint única (ex: cliente já reservou este livro e ainda está pendente)
    if (error instanceof Error && (error as any).code === 'P2002') { // Código de erro do Prisma para constraint única
        return new NextResponse(JSON.stringify({ error: "Você já possui uma reserva pendente para este livro." }), { status: 409 });
    }
    return new NextResponse(JSON.stringify({ error: "Erro ao processar a reserva." }), { status: 500 });
  }
}