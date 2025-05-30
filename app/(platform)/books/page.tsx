// src/app/books/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BookCard, type BookWithDetails } from '@/components/books/BookCard';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen, Search } from 'lucide-react';

const BOOKS_PER_PAGE = 12; // Ou o valor que você definiu como default na API

interface PaginationInfo {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

// Componente interno para usar hooks de cliente como useSearchParams
function BooksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [books, setBooks] = useState<BookWithDetails[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [currentSearchQuery, setCurrentSearchQuery] = useState(searchParams.get('q') || '');

  const currentPage = parseInt(searchParams.get('page') || '1');
  const categoryId = searchParams.get('categoryId'); // Exemplo de filtro

  useEffect(() => {
    const fetchBooks = async () => {
      setIsLoading(true);
      try {
        // Constrói os query params
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', BOOKS_PER_PAGE.toString());
        if (categoryId) {
          params.append('categoryId', categoryId);
        }
        if (currentSearchQuery) { // Usa o estado para a busca atual
            params.append('q', currentSearchQuery);
        }
        // Adicione sort se necessário: params.append('sort', 'recent');

        const response = await axios.get(`/api/books?${params.toString()}`);
        setBooks(response.data.data || []);
        setPagination(response.data.pagination || null);
      } catch (error) {
        console.error("Erro ao buscar livros:", error);
        toast.error("Não foi possível carregar os livros.");
        setBooks([]);
        setPagination(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [currentPage, categoryId, currentSearchQuery]); // Refetch quando a página, categoria ou busca mudar

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/books?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(); // Começa do zero para resetar page e categoryId na busca
    if (searchTerm.trim()) {
        params.set('q', searchTerm.trim());
    }
    params.set('page', '1'); // Reseta para a primeira página ao buscar
    // if (categoryId) params.set('categoryId', categoryId); // Manter filtro de categoria se desejado
    
    setCurrentSearchQuery(searchTerm.trim()); // Atualiza o estado que dispara o useEffect
    router.push(`/books?${params.toString()}`);
  };

  const renderPaginationItems = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const items = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.currentPage;
    const pageSpread = 2; // Quantas páginas mostrar antes e depois da atual

    // Previous
    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious
          href="#" // O href é apenas para acessibilidade, o onClick fará a navegação
          onClick={(e) => { e.preventDefault(); if (currentPage > 1) handlePageChange(currentPage - 1);}}
          className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
        />
      </PaginationItem>
    );

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // Sempre mostra a primeira página
        i === totalPages || // Sempre mostra a última página
        (i >= currentPage - pageSpread && i <= currentPage + pageSpread) // Mostra páginas ao redor da atual
      ) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => { e.preventDefault(); handlePageChange(i);}}
              isActive={i === currentPage}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      } else if (
        (i === currentPage - pageSpread - 1 && i > 1) || 
        (i === currentPage + pageSpread + 1 && i < totalPages)
      ) {
        // Adiciona elipses
        items.push(<PaginationEllipsis key={`ellipsis-${i}`} />);
      }
    }
    
    // Next
    items.push(
      <PaginationItem key="next">
        <PaginationNext
          href="#"
          onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) handlePageChange(currentPage + 1);}}
          className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
        />
      </PaginationItem>
    );
    return items;
  };

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-100 mb-6 md:mb-10">
          Explore Nossa <span className="text-emerald-400">Coleção de Livros</span>
        </h1>

        {/* Barra de Busca */}
        <form onSubmit={handleSearch} className="mb-8 max-w-xl mx-auto flex gap-2">
            <Input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título ou autor..."
                className="bg-slate-800 border-slate-700 placeholder-slate-500 text-gray-200 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Search className="h-4 w-4 mr-2 sm:mr-0" /><span className="hidden sm:inline ml-2">Buscar</span>
            </Button>
        </form>

        {/* TODO: Adicionar Filtros de Categoria e Ordenação aqui */}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {[...Array(BOOKS_PER_PAGE)].map((_, i) => (
              <div key={`book-skel-${i}`} className="rounded-lg bg-slate-800 overflow-hidden">
                <Skeleton className="h-[300px] w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    {renderPaginationItems()}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-16 w-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-100">Nenhum livro encontrado.</h3>
            <p className="mt-2 text-md text-slate-400">
              Tente ajustar sua busca ou filtros, ou volte mais tarde.
            </p>
          </div>
        )}
      </div>
    </>
  );
}


// Componente da Página que usa Suspense para useSearchParams
export default function BooksPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-gray-200">
      <Navbar />
      <main className="pt-16"> {/* Padding para compensar Navbar fixo */}
        <Suspense fallback={<BooksPageSkeleton />}> {/* Fallback para a página inteira */}
          <BooksPageContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

// Skeleton para a página de livros inteira (enquanto searchParams está carregando, por exemplo)
function BooksPageSkeleton() {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Skeleton className="h-10 w-1/2 mx-auto mb-10" /> {/* Title Skeleton */}
            <Skeleton className="h-12 w-full max-w-xl mx-auto mb-8" /> {/* Search Bar Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                {[...Array(BOOKS_PER_PAGE)].map((_, i) => (
                <div key={`page-skel-${i}`} className="rounded-lg bg-slate-800 overflow-hidden">
                    <Skeleton className="h-[300px] w-full" />
                    <div className="p-4 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full mt-4" />
                    </div>
                </div>
                ))}
            </div>
        </div>
    )
}