// src/app/api/confirm-delivery-and-rate/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/prisma";
import { z } from "zod";
import { ReservationStatus, User } from "@prisma/client";

const confirmAndRateSchema = z.object({
  token: z.string().min(1, "Token é obrigatório."),
  rating: z.coerce.number().int().min(1, "Avaliação deve ser no mínimo 1 estrela.").max(5, "Avaliação deve ser no máximo 5 estrelas."),
  comment: z.string().max(1000, "Seu comentário não pode exceder 1000 caracteres.").optional().nullable(),
});

export async function POST(req: NextRequest) {
  let requestToken = null; // Para logar o token em caso de erro
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado. Faça login para continuar." }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }
    const customer = session.user as User & { id: string }; // Assegura que 'id' existe
    const customerId = customer.id;

    const body = await req.json();
    requestToken = body?.token; // Pega o token para log em caso de erro
    const validation = confirmAndRateSchema.safeParse(body);

    if (!validation.success) {
      console.error("Erro de validação Zod:", validation.error.flatten());
      return new NextResponse(
        JSON.stringify({ error: "Dados de avaliação inválidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' }}
      );
    }

    const { token, rating, comment } = validation.data;

    // Iniciar transação Prisma
    const result = await db.$transaction(async (prisma) => {
      const reservation = await prisma.reservation.findUnique({
        where: { customerConfirmationToken: token },
      });

      if (!reservation) {
        console.log(`[CONFIRM_DELIVERY_RATE_API] Nenhuma reserva encontrada para o token: ${token}`);
        throw new Error("TOKEN_INVALID_OR_NOT_FOUND");
      }
      
      console.log(`[CONFIRM_DELIVERY_RATE_API] Reserva encontrada (ID: ${reservation.id}), userId da reserva: ${reservation.userId}, customerId da sessão: ${customerId}`);

      // VERIFICAÇÃO DE PROPRIEDADE DO TOKEN/RESERVA
      if (reservation.userId !== customerId) {
        console.error(`[CONFIRM_DELIVERY_RATE_API] Discrepância de propriedade! Token para userId: ${reservation.userId}, Sessão atual é userId: ${customerId}`);
        throw new Error("TOKEN_OWNERSHIP_MISMATCH");
      }

      if (reservation.customerConfirmationTokenExpires && new Date(reservation.customerConfirmationTokenExpires) < new Date()) {
        await prisma.reservation.update({
            where: { id: reservation.id },
            data: { customerConfirmationToken: null, customerConfirmationTokenExpires: null, status: ReservationStatus.CANCELLED }
        });
        throw new Error("TOKEN_EXPIRED");
      }
      if (reservation.status !== ReservationStatus.CONFIRMED) {
        throw new Error(`RESERVATION_STATUS_INVALID:${reservation.status}`);
      }

      // Criar ou atualizar a avaliação do vendedor
      await prisma.sellerRating.upsert({
        where: { 
            sellerProfileId_ratedById: { 
                sellerProfileId: reservation.sellerProfileId, 
                ratedById: customerId 
            } 
        },
        update: { rating: rating, comment: comment || null, updatedAt: new Date() },
        create: {
          rating: rating,
          comment: comment || null,
          sellerProfileId: reservation.sellerProfileId,
          ratedById: customerId,
        },
      });

      // Atualizar as estatísticas agregadas de avaliação no SellerProfile
      const ratingAggregation = await prisma.sellerRating.aggregate({
        where: { sellerProfileId: reservation.sellerProfileId },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await prisma.sellerProfile.update({
        where: { id: reservation.sellerProfileId },
        data: {
          averageRating: ratingAggregation._avg.rating,
          totalRatings: ratingAggregation._count.rating,
          updatedAt: new Date(),
        },
      });

      // Atualizar o status da reserva e limpar o token
      const updatedReservation = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: ReservationStatus.COMPLETED,
          deliveryConfirmedAt: new Date(),
          customerConfirmationToken: null, 
          customerConfirmationTokenExpires: null,
          updatedAt: new Date(),
        },
      });
      return updatedReservation;
    }, {
        maxWait: 8000, 
        timeout: 10000,
    });

    return NextResponse.json({ 
        message: "Entrega confirmada e avaliação registrada com sucesso!", 
        reservation: result 
    }, { headers: { 'Content-Type': 'application/json' }});

  } catch (error: any) {
    // Log aprimorado para incluir o token se disponível no corpo da requisição
    console.error(`[CONFIRM_DELIVERY_RATE_API_ERROR] - Token (do body): ${requestToken || 'N/A'}`, error);

    let statusCode = 500;
    let errorMessage = "Erro interno ao processar sua confirmação e avaliação.";

    if (error.message === "TOKEN_INVALID_OR_NOT_FOUND") { statusCode = 404; errorMessage = "Token de confirmação inválido ou não encontrado."; }
    else if (error.message === "TOKEN_OWNERSHIP_MISMATCH") { statusCode = 403; errorMessage = "Este link de confirmação não é válido para a sua conta."; } // Mensagem mais clara e status 403
    else if (error.message === "TOKEN_EXPIRED") { statusCode = 400; errorMessage = "Token de confirmação expirado. Contate o vendedor."; }
    else if (error.message.startsWith("RESERVATION_STATUS_INVALID:")) {
        const status = error.message.split(":")[1];
        statusCode = 400; errorMessage = `Esta reserva não está mais aguardando confirmação (status: ${status}).`;
    }
    else if (error.code === 'P2002' && error.meta?.target?.includes('sellerProfileId_ratedById')) {
        statusCode = 409; errorMessage = "Você já enviou uma avaliação para este vendedor referente a uma transação anterior.";
    }
    else if (error.code === 'P2028' || (error.message && error.message.toLowerCase().includes('transaction api error'))) {
        statusCode = 504; errorMessage = "A operação demorou muito. Tente novamente.";
    }
    
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
  }
}