// src/app/api/seller/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import { db } from "@/lib/prisma";
import { z } from "zod";

// Schema Zod para validação dos dados de atualização do perfil da loja
const updateSellerProfileSchema = z.object({
  storeName: z.string().min(3, "O nome da loja deve ter pelo menos 3 caracteres.").max(100, "Nome da loja muito longo."),
  storeDescription: z.string().max(1000, "Descrição da loja muito longa.").optional().nullable(),
  whatsappNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Número de WhatsApp inválido. Inclua DDI e DDD, apenas números após o '+' se houver.").min(10, "Número de WhatsApp muito curto."), // Regex simples para DDI+DDD+Número
});

// Função auxiliar para formatar o número do WhatsApp (reutilizada do registro)
const formatWhatsappNumber = (number: string): string | null => {
    if (!number) return null;
    let cleaned = number.replace(/\D/g, "");
    if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) {
      return cleaned;
    } else if (!cleaned.startsWith("55") && (cleaned.length === 10 || cleaned.length === 11)) {
      return `55${cleaned}`;
    }
    return null;
};

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!sellerProfile) {
      return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 404 });
    }

    const body = await req.json();
    const validation = updateSellerProfileSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { storeName, storeDescription, whatsappNumber } = validation.data;

    const formattedWhatsapp = formatWhatsappNumber(whatsappNumber);
    if (!formattedWhatsapp) {
        return new NextResponse(
            JSON.stringify({ error: "Número de WhatsApp inválido para formatação." }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const updatedProfile = await db.sellerProfile.update({
      where: { id: sellerProfile.id },
      data: {
        storeName,
        storeDescription: storeDescription || "", // Garante que não seja null se opcional e não enviado
        whatsappNumber: formattedWhatsapp,
      },
    });

    return NextResponse.json(updatedProfile);

  } catch (error) {
    console.error("[SELLER_PROFILE_PUT_API_ERROR]", error);
    let errorMessage = "Erro interno ao atualizar o perfil da loja.";
    if (error instanceof z.ZodError) {
        errorMessage = "Dados inválidos fornecidos.";
        return new NextResponse(JSON.stringify({ error: errorMessage, details: error.flatten().fieldErrors }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }
    return new NextResponse(
        JSON.stringify({ error: errorMessage }), 
        { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
}

// Opcional: Adicionar um GET handler para buscar o perfil do vendedor logado,
// embora a página de configurações possa buscar isso via getServerSession e uma query direta.
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
        }

        const sellerProfile = await db.sellerProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!sellerProfile) {
            return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 404 });
        }
        return NextResponse.json(sellerProfile);

    } catch (error) {
        console.error("[SELLER_PROFILE_GET_API_ERROR]", error);
        return new NextResponse(JSON.stringify({ error: "Erro interno ao buscar o perfil da loja." }), { status: 500 });
    }
}