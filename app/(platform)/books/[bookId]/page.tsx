// src/app/book/[bookId]/page.tsx
import { notFound } from 'next/navigation';
// Image de next/image não é mais importado diretamente aqui, usamos BookCoverImage
import Link from 'next/link';
import { Metadata, ResolvingMetadata } from 'next';
import { Suspense } from 'react';

import { db } from '@/lib/prisma';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SellerProfile, Category, Book as PrismaBook, User as PrismaUser, BookCondition as PrismaBookCondition } from "@prisma/client";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, Star, CalendarDays, BookOpen as BookIcon, Tag, Package, Languages, Users, Edit, Info, Loader2 } from 'lucide-react';

// Componentes customizados
import { BookCoverImage } from '@/components/books/BookCoverImage'; 
import { ContactSellerReserveButton } from '@/components/books/ContactSellerReserveButton';
import { WishlistButton } from '@/components/books/WishlistButton';
import { cn } from '@/lib/utils'; // Importe cn se ainda não estiver
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Tipo para os detalhes do livro na página
export type BookPageDetailsType = PrismaBook & {
  category: Category | null;
  seller: (Pick<SellerProfile, 'id' | 'storeName' | 'whatsappNumber' | 'userId'> & {
    user?: Pick<PrismaUser, 'name' | 'image'> | null; // Adicionado user para imagem do vendedor
  }) | null;
};

interface BookDetailPageProps {
  params: {
    bookId: string;
  };
}

async function getBookDetails(bookId: string): Promise<BookPageDetailsType | null> {
  try {
    const book = await db.book.findUnique({
      where: { id: bookId, status: 'PUBLISHED' },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            storeName: true,
            whatsappNumber: true,
            userId: true,
            user: { // Incluindo o usuário associado ao perfil do vendedor
              select: {
                name: true,
                image: true, // Avatar do usuário do vendedor
              }
            }
          }
        }
      }
    });
    if (!book) return null;
    return book as BookPageDetailsType;
  } catch (error) {
    console.error(`Erro ao buscar detalhes do livro (${bookId}):`, error);
    return null;
  }
}

