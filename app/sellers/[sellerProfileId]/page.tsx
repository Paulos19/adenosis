// src/app/seller/[sellerProfileId]/page.tsx
import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata, ResolvingMetadata } from 'next';

import { db } from '@/lib/prisma';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BookCard, type BookWithDetails } from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import { Star, MessageCircle, Send, MapPin, BookCopy, Info } from 'lucide-react';
 // Nosso novo componente
import { 
    Pagination, PaginationContent, PaginationItem, PaginationLink, 
    PaginationNext, PaginationPrevious, PaginationEllipsis 
} from '@/components/ui/pagination'; // Para paginação dos livros do vendedor

const BOOKS_PER_SELLER_PAGE = 8; // Quantos livros listar por página

interface SellerPageProps {
  params: {
    sellerProfileId: string;
  };
  searchParams: { // Para paginação dos livros do vendedor
    page?: string;
  };
}

// Função para buscar dados do vendedor e seus livros
async function getSellerPageData(sellerProfileId: string, page: number = 1) {
  try {
    const sellerProfile = await db.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      include: {
        user: { select: { image: true } }, // Para um avatar do vendedor, se storeLogoUrl não existir
        // _count: { select: { ratingsReceived: true } } // Se você tiver totalRatings no schema
      },
    });

    if (!sellerProfile) {
      return null;
    }

    // Calcular/buscar avaliação média e total
    // Se você não tiver averageRating e totalRatings no schema SellerProfile, calcule aqui:
    const ratingsData = await db.sellerRating.aggregate({
      where: { sellerProfileId: sellerProfile.id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const averageRating = ratingsData._avg.rating;
    const totalRatings = ratingsData._count.rating;

    // Buscar livros para o banner (ex: 3 mais recentes)
    const bannerBooksRaw = await db.book.findMany({
      where: { sellerId: sellerProfile.id, status: 'PUBLISHED' }, // Apenas livros publicados
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { category: true, seller: { select: { id: true, storeName: true, whatsappNumber: true } } },
    });
    // Garantir que o tipo corresponde a BookWithDetails
    const bannerBooks = bannerBooksRaw.map(b => ({...b, category: b.category, seller: b.seller})) as BookWithDetails[];


    // Buscar livros listados pelo vendedor (com paginação)
    const skip = (page - 1) * BOOKS_PER_SELLER_PAGE;
    const listedBooksRaw = await db.book.findMany({
      where: { sellerId: sellerProfile.id, status: 'PUBLISHED' },
      take: BOOKS_PER_SELLER_PAGE,
      skip: skip,
      orderBy: { createdAt: 'desc' },
      include: { category: true, seller: { select: { id: true, storeName: true, whatsappNumber: true } } },
    });
    const listedBooks = listedBooksRaw.map(b => ({...b, category: b.category, seller: b.seller})) as BookWithDetails[];

    const totalSellerBooks = await db.book.count({
      where: { sellerId: sellerProfile.id, status: 'PUBLISHED' },
    });

    return {
      profile: { ...sellerProfile, averageRating, totalRatings },
      bannerBooks,
      listedBooks,
      pagination: {
        totalItems: totalSellerBooks,
        currentPage: page,
        itemsPerPage: BOOKS_PER_SELLER_PAGE,
        totalPages: Math.ceil(totalSellerBooks / BOOKS_PER_SELLER_PAGE),
      },
    };
  } catch (error) {
    console.error("Erro ao buscar dados da página do vendedor:", error);
    return null;
  }
}

// Gerar metadados dinâmicos
export async function generateMetadata(
  { params }: SellerPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const data = await getSellerPageData(params.sellerProfileId);
  if (!data?.profile) {
    return { title: 'Livraria não encontrada' };
  }
  return {
    title: `${data.profile.storeName} | Adenosis Livraria`,
    description: data.profile.storeDescription?.substring(0, 160) || `Explore os livros de ${data.profile.storeName}.`,
    openGraph: {
      title: data.profile.storeName,
      description: data.profile.storeDescription?.substring(0, 160),
      // images: data.profile.storeBannerUrl ? [{ url: data.profile.storeBannerUrl }] : [], // Se tiver banner
    },
  };
}


export default async function SellerPage({ params, searchParams }: SellerPageProps) {
  const currentPage = parseInt(searchParams?.page || '1');
  const sellerData = await getSellerPageData(params.sellerProfileId, currentPage);

  if (!sellerData || !sellerData.profile) {
    notFound();
  }

  const { profile, bannerBooks, listedBooks, pagination } = sellerData;
  const averageRatingDisplay = profile.averageRating ? profile.averageRating.toFixed(1) : "N/A";

  const sellerWhatsappLink = profile.whatsappNumber 
    ? `https://wa.me/${profile.whatsappNumber}?text=${encodeURIComponent(`Olá, ${profile.storeName}! Vi sua loja na Adenosis Livraria e gostaria de mais informações.`)}`
    : "#";

  // Função para renderizar os itens de paginação (similar à da página /books)
  const renderPaginationItems = () => { /* ... (implementar como na página /books, ajustando o href para /seller/[id]?page=N) ... */ 
    if (!pagination || pagination.totalPages <= 1) return null;
    const items = []; const totalPages = pagination.totalPages; const currentPg = pagination.currentPage; const pageSpread = 2;
    const basePath = `/seller/${profile.id}`;
    items.push(<PaginationItem key="prev"><PaginationPrevious href={currentPg > 1 ? `${basePath}?page=${currentPg - 1}` : '#'}  className={currentPg === 1 ? "pointer-events-none opacity-60" : "hover:bg-slate-700 hover:text-emerald-400"}/></PaginationItem>);
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPg - pageSpread && i <= currentPg + pageSpread)) {
        items.push(<PaginationItem key={i}><PaginationLink href={`${basePath}?page=${i}`} isActive={i === currentPg} className={cn(i === currentPg ? "bg-emerald-600 text-white hover:bg-emerald-700" : "hover:bg-slate-700 hover:text-emerald-400")}>{i}</PaginationLink></PaginationItem>);
      } else if ((i === currentPg - pageSpread - 1 && i > 1) || (i === currentPg + pageSpread + 1 && i < totalPages)) {
        items.push(<PaginationEllipsis key={`ellipsis-${i}`} className="text-slate-400"/>);
      }
    }
    items.push(<PaginationItem key="next"><PaginationNext href={currentPg < totalPages ? `${basePath}?page=${currentPg + 1}` : '#'} className={currentPg === totalPages ? "pointer-events-none opacity-60" : "hover:bg-slate-700 hover:text-emerald-400"}/></PaginationItem>);
    return items;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 flex flex-col">
      <Navbar />
      <main className="flex-grow"> {/* Removido padding-top global, banner controla sua altura */}
        
        {/* Seção Banner Dinâmico da Loja */}
        <section className="relative h-screen w-full flex items-center overflow-hidden bg-slate-800"> {/* Fallback bg */}
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center z-5 bg-slate-800"><BannerSkeleton /></div>}>
            <SellerBooksBanner books={bannerBooks} storeName={profile.storeName} />
          </Suspense>
        </section>

        {/* Conteúdo Principal da Página da Loja */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12 md:space-y-16">
          {/* Informações da Loja e Avaliação */}
          <section className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 space-y-4">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-emerald-400 tracking-tight">
                {profile.storeName}
              </h1>
              {profile.storeDescription && (
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-slate-300 leading-relaxed">
                  <Info className="inline h-5 w-5 mr-2 text-emerald-500" />
                  <p className="inline">{profile.storeDescription}</p>
                </div>
              )}
            </div>
            <div className="md:col-span-1 p-6 bg-slate-800/70 rounded-xl shadow-lg border border-slate-700 space-y-3">
              <h2 className="text-xl font-semibold text-white mb-3">Avaliação da Loja</h2>
              <div className="flex items-center text-3xl font-bold text-yellow-400">
                <Star className="h-7 w-7 mr-2 fill-current" />
                <span>{averageRatingDisplay}</span>
                {profile.totalRatings > 0 && <span className="text-sm text-slate-400 ml-2">({profile.totalRatings} avaliações)</span>}
              </div>
              {profile.totalRatings === 0 && <p className="text-sm text-slate-400">Ainda não há avaliações.</p>}
              <Button asChild className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!profile.whatsappNumber}>
                <a href={sellerWhatsappLink} target="_blank" rel="noopener noreferrer">
                  <Send className="mr-2 h-4 w-4" /> Contatar Vendedor
                </a>
              </Button>
              {/* Futuro: Botão para adicionar avaliação */}
              {/* <Button variant="outline" className="w-full mt-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500/10">Deixar uma avaliação</Button> */}
            </div>
          </section>

          {/* Seção "Livros da Loja" */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-8">Livros de {profile.storeName}</h2>
            {listedBooks.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                  {listedBooks.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-12 flex justify-center">
                    <Pagination>
                      <PaginationContent className="bg-slate-800/50 border border-slate-700 rounded-md px-2 py-1">
                        {renderPaginationItems()}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 bg-slate-800/50 rounded-lg">
                <BookCopy className="mx-auto h-12 w-12 text-slate-500 mb-4" />
                <p className="text-xl text-slate-300">Esta loja ainda não cadastrou livros.</p>
              </div>
            )}
          </section>

          {/* Futuro: Seção de Comentários/Avaliações Detalhadas */}
          {/* <section>
            <h2 className="text-3xl font-bold text-white mb-8">O que dizem sobre {profile.storeName}</h2>
            {/* Listar SellerRating aqui */}
          {/* </section> */}

        </div>
      </main>
      <Footer />
    </div>
  );
}

// Não se esqueça de importar cn se ainda não o fez
import { cn } from '@/lib/utils';
import { Suspense } from 'react';import { SellerBooksBanner } from '@/components/sellers/SellerBooksBanner';
import { BannerSkeleton } from '@/components/skeletons/BannerSkeleton';

