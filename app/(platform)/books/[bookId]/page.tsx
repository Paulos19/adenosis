// src/app/book/[bookId]/page.tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata, ResolvingMetadata } from 'next';

import { db } from '@/lib/prisma'; // Seu cliente Prisma
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { type BookWithDetails } from '@/components/books/BookCard'; // Reutilize o tipo
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, ShoppingCart, CalendarDays, BookOpen, Tag, Package, Languages, Users } from 'lucide-react';
import { WishlistButton } from '@/components/books/WishlistButton'; // Nosso novo componente cliente

interface BookDetailPageProps {
  params: {
    bookId: string;
  };
}

// Função para buscar dados do livro no servidor
async function getBookDetails(bookId: string): Promise<BookWithDetails | null> {
  try {
    const book = await db.book.findUnique({
      where: { id: bookId },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            storeName: true,
            whatsappNumber: true,
            // user: { select: { name: true } } // Se quiser nome do usuário vendedor
          }
        }
      }
    });
    if (!book) return null;
    // Precisamos garantir que o tipo retornado corresponda a BookWithDetails
    return {
        ...book,
        category: book.category, // Já é o tipo correto ou null
        seller: book.seller ? {
            id: book.seller.id,
            storeName: book.seller.storeName,
            whatsappNumber: book.seller.whatsappNumber
        } : null
    } as BookWithDetails;
  } catch (error) {
    console.error("Erro ao buscar detalhes do livro:", error);
    return null;
  }
}

// Gerar metadados dinâmicos (SEO)
export async function generateMetadata(
  { params }: BookDetailPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const book = await getBookDetails(params.bookId);
  if (!book) {
    return {
      title: 'Livro não encontrado',
    };
  }
  const previousImages = (await parent).openGraph?.images || []
  return {
    title: `${book.title} por ${book.author} | Adenosis Livraria`,
    description: book.description.substring(0, 160), // Pega os primeiros 160 caracteres da descrição
    openGraph: {
      title: book.title,
      description: book.description.substring(0, 160),
      images: book.coverImageUrl ? [{ url: book.coverImageUrl, width: 600, height: 800, alt: book.title }, ...previousImages] : [...previousImages], // Adiciona imagem de capa ao OpenGraph
    },
  };
}


export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const book = await getBookDetails(params.bookId);

  if (!book) {
    notFound(); // Renderiza a página de "Não Encontrado" do Next.js
  }

  const formatCondition = (condition: string) => {
    return condition.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const whatsappLink = book.seller?.whatsappNumber 
    ? `https://wa.me/${book.seller.whatsappNumber}?text=${encodeURIComponent(`Olá, tenho interesse no livro "${book.title}" (${book.id}) que vi na Adenosis Livraria!`)}`
    : "#";

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 md:pt-28"> {/* pt maior para compensar navbar */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {/* Coluna da Imagem */}
          <div className="md:col-span-1">
            <div className="sticky top-24"> {/* Torna a imagem "sticky" ao rolar em telas maiores */}
              <div className="relative aspect-[3/4] w-full max-w-sm mx-auto md:max-w-none rounded-lg overflow-hidden shadow-2xl border-2 border-slate-700">
                <Image
                  src={book.coverImageUrl || "/placeholder-book.png"}
                  alt={`Capa do livro ${book.title}`}
                  layout="fill"
                  objectFit="cover" // Ou "contain" se preferir ver a imagem inteira sem cortes
                  quality={85}
                  priority
                />
              </div>
            </div>
          </div>

          {/* Coluna de Informações */}
          <div className="md:col-span-2 space-y-6">
            <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
              <ol className="flex items-center space-x-2">
                <li><Link href="/books" className="hover:text-emerald-400">Livros</Link></li>
                {book.category && (
                  <>
                    <li><span className="mx-1">/</span></li>
                    <li><Link href={`/books?categoryId=${book.category.id}`} className="hover:text-emerald-400">{book.category.name}</Link></li>
                  </>
                )}
              </ol>
            </nav>

            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">{book.title}</h1>
            <p className="text-xl text-slate-300">por <span className="font-medium text-emerald-400">{book.author}</span></p>
            
            <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="bg-emerald-700/30 text-emerald-300 border-emerald-600 text-sm px-3 py-1">
                    {book.category?.name || "Sem Categoria"}
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300 text-sm px-3 py-1">
                    {formatCondition(book.condition)}
                </Badge>
                {book.stock > 0 && <Badge variant="default" className="bg-green-600 text-white text-sm px-3 py-1">Em Estoque ({book.stock} un.)</Badge>}
                {book.stock === 0 && <Badge variant="destructive" className="text-sm px-3 py-1">Fora de Estoque</Badge>}
            </div>

            <p className="text-3xl font-bold text-emerald-500 mt-2">
              R$ {book.price.toFixed(2).replace(".", ",")}
            </p>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button 
                size="lg" 
                asChild 
                className="bg-green-500 hover:bg-green-600 text-white flex-1 py-3 text-base shadow-md"
                disabled={!book.seller?.whatsappNumber}
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Send className="mr-2 h-5 w-5" /> Contatar Vendedor
                </a>
              </Button>
              <WishlistButton bookId={book.id} />
            </div>
            
            {book.seller && (
                <div className="mt-6 p-4 bg-slate-800/70 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-300">
                        Vendido e entregue por: {' '}
                        <Link href={`/seller/${book.seller.id}`} className="font-semibold text-emerald-400 hover:underline">
                            {book.seller.storeName}
                        </Link>
                    </p>
                    {/* Adicionar mais informações do vendedor se desejar */}
                </div>
            )}

            {/* Descrição do Livro */}
            <div className="pt-6 border-t border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Descrição do Livro</h2>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{book.description}</p>
            </div>

            {/* Detalhes Adicionais */}
            <div className="pt-6 border-t border-slate-700 space-y-4">
              <h2 className="text-xl font-semibold text-white mb-3">Detalhes do Produto</h2>
              <ul className="space-y-2 text-sm">
                {book.isbn && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">ISBN:</strong> <span className="text-slate-200">{book.isbn}</span></li>}
                {book.publisher && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">Editora:</strong> <span className="text-slate-200">{book.publisher}</span></li>}
                {book.publicationYear && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">Ano:</strong> <span className="text-slate-200">{book.publicationYear}</span></li>}
                {book.language && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">Idioma:</strong> <span className="text-slate-200">{book.language}</span></li>}
                {book.pages && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">Páginas:</strong> <span className="text-slate-200">{book.pages}</span></li>}
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}