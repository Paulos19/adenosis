// src/app/api/admin/orders/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const whereClause: Prisma.ReservationWhereInput = {}; // Filtros podem ser adicionados aqui

    const reservations = await db.reservation.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      include: {
        book: { select: { id: true, title: true, coverImageUrl: true } },
        user: { select: { id: true, name: true, email: true } },
        sellerProfile: { select: { id: true, storeName: true } },
      },
    });

    const totalReservations = await db.reservation.count({ where: whereClause });

    return NextResponse.json({
      data: reservations,
      pagination: {
        totalItems: totalReservations,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalReservations / limit),
      },
    });

  } catch (error) {
    console.error("[ADMIN_ORDERS_GET_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro ao buscar pedidos e reservas." }), { status: 500 });
  }
}
