// src/app/api/dashboard/reservations/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    // Encontrar o SellerProfile associado ao userId da sessão
    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!sellerProfile) {
      return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 404 });
    }

    // Buscar todas as reservas para este vendedor
    // TODO: Adicionar paginação no futuro se a lista puder ser muito grande
    const reservations = await db.reservation.findMany({
      where: { sellerProfileId: sellerProfile.id },
      include: {
        book: { // Detalhes do livro
          select: { id: true, title: true, coverImageUrl: true, price: true }
        },
        user: { // Detalhes do cliente (usuário que fez a reserva)
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc', // Mais recentes primeiro
      },
    });

    return NextResponse.json(reservations);

  } catch (error) {
    console.error("[DASHBOARD_RESERVATIONS_GET_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro ao buscar reservas." }), { status: 500 });
  }
}