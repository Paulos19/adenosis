// src/app/api/sellers/route.ts
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { SellerProfile, User } from "@prisma/client"; // Importar tipos

// Tipo para o retorno da API, incluindo a média de avaliação e contagens
export type SellerProfileWithStatsAndAvgRating = SellerProfile & {
  user?: Partial<Pick<User, 'name' | 'image'>>;
  _count: {
    books: number;
    ratingsReceived: number;
  };
  averageRating: number | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "9"); // Ex: 9 vendedores por página para um grid 3x3

  try {
    const sellerProfilesRaw = await db.sellerProfile.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: {
        storeName: 'asc', 
      },
      include: {
        user: { 
          select: {
            // name: true, // O nome da loja é mais relevante aqui
            image: true, // Avatar do usuário, se aplicável à loja
          }
        },
        _count: {
          select: { 
            books: true,
            ratingsReceived: true, 
          },
        },
      },
    });

    // Calcular a média de avaliação para cada vendedor
    const sellersWithAvgRating: SellerProfileWithStatsAndAvgRating[] = await Promise.all(
      sellerProfilesRaw.map(async (profile) => {
        const ratingsAggregation = await db.sellerRating.aggregate({
          _avg: {
            rating: true,
          },
          _count: { // Já temos isso do _count.ratingsReceived, mas para consistência
            rating: true,
          },
          where: {
            sellerProfileId: profile.id,
          },
        });
        return {
          ...profile,
          averageRating: ratingsAggregation._avg.rating,
          // _count.ratingsReceived já vem da query principal e é mais eficiente
        };
      })
    );
    
    const totalSellers = await db.sellerProfile.count();

    return NextResponse.json({
      data: sellersWithAvgRating,
      pagination: {
        totalItems: totalSellers,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalSellers / limit),
      }
    });

  } catch (error) {
    console.error("[SELLERS_GET_API_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro ao buscar vendedores." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}