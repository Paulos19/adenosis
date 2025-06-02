// src/app/api/categories/route.ts
import { NextResponse, NextRequest } from "next/server"; // NextRequest para o GET handler
import { db } from "@/lib/prisma";
import { z } from "zod";

// Função simples para gerar um slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD") // Remove acentos (ex: ç -> c)
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')     // Substitui espaços por hífens
    .replace(/[^\w-]+/g, '')  // Remove caracteres não alfanuméricos (exceto hífen)
    .replace(/--+/g, '-')     // Substitui múltiplos hífens por um único
    .replace(/^-+/, '')       // Remove hífens do início
    .replace(/-+$/, '');      // Remove hífens do fim
}

const createCategoriesSchema = z.object({
  names: z.array(z.string().min(1, "O nome da categoria não pode ser vazio.")).min(1, "Forneça pelo menos um nome de categoria."),
});

// --- GET Handler (existente) ---
export async function GET(req: NextRequest) { // Adicionado NextRequest para consistência
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("[CATEGORIES_GET_API_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ error: "Erro ao buscar categorias." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// --- POST Handler (CORRIGIDO para incluir slug) ---
export async function POST(req: Request) {
  // TODO: Em produção, adicione verificação de role (ex: apenas ADMIN)
  try {
    const body = await req.json();
    const validation = createCategoriesSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Dados inválidos.", details: validation.error.flatten().fieldErrors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { names } = validation.data;
    const createdCategories = [];
    const existingCategoriesMessages = [];
    const failedToCreateMessages = []; // Para slugs duplicados se não forem tratados perfeitamente

    for (const name of names) {
      const normalizedName = name.trim();
      if (!normalizedName) continue;

      const generatedSlug = generateSlug(normalizedName);

      // Verifica se a categoria (por nome ou slug normalizado) já existe
      const existingCategory = await db.category.findFirst({
        where: {
          OR: [
            { name: { equals: normalizedName, mode: 'insensitive' } },
            { slug: generatedSlug } // Slugs devem ser únicos
          ]
        },
      });

      if (existingCategory) {
        existingCategoriesMessages.push(`Categoria "${normalizedName}" (ou slug "${generatedSlug}") já existe.`);
      } else {
        try {
          const newCategory = await db.category.create({
            data: {
              name: normalizedName,
              slug: generatedSlug, // Adicionado o slug
            },
          });
          createdCategories.push(newCategory);
        } catch (createError: any) {
          // Captura erro se, por alguma razão, o slug gerado colidir e a checagem acima falhar (condição de corrida rara sem transação)
          // ou se houver outro erro de constraint.
          console.error(`Falha ao criar categoria "${normalizedName}" com slug "${generatedSlug}":`, createError);
          if (createError.code === 'P2002') { // Código de erro do Prisma para constraint única violada
            failedToCreateMessages.push(`Falha ao criar "${normalizedName}": slug "${generatedSlug}" provavelmente já em uso por outra categoria com nome ligeiramente diferente.`);
          } else {
            failedToCreateMessages.push(`Falha ao criar "${normalizedName}".`);
          }
        }
      }
    }
    
    let message = "Operação de criação de categorias concluída.";
    if (createdCategories.length > 0) {
      message += ` ${createdCategories.length} categoria(s) nova(s) criada(s).`;
    }
    if (existingCategoriesMessages.length > 0) {
      message += ` ${existingCategoriesMessages.join(' ')}`;
    }
     if (failedToCreateMessages.length > 0) {
      message += ` Erros: ${failedToCreateMessages.join(' ')}`;
    }
    if (createdCategories.length === 0 && existingCategoriesMessages.length + failedToCreateMessages.length === names.length && names.length > 0) {
        message = "Nenhuma nova categoria criada (todas já existiam ou falharam na criação)."
    }


    return NextResponse.json({ 
        message,
        created: createdCategories,
        existingInfo: existingCategoriesMessages.length > 0 ? existingCategoriesMessages : undefined,
        errors: failedToCreateMessages.length > 0 ? failedToCreateMessages : undefined
    }, { status: createdCategories.length > 0 ? 201 : 200 });

  } catch (error) {
    console.error("[CATEGORIES_POST_API_ERROR]", error);
    let errorMessage = "Erro interno do servidor ao criar categorias.";
     if (error instanceof z.ZodError) { // Isso não deve acontecer aqui com safeParse, mas por segurança
        errorMessage = "Dados inválidos fornecidos.";
        return new NextResponse(JSON.stringify({ error: errorMessage, details: error.flatten().fieldErrors }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}