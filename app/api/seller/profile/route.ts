// src/app/api/seller/profile/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho se necessário
import { db } from "@/lib/prisma";
import { z } from "zod";

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
  whatsappNumber: z
    .string({ required_error: "O número do WhatsApp é obrigatório." })
    // Regex um pouco mais flexível para aceitar formatos comuns, a limpeza ocorre depois
    .regex(/^(\+55\s?)?(\(?[1-9]{2}\)?\s?)?(9?\d{4,5})-?(\d{4})$/, "Formato de WhatsApp inválido. Ex: +55 (11) 98765-4321") 
    .min(10, "Número de WhatsApp muito curto."),
  storeLogoUrl: z
    .string()
    .url("URL do logo inválida.")
    .optional()
    .nullable(), // Campo para a URL do logo da loja
});

// Função auxiliar para formatar o número do WhatsApp
const formatWhatsappNumber = (number: string): string | null => {
  if (!number) return null;
  let cleaned = number.replace(/\D/g, ""); // Remove todos os caracteres não numéricos

  // Caso 1: Já tem DDI 55 e tem tamanho correto (12 ou 13 dígitos)
  if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) {
    return cleaned;
  } 
  // Caso 2: Não tem DDI 55, mas tem DDD + número (10 ou 11 dígitos)
  // Adiciona DDI 55 se for um formato comum brasileiro
  else if (!cleaned.startsWith("55") && (cleaned.length === 10 || cleaned.length === 11)) {
    const ddd = cleaned.substring(0, 2);
    const restOfNumber = cleaned.substring(2);
    // Celular (9 dígitos após DDD) ou Fixo (8 dígitos após DDD)
    if ((restOfNumber.length === 9 && restOfNumber.startsWith('9')) || restOfNumber.length === 8) {
        return `55${cleaned}`;
    }
  }
  return null; // Formato não reconhecido após tentativa de limpeza
};

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
    if (!formattedWhatsapp) { // Se, mesmo após o regex do Zod, a formatação falhar
        return new NextResponse(
            JSON.stringify({ error: "Número de WhatsApp inválido para formatação final. Verifique o DDI e DDD." }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const dataToUpdate: any = { // Usar 'any' ou um tipo mais específico
        storeName,
        storeDescription: storeDescription === undefined ? sellerProfile.storeDescription : (storeDescription || null), // Mantém o antigo se undefined, "" se vazio, null se null
        whatsappNumber: formattedWhatsapp,
    };

    // Só atualiza storeLogoUrl se a chave existir em validation.data
    // Se for enviado { storeLogoUrl: null }, ele será setado para null.
    // Se a chave storeLogoUrl não for enviada, o valor no banco não é alterado.
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

// GET handler (existente)
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