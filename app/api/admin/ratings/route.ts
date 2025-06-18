// src/app/api/admin/ratings/route.ts
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

    const whereClause: Prisma.SellerRatingWhereInput = {}; // Filtros podem ser adicionados aqui no futuro

    const ratings = await db.sellerRating.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      include: {
        ratedBy: { select: { id: true, name: true, email: true, image: true } },
        sellerProfile: { select: { id: true, storeName: true } },
      },
    });

    const totalRatings = await db.sellerRating.count({ where: whereClause });

    return NextResponse.json({
      data: ratings,
      pagination: {
        totalItems: totalRatings,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalRatings / limit),
      },
    });

  } catch (error) {
    console.error("[ADMIN_RATINGS_GET_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro ao buscar avaliações." }), { status: 500 });
  }
}
