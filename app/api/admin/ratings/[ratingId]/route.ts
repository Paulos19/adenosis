// src/app/api/admin/ratings/[ratingId]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { ratingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { ratingId } = params;

    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 403 });
    }

    const ratingToDelete = await db.sellerRating.findUnique({
      where: { id: ratingId },
    });

    if (!ratingToDelete) {
      return new NextResponse(JSON.stringify({ error: "Avaliação não encontrada." }), { status: 404 });
    }

    // Transação para deletar a avaliação e recalcular a média do vendedor
    await db.$transaction(async (prisma) => {
      // 1. Deletar a avaliação
      await prisma.sellerRating.delete({
        where: { id: ratingId },
      });

      // 2. Recalcular a média e contagem de avaliações para o vendedor afetado
      const sellerProfileId = ratingToDelete.sellerProfileId;
      const remainingRatings = await prisma.sellerRating.aggregate({
        where: { sellerProfileId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      // 3. Atualizar o perfil do vendedor
      await prisma.sellerProfile.update({
        where: { id: sellerProfileId },
        data: {
          averageRating: remainingRatings._avg.rating,
          totalRatings: remainingRatings._count.rating,
        },
      });
    });

    return NextResponse.json({ message: "Avaliação excluída com sucesso e média recalculada." });

  } catch (error) {
    console.error("[ADMIN_RATING_DELETE_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro ao excluir avaliação." }), { status: 500 });
  }
}
