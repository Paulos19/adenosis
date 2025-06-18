// src/app/api/books/batch-import/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/prisma';
import { z } from 'zod';
import { BookCondition, Prisma } from '@prisma/client';

// Schema de validação para cada linha
const bookImportSchema = z.object({
  title: z.string({ required_error: "Título é obrigatório." }).min(3, "Título muito curto."),
  author: z.string({ required_error: "Autor é obrigatório." }).min(3, "Autor muito curto."),
  price: z.coerce.number({ invalid_type_error: "Preço inválido." }).positive("Preço deve ser maior que zero."),
  condition: z.nativeEnum(BookCondition, { errorMap: () => ({ message: "Condição inválida. Use um dos seguintes: NEW, USED_LIKE_NEW, USED_GOOD, USED_FAIR" }) }),
  categoryName: z.string({ required_error: "Nome da categoria é obrigatório." }).min(2, "Nome de categoria muito curto."),
  description: z.string().max(5000).optional().nullable(),
  stock: z.coerce.number().int().min(0).optional().default(1),
  coverImageUrl: z.string().url("URL da imagem inválida.").optional().nullable(),
  isbn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publicationYear: z.coerce.number().int().optional().nullable(),
  language: z.string().optional().nullable(),
  pages: z.coerce.number().int().positive().optional().nullable(),
});

type BookImportPayload = {
    books: z.infer<typeof bookImportSchema>[];
};

// --- HELPERS PARA TRANSFORMAÇÃO DE DADOS ---
const normalizePrice = (price: any): number | undefined => {
    if (typeof price === 'number') return price;
    if (typeof price !== 'string') return undefined;
    const cleanedPrice = price.replace("R$", "").replace(".", "").replace(",", ".").trim();
    const number = parseFloat(cleanedPrice);
    return isNaN(number) ? undefined : number;
}

const normalizeCondition = (condition: any): BookCondition | undefined => {
    if (typeof condition !== 'string') return undefined;
    const lowerCaseCondition = condition.toLowerCase().trim();
    const map: Record<string, BookCondition> = {
        'novo': BookCondition.NEW,
        'new': BookCondition.NEW,
        'usado - como novo': BookCondition.USED_LIKE_NEW,
        'usado como novo': BookCondition.USED_LIKE_NEW,
        'usado': BookCondition.USED_GOOD,
        'usado - bom': BookCondition.USED_GOOD,
        'usado bom': BookCondition.USED_GOOD,
        'usado - razoável': BookCondition.USED_FAIR,
        'usado razoavel': BookCondition.USED_FAIR,
    };
    return map[lowerCaseCondition] || condition as BookCondition;
}


export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || (session.user.role !== 'SELLER' && session.user.role !== 'ADMIN')) {
            return new NextResponse(JSON.stringify({ error: 'Não autorizado.' }), { status: 401 });
        }

        const sellerProfile = await db.sellerProfile.findUnique({ where: { userId: session.user.id } });
        if (!sellerProfile) {
            return new NextResponse(JSON.stringify({ error: 'Perfil de vendedor não encontrado.' }), { status: 404 });
        }

        const body = await req.json();
        const { books: booksToImport }: BookImportPayload = body;

        if (!Array.isArray(booksToImport) || booksToImport.length === 0) {
            return new NextResponse(JSON.stringify({ error: 'Nenhum livro para importar.' }), { status: 400 });
        }

        // Otimização: buscar e criar categorias em lote
        const categoryNames = [...new Set(booksToImport.map(b => b.categoryName).filter(Boolean) as string[])];
        const existingCategories = await db.category.findMany({
            where: { name: { in: categoryNames, mode: 'insensitive' } }
        });
        const existingCategoriesMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));

        const newCategoryNames = categoryNames.filter(name => !existingCategoriesMap.has(name.toLowerCase()));
        if (newCategoryNames.length > 0) {
            await db.category.createMany({
                data: newCategoryNames.map(name => ({
                    name,
                    slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
                })),
                skipDuplicates: true,
            });
            const newlyCreatedCategories = await db.category.findMany({
                where: { name: { in: newCategoryNames } }
            });
            newlyCreatedCategories.forEach(c => existingCategoriesMap.set(c.name.toLowerCase(), c.id));
        }

        const booksToCreateData: Prisma.BookCreateManyInput[] = [];
        const errors = [];

        for (const [index, bookData] of booksToImport.entries()) {
            try {
                const transformedData = {
                    ...bookData,
                    price: normalizePrice(bookData.price),
                    condition: normalizeCondition(bookData.condition)
                };
                const validatedData = bookImportSchema.parse(transformedData);
                const { categoryName, ...restOfBookData } = validatedData;
                
                const categoryId = existingCategoriesMap.get(categoryName.toLowerCase());
                if (!categoryId) {
                    throw new Error(`A categoria "${categoryName}" não pôde ser encontrada ou criada.`);
                }
                
                booksToCreateData.push({
                    ...restOfBookData,
                    description: restOfBookData.description ?? "", 
                    // CORREÇÃO: Usar o caminho estático para a imagem padrão
                    coverImageUrl: restOfBookData.coverImageUrl || "/cover.jpg",
                    isbn: restOfBookData.isbn ?? null,
                    publisher: restOfBookData.publisher ?? null,
                    publicationYear: restOfBookData.publicationYear ?? null,
                    language: restOfBookData.language ?? null,
                    pages: restOfBookData.pages ?? null,
                    categoryId: categoryId,
                    sellerId: sellerProfile.id,
                    status: 'PUBLISHED'
                });

            } catch (error) {
                let errorMessage = "Erro desconhecido.";
                if (error instanceof z.ZodError) {
                    errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
                } else if (error instanceof Error) { errorMessage = error.message; }
                errors.push({ row: index, data: bookData, message: errorMessage });
            }
        }

        let successCount = 0;
        if (booksToCreateData.length > 0) {
            const result = await db.book.createMany({
                data: booksToCreateData,
                skipDuplicates: true,
            });
            successCount = result.count;
        }
        
        return NextResponse.json({
            successCount: successCount,
            errorCount: errors.length,
            errors: errors,
        });

    } catch (error) {
        console.error('[BATCH_IMPORT_API_ERROR]', error);
        return new NextResponse(JSON.stringify({ error: 'Erro interno no servidor durante a importação.' }), { status: 500 });
    }
}
