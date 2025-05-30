// src/app/api/categories/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { z } from "zod";
// Opcional: Para proteger a rota no futuro
// import { getServerSession } from "next-auth/next";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Schema para validação do corpo da requisição POST
const createCategoriesSchema = z.object({
  names: z.array(z.string().min(1, "O nome da categoria não pode ser vazio.")).min(1, "Forneça pelo menos um nome de categoria."),
});

// --- GET Handler (para buscar todas as categorias - você já deve ter algo similar) ---
export async function GET() {
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

// --- POST Handler (para criar categorias temporariamente/em lote) ---
export async function POST(req: Request) {
  // TODO: Em produção, adicione verificação de role (ex: apenas ADMIN)
  // const session = await getServerSession(authOptions);
  // if (!session || !session.user || session.user.role !== "ADMIN") {
  //   return new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
  // }

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

    for (const name of names) {
      const normalizedName = name.trim(); // Normaliza o nome (ex: remove espaços extras)
      if (!normalizedName) continue; // Pula nomes vazios após trim

      // Verifica se a categoria já existe (case-insensitive para evitar duplicatas como "ficção" e "Ficção")
      const existingCategory = await db.category.findFirst({
        where: {
          name: {
            equals: normalizedName,
            mode: 'insensitive', // Importante para a checagem case-insensitive
          }
        },
      });

      if (existingCategory) {
        existingCategoriesMessages.push(`Categoria "${normalizedName}" já existe.`);
      } else {
        // Cria a categoria se não existir
        const newCategory = await db.category.create({
          data: {
            name: normalizedName, // Salva o nome normalizado
          },
        });
        createdCategories.push(newCategory);
      }
    }
    
    // Prisma também suporta createMany com skipDuplicates: true se o seu provider de DB suportar
    // e se o campo 'name' tiver um constraint @unique. Exemplo alternativo:
    /*
    const categoriesToCreate = names.map(name => ({ name: name.trim() })).filter(c => c.name);
    if (categoriesToCreate.length > 0) {
      const result = await db.category.createMany({
        data: categoriesToCreate,
        skipDuplicates: true, // Isso previne erro se a categoria já existir (requer Prisma >= 2.27.0 e suporte do DB)
      });
      // A desvantagem é que 'result.count' não diz quais foram criadas vs. puladas.
      // O loop acima dá mais controle e feedback.
    }
    */

    let message = "Operação concluída.";
    if (createdCategories.length > 0) {
      message += ` ${createdCategories.length} categoria(s) criada(s).`;
    }
    if (existingCategoriesMessages.length > 0) {
      message += ` ${existingCategoriesMessages.join(' ')}`;
    }
    if (createdCategories.length === 0 && existingCategoriesMessages.length === names.length) {
        message = "Nenhuma nova categoria criada, todas já existiam."
    }


    return NextResponse.json({ 
        message,
        created: createdCategories,
        existingInfo: existingCategoriesMessages.length > 0 ? existingCategoriesMessages : undefined
    }, { status: createdCategories.length > 0 ? 201 : 200 });

  } catch (error) {
    console.error("[CATEGORIES_POST_API_ERROR]", error);
    let errorMessage = "Erro interno do servidor ao criar categorias.";
     if (error instanceof z.ZodError) {
        errorMessage = "Dados inválidos fornecidos.";
        return new NextResponse(JSON.stringify({ error: errorMessage, details: error.flatten().fieldErrors }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}