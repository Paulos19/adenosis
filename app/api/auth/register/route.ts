// src/app/api/auth/register/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from 'crypto'; // Para gerar tokens seguros
import { db } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { sendMail } from "@/lib/mail";

// Função auxiliar para limpar e formatar o número do WhatsApp
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password, role, storeName, whatsappNumber } = body;

    // Validação básica dos dados de entrada
    if (!email || !name || !password || !role) {
      return new NextResponse(
        JSON.stringify({ error: "Email, nome, senha e tipo de conta são obrigatórios" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (role !== Role.USER && role !== Role.SELLER) {
      return new NextResponse(
        JSON.stringify({ error: "Tipo de conta inválido. Deve ser USER ou SELLER" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário já existe
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }, // Salvar e buscar email em minúsculas
    });

    if (existingUser) {
      return new NextResponse(
        JSON.stringify({ error: "Este email já está em uso" }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Preparar dados do usuário
    const userData: Parameters<typeof db.user.create>[0]['data'] = {
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      role: role as Role,
      // emailVerified será definido após a verificação
    };

    // Se for VENDEDOR, adicionar perfil e validar campos específicos
    if (role === Role.SELLER) {
      if (!storeName || !whatsappNumber) {
        return new NextResponse(
          JSON.stringify({ error: "Nome da loja e WhatsApp são obrigatórios para vendedores" }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const formattedWhatsapp = formatWhatsappNumber(whatsappNumber);
      if (!formattedWhatsapp) {
        return new NextResponse(
          JSON.stringify({ error: "Número de WhatsApp inválido. Use o formato completo com DDI e DDD (ex: +55 11 99999-9999)." }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      userData.sellerProfile = {
        create: {
          storeName,
          whatsappNumber: formattedWhatsapp,
          storeDescription: `Bem-vindo à livraria ${storeName}! Seu espaço de livros e conhecimento.`,
        },
      };
    }

    // Criar o usuário (e o perfil de vendedor, se aplicável)
    const user = await db.user.create({
      data: userData,
      include: {
        sellerProfile: role === Role.SELLER,
      },
    });

    // Gerar token de verificação de email
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 3600000 * 24); // Token expira em 24 horas

    await db.verificationToken.create({
      data: {
        identifier: user.id,
        token: verificationToken,
        expires: tokenExpires,
      },
    });

    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

    // Enviar email de verificação
    await sendMail({
      to: user.email!, // user.email não será null aqui
      subject: "Verifique seu endereço de email - Adenosis Livraria",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1 style="color: #059669;">Bem-vindo(a) à Adenosis Livraria!</h1>
          <p>Olá ${user.name},</p>
          <p>Obrigado por se registrar. Por favor, clique no botão abaixo para verificar seu endereço de email e ativar sua conta:</p>
          <a href="${verificationLink}" target="_blank" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verificar Email Agora</a>
          <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
          <p><a href="${verificationLink}" target="_blank">${verificationLink}</a></p>
          <p>Este link é válido por 24 horas. Se você não se registrou, por favor, ignore este email.</p>
          <p>Atenciosamente,<br>Equipe Adenosis Livraria</p>
        </div>
      `,
    });

    // Remover a senha do objeto retornado ao cliente
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error("[REGISTER_API_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro interno do servidor ao tentar registrar." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}