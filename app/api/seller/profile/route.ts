// src/app/api/seller/profile/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho se necessário
import { db } from "@/lib/prisma";
import { z } from "zod";

// Função auxiliar para limpar e formatar o número do WhatsApp
const formatWhatsappNumber = (number: string): string | null => {
  if (!number) return null;
  // Remove todos os caracteres que não são dígitos
  const cleaned = number.replace(/\D/g, "");

  // Se o número começar com 55 e tiver 12 ou 13 dígitos (DDI + DDD + número), está ok.
  if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) {
    return cleaned;
  }
  // Se não começar com 55, mas tiver 10 ou 11 dígitos (DDD + número), adicionamos o DDI 55.
  else if (!cleaned.startsWith("55") && (cleaned.length === 10 || cleaned.length === 11)) {
    return `55${cleaned}`;
  }
  // Retorna nulo se o formato for irreconhecível após a limpeza
  return null; 
};


// Schema Zod para validação dos dados de atualização do perfil da loja
const updateSellerProfileSchema = z.object({
  storeName: z
    .string({ required_error: "O nome da loja é obrigatório." })
    .min(3, "O nome da loja deve ter pelo menos 3 caracteres.")
    .max(100, "Nome da loja muito longo (máximo 100 caracteres)."),
  storeDescription: z
    .string()
    .max(5000, "Descrição da loja muito longa (máximo de 5000 caracteres).")
    .optional()
    .nullable(),
  // Regex mais permissivo: verifica se há pelo menos 10 dígitos (considerando DDD+número), permitindo alguns caracteres especiais.
  // A formatação final para o padrão '55...' será feita no backend.
  whatsappNumber: z
    .string({ required_error: "O número do WhatsApp é obrigatório." })
    .regex(/^[\s()+-]*([0-9][\s()+-]*){10,15}$/, "Formato de WhatsApp inválido. Inclua DDI e DDD.") 
    .min(10, "Número de WhatsApp muito curto."),
  storeLogoUrl: z
    .string()
    .url("URL do logo inválida.")
    .optional()
    .nullable(), // Campo para a URL do logo da loja
});

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!sellerProfile) {
      return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const validation = updateSellerProfileSchema.safeParse(body);

    if (!validation.success) {
      console.error("Falha na validação Zod:", validation.error.flatten());
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos fornecidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { storeName, storeDescription, whatsappNumber, storeLogoUrl } = validation.data;

    const formattedWhatsapp = formatWhatsappNumber(whatsappNumber);
    if (!formattedWhatsapp) {
        return new NextResponse(
            JSON.stringify({ error: "Número de WhatsApp inválido para formatação. Verifique o DDI e DDD." }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const dataToUpdate: any = {
        storeName,
        storeDescription: storeDescription === undefined ? sellerProfile.storeDescription : (storeDescription || null),
        whatsappNumber: formattedWhatsapp,
    };

    if (Object.prototype.hasOwnProperty.call(validation.data, 'storeLogoUrl')) {
        dataToUpdate.storeLogoUrl = storeLogoUrl;
    }

    const updatedProfile = await db.sellerProfile.update({
      where: { id: sellerProfile.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedProfile, { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[SELLER_PROFILE_PUT_API_ERROR]", error);
    return new NextResponse(
        JSON.stringify({ error: "Erro interno ao atualizar o perfil da loja." }), 
        { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
}

// GET handler (sem alterações)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.id) {
            return new NextResponse(JSON.stringify({ error: "Não autorizado." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        const sellerProfile = await db.sellerProfile.findUnique({
            where: { userId: session.user.id },
        });
        if (!sellerProfile) {
            return new NextResponse(JSON.stringify({ error: "Perfil de vendedor não encontrado." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        return NextResponse.json(sellerProfile, { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error("[SELLER_PROFILE_GET_API_ERROR]", error);
        return new NextResponse(JSON.stringify({ error: "Erro interno ao buscar o perfil da loja." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