export async function generateMetadata(
  { params }: BookDetailPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const book = await getBookDetails(params.bookId);
  if (!book) {
    return {
      title: 'Livro não encontrado | Adenosis Livraria',
    };
  }
  const previousImages = (await parent).openGraph?.images || [];
  return {
    title: `${book.title} por ${book.author} | Adenosis Livraria`,
    description: book.description.substring(0, 160),
    openGraph: {
      title: book.title,
      description: book.description.substring(0, 160),
      images: book.coverImageUrl ? [{ url: book.coverImageUrl, width: 600, height: 800, alt: book.title }, ...previousImages] : [...previousImages],
    },
  };
}

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const book = await getBookDetails(params.bookId);
  const session = await getServerSession(authOptions); // Para o botão de editar do vendedor

  if (!book) {
    notFound(); 
  }

  const formatCondition = (conditionValue: PrismaBookCondition | string) => { // Aceita o enum ou string
    return String(conditionValue).replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 md:pt-28">
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {/* Coluna da Imagem */}
          <div className="md:col-span-1">
            <div className="sticky top-24"> 
              <div className="relative aspect-[210/297] w-full max-w-sm mx-auto md:max-w-none rounded-lg overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-800">
                <BookCoverImage
                  srcProp={book.coverImageUrl} // Use srcProp
                  alt={`Capa do livro ${book.title}`}
                  fill
                  style={{ objectFit: "cover" }} // ou "contain" se preferir
                  quality={85}
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                  className="rounded-lg" // Apenas se o componente interno não aplicar
                  fallbackSrc="/placeholder-book.png"
                />
              </div>
            </div>
          </div>

          {/* Coluna de Informações */}
          <div className="md:col-span-2 space-y-6">
            <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
              <ol className="flex items-center space-x-1">
                <li><Link href="/books" className="hover:text-emerald-400">Livros</Link></li>
                {book.category && (
                  <>
                    <li><span className="mx-1 text-slate-500">/</span></li>
                    <li><Link href={`/books?categoryId=${book.category.id}`} className="hover:text-emerald-400">{book.category.name}</Link></li>
                  </>
                )}
              </ol>
            </nav>

            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white tracking-tight">{book.title}</h1>
            <p className="text-xl lg:text-2xl text-slate-300">
              por <span className="font-medium text-emerald-400">{book.author}</span>
            </p>
            
            <div className="flex flex-wrap items-center gap-3">
                {book.category && (
                    <Badge variant="secondary" className="bg-emerald-700/30 text-emerald-300 border-emerald-600 text-sm px-3 py-1">
                        <Tag className="mr-1.5 h-4 w-4" /> {book.category.name}
                    </Badge>
                )}
                <Badge variant="outline" className="border-slate-600 text-slate-300 text-sm px-3 py-1">
                    <Package className="mr-1.5 h-4 w-4" /> {formatCondition(book.condition)}
                </Badge>
                {book.stock > 0 && <Badge variant="default" className="bg-green-600 text-white text-sm px-3 py-1">Em Estoque ({book.stock} un.)</Badge>}
                {book.stock === 0 && <Badge variant="destructive" className="text-sm px-3 py-1">Fora de Estoque</Badge>}
            </div>

            <p className="text-3xl lg:text-4xl font-bold text-emerald-500 mt-2">
              R$ {book.price.toFixed(2).replace(".", ",")}
            </p>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-slate-700">
              <ContactSellerReserveButton
                bookId={book.id}
                bookTitle={book.title}
                bookStock={book.stock}
                sellerName={book.seller?.storeName}
                sellerWhatsappNumber={book.seller?.whatsappNumber}
                sellerUserId={book.seller?.userId || null}
                className="flex-1 py-3 text-base"
              />
              <Suspense fallback={<Button variant="outline" className="w-full md:w-auto flex-1" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</Button>}>
                <WishlistButton bookId={book.id} />
              </Suspense>
            </div>
            
            {book.seller && (
                <div className="mt-6 p-4 bg-slate-800/70 rounded-lg border border-slate-700 flex items-center space-x-4">
                    {/* Avatar do vendedor/loja */}
                    <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border-2 border-slate-600 bg-slate-700">
                        <BookCoverImage 
                            srcProp={book.seller.user?.image || null} // Assumindo que você adicionou storeLogoUrl ao seller no getBookDetails
                            alt={book.seller.storeName || "Logo da Loja"}
                            fill
                            style={{objectFit: "cover"}}
                            fallbackSrc="/placeholder-store-logo.png" // Um placeholder diferente para logos
                        />
                    </div>
                    <div>
                        <p className="text-sm text-slate-300">Vendido e entregue por:</p>
                        <Link href={`/seller/${book.seller.id}`} className="font-semibold text-lg text-emerald-400 hover:underline">
                            {book.seller.storeName}
                        </Link>
                    </div>
                </div>
            )}

            {/* Descrição do Livro */}
            <div className="pt-6">
              <h2 className="text-xl font-semibold text-white mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-emerald-400"/>Descrição do Livro</h2>
              <div className="prose prose-sm md:prose-base prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                {book.description || "Nenhuma descrição fornecida."}
              </div>
            </div>

            {/* Detalhes Adicionais */}
            {(book.isbn || book.publisher || book.publicationYear || book.language || book.pages) && (
              <div className="pt-6 border-t border-slate-700 space-y-4">
                <h2 className="text-xl font-semibold text-white mb-3 flex items-center"><BookIcon className="mr-2 h-5 w-5 text-emerald-400"/>Detalhes do Produto</h2>
                <ul className="space-y-2 text-sm">
                  {book.isbn && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">ISBN:</strong> <span className="text-slate-200">{book.isbn}</span></li>}
                  {book.publisher && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">Editora:</strong> <span className="text-slate-200">{book.publisher}</span></li>}
                  {book.publicationYear && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">Ano:</strong> <span className="text-slate-200">{book.publicationYear}</span></li>}
                  {book.language && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">Idioma:</strong> <span className="text-slate-200">{book.language}</span></li>}
                  {book.pages && <li className="flex"><strong className="w-32 shrink-0 text-slate-400">Páginas:</strong> <span className="text-slate-200">{book.pages}</span></li>}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}