// src/app/categories/page.tsx
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { db } from '@/lib/prisma';
import { Category } from '@prisma/client';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ListTree, ChevronRight } from 'lucide-react'; // Ícones

// Função para buscar as categorias no servidor
async function getCategories(): Promise<Category[]> {
  try {
    const categories = await db.category.findMany({
      orderBy: {
        name: 'asc', // Ordena alfabeticamente
      },
      // Futuramente, você pode querer adicionar uma contagem de livros por categoria:
      // include: {
      //   _count: {
      //     select: { books: true },
      //   },
      // },
    });
    return categories;
  } catch (error) {
    console.error("Falha ao buscar categorias para a página:", error);
    return []; // Retorna array vazio em caso de erro
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 md:pt-28"> {/* Padding para compensar Navbar */}
        <div className="text-center mb-12 md:mb-16">
          <ListTree className="mx-auto h-16 w-16 text-emerald-400 mb-4 animate-pulse" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">
            Explore Nossas <span className="text-emerald-400">Categorias</span>
          </h1>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
            Encontre livros organizados por seus gêneros e temas favoritos.
          </p>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link 
                key={category.id} 
                href={`/books?categoryId=${category.id}`} // Link para a página de livros filtrada
                passHref
                className="group block"
              >
                <Card className="bg-slate-800/70 border-slate-700 hover:border-emerald-500/70 hover:shadow-xl hover:shadow-emerald-500/15 transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full flex flex-col">
                  <CardHeader className="flex-grow">
                    <CardTitle className="text-xl font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                      {category.name}
                    </CardTitle>
                    {/* Você poderia adicionar uma descrição da categoria ou contagem de livros aqui se tivesse */}
                    {/* Exemplo: <CardDescription className="text-sm text-slate-400 mt-1">
                      {category._count?.books || 0} livros
                    </CardDescription> */}
                  </CardHeader>
                  <div className="p-4 pt-0 text-right">
                    <ChevronRight className="inline h-5 w-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-800/50 rounded-lg">
            <ListTree className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <p className="text-xl text-slate-400">Nenhuma categoria encontrada no momento.</p>
            <p className="mt-2 text-slate-500">Por favor, verifique novamente mais tarde.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}