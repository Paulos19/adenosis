// src/app/api/admin/users/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";
import { User, SellerProfile, Role } from "@prisma/client";

// Tipo para o retorno da API, combinando User e SellerProfile (opcional)
export type UserWithProfile = User & {
  sellerProfile: SellerProfile | null;
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Validação de Admin Supremo pelo email
    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado. Acesso restrito ao administrador." }), { 
        status: 403, // Forbidden
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10"); // 10 usuários por página
    const searchQuery = searchParams.get("q")?.trim();
    const roleFilter = searchParams.get("role") as Role | undefined;

    const whereClause: any = {};
    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
        { sellerProfile: { storeName: { contains: searchQuery, mode: 'insensitive' } } },
      ];
    }
    if (roleFilter && Object.values(Role).includes(roleFilter)) {
        whereClause.role = roleFilter;
    }


    const users = await db.user.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: {
        createdAt: 'desc', // Ou por nome, email, etc.
      },
      include: {
        sellerProfile: true, // Inclui o perfil de vendedor se existir
      },
    });

    const totalUsers = await db.user.count({ where: whereClause });

    return NextResponse.json({
      data: users,
      pagination: {
        totalItems: totalUsers,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalUsers / limit),
      }
    }, { headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("[ADMIN_USERS_GET_API_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro interno ao buscar usuários." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}