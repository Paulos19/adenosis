// src/app/api/dashboard/reservations/[reservationId]/confirm/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";
import { sendMail } from "@/lib/mail"; // Sua função de envio de email
import crypto from "crypto";

export async function PATCH(
  req: NextRequest, // Use NextRequest para tipagem
  context: { params: { reservationId: string } } // Acesse params via context
) {
  // Acesse reservationId do context.params no início da função
  const { reservationId } = context.params;

  if (!reservationId) {
    return new NextResponse(
      JSON.stringify({ error: "ID da reserva não fornecido." }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!sellerProfile) {
      return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Variáveis para coletar dados para o email ANTES da transação (se possível) ou DENTRO e usar DEPOIS
    let customerEmailForNotification: string | null = null;
    let customerNameForNotification: string = "Cliente";
    let bookTitleForNotification: string = "";
    let storeNameForNotification: string = sellerProfile.storeName;
    let generatedCustomerToken: string | null = null;

    // --- Início da Transação Prisma ---
    const updatedReservationFromTx = await db.$transaction(async (prisma) => {
      const reservationToConfirm = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { 
            book: true, // Necessário para verificar estoque e pegar nome do livro
            user: { select: { email: true, name: true } }, // Pegar email e nome do cliente
        },
      });

      if (!reservationToConfirm) {
        throw new Error("RESERVATION_NOT_FOUND");
      }
      if (reservationToConfirm.sellerProfileId !== sellerProfile.id && session.user.role !== "ADMIN") {
        throw new Error("PERMISSION_DENIED");
      }
      if (reservationToConfirm.status !== ReservationStatus.PENDING) {
        throw new Error(`INVALID_STATUS:${reservationToConfirm.status}`);
      }
      if (reservationToConfirm.book.stock <= 0) {
        throw new Error("OUT_OF_STOCK");
      }

      // Coleta informações para o email
      customerEmailForNotification = reservationToConfirm.user.email;
      customerNameForNotification = reservationToConfirm.user.name || "Cliente";
      bookTitleForNotification = reservationToConfirm.book.title;
      
      // 1. Decrementar estoque do livro
      await prisma.book.update({
        where: { id: reservationToConfirm.bookId },
        data: { stock: { decrement: 1 } },
      });

      // 2. Gerar token para confirmação do cliente
      generatedCustomerToken = crypto.randomBytes(32).toString("hex");
      const customerTokenExpires = new Date(Date.now() + 24 * 3 * 3600000); // Token expira em 3 dias

      // 3. Atualizar reserva
      const updatedReservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CONFIRMED,
          // confirmedPurchaseAt: new Date(), // Se você tiver este campo
          customerConfirmationToken: generatedCustomerToken,
          customerConfirmationTokenExpires: customerTokenExpires,
          updatedAt: new Date(),
        },
      });
      return updatedReservation;
    }, {
        maxWait: 8000, // Tempo máximo que o Prisma esperará por uma conexão do pool
        timeout: 10000, // Tempo máximo que a transação interativa pode rodar
    });
    // --- Fim da Transação Prisma ---


    // --- Envio de Email (FORA e APÓS a transação bem-sucedida) ---
    if (customerEmailForNotification && generatedCustomerToken && bookTitleForNotification) {
      const confirmationLink = `${process.env.NEXT_PUBLIC_APP_URL}/confirm-delivery?token=${generatedCustomerToken}`;
      try {
        await sendMail({
          to: customerEmailForNotification,
          subject: `Sua reserva do livro "${bookTitleForNotification}" foi confirmada!`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h1 style="color: #059669;">Reserva Confirmada - ${storeNameForNotification}</h1>
              <p>Olá ${customerNameForNotification},</p>
              <p>Boas notícias! O vendedor da loja <strong>${storeNameForNotification}</strong> confirmou a sua reserva para o livro "<strong>${bookTitleForNotification}</strong>".</p>
              <p>Agora, por favor, após receber/retirar seu livro, clique no link abaixo para confirmar o recebimento e, se desejar, avaliar o vendedor. Este passo é importante para finalizar a transação.</p>
              <a href="${confirmationLink}" target="_blank" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Confirmar Recebimento e Avaliar
              </a>
              <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
              <p><a href="${confirmationLink}" target="_blank">${confirmationLink}</a></p>
              <p>Este link é válido por 72 horas.</p>
              <p>Obrigado por usar a Adenosis Livraria!</p>
              <p>Atenciosamente,<br>Equipe Adenosis Livraria (em nome de ${storeNameForNotification})</p>
            </div>
          `,
        });
        console.log("Email de confirmação para cliente enviado com sucesso para:", customerEmailForNotification);
      } catch (emailError) {
        console.error("Falha ao enviar email de confirmação para o cliente APÓS a transação:", emailError);
        // A transação do banco já foi concluída. Considere logar este erro seriamente
        // e talvez ter um sistema de retry para emails ou notificar um admin.
        // A API ainda retornará sucesso para a operação no banco de dados.
      }
    } else {
        console.warn("Dados insuficientes para notificar o cliente por email após confirmação da reserva ID:", reservationId);
    }

    return NextResponse.json({ 
        message: "Compra confirmada! O cliente será notificado para confirmar o recebimento e avaliar.", 
        reservation: updatedReservationFromTx 
    }, { headers: { 'Content-Type': 'application/json' }});

  } catch (error: any) {
    console.error(`[RESERVATION_CONFIRM_API_ERROR] ID: ${reservationId} - `, error);
    // Tratar erros específicos lançados pela transação
    if (error.message === "RESERVATION_NOT_FOUND") {
        return new NextResponse(JSON.stringify({ error: "Reserva não encontrada." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    if (error.message === "PERMISSION_DENIED") {
        return new NextResponse(JSON.stringify({ error: "Você não tem permissão para confirmar esta reserva." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    if (error.message.startsWith("INVALID_STATUS:")) {
        const status = error.message.split(":")[1];
        return new NextResponse(JSON.stringify({ error: `A reserva já está com status ${status} e não pode ser confirmada.` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (error.message === "OUT_OF_STOCK") {
        return new NextResponse(JSON.stringify({ error: "Livro fora de estoque. Não é possível confirmar a compra." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Tratar erro de timeout da transação do Prisma que você viu (P2028)
    if (error.code === 'P2028' || (error.message && error.message.toLowerCase().includes('transaction api error'))) {
        return new NextResponse(JSON.stringify({ error: "A operação no banco de dados demorou muito e o tempo limite foi excedido. Por favor, tente novamente." }), { status: 504, headers: { 'Content-Type': 'application/json' } }); // Gateway Timeout
    }
    return new NextResponse(JSON.stringify({ error: "Erro interno ao confirmar a compra." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}