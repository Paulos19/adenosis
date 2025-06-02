// src/app/api/dashboard/reservations/[reservationId]/cancel/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { reservationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { reservationId } = params;

    if (!session || !session.user?.id || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    if (!reservationId) {
      return new NextResponse(JSON.stringify({ error: "ID da reserva não fornecido." }), { status: 400 });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!sellerProfile) {
      return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 403 });
    }

    const reservationToCancel = await db.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservationToCancel) {
      return new NextResponse(JSON.stringify({ error: "Reserva não encontrada." }), { status: 404 });
    }

    // Verificar posse: a reserva pertence a um livro deste vendedor?
    if (reservationToCancel.sellerProfileId !== sellerProfile.id && session.user.role !== "ADMIN") {
      return new NextResponse(JSON.stringify({ error: "Você não tem permissão para cancelar esta reserva." }), { status: 403 });
    }

    // Não permitir cancelamento se já estiver COMPLETED ou CONFIRMED (a menos que você defina regras diferentes)
    if (reservationToCancel.status === ReservationStatus.COMPLETED || reservationToCancel.status === ReservationStatus.CONFIRMED) {
        return new NextResponse(JSON.stringify({ error: `Não é possível cancelar uma reserva com status ${reservationToCancel.status}.` }), { status: 400 });
    }
    if (reservationToCancel.status === ReservationStatus.CANCELLED) {
        return new NextResponse(JSON.stringify({ error: "Esta reserva já está cancelada." }), { status: 400 });
    }

    const updatedReservation = await db.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    // TODO Opcional: Enviar email/notificação para o CLIENTE informando sobre o cancelamento.

    return NextResponse.json({ message: "Reserva cancelada com sucesso.", reservation: updatedReservation });

  } catch (error) {
    console.error("[RESERVATION_CANCEL_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro interno ao cancelar a reserva." }), { status: 500 });
  }
}