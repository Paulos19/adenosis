// src/app/sellers/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link'; // Embora não usado diretamente para navegação de página aqui
import axios from 'axios';
import toast from 'react-hot-toast';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SellerCard } from '@/components/sellers/SellerCard';
import type { SellerProfileWithStatsAndAvgRating } from '@/app/api/sellers/route'; // Importa o tipo da API
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Users, Store, Search as SearchIconLucide } from 'lucide-react'; // Renomeado Search para evitar conflito
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


const SELLERS_PER_PAGE = 9; // Ajuste conforme necessário

interface PaginationInfo {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

function SellersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sellers, setSellers] = useState<SellerProfileWithStatsAndAvgRating[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Adicionar busca por nome de loja no futuro, similar à página de livros
  // const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  // const [currentSearchQuery, setCurrentSearchQuery] = useState(searchParams.get('q') || '');

  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    const fetchSellers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', SELLERS_PER_PAGE.toString());
        // if (currentSearchQuery) params.append('q', currentSearchQuery);
        
        const response = await axios.get(`/api/sellers?${params.toString()}`);
        setSellers(response.data.data || []);
        setPagination(response.data.pagination || null);
      } catch (error) {
        console.error("Erro ao buscar vendedores:", error);
        toast.error("Não foi possível carregar a lista de vendedores.");
        setSellers([]);
        setPagination(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSellers();
  }, [currentPage]); // Adicionar currentSearchQuery se implementar busca

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/sellers?${params.toString()}`);
  };

  const renderPaginationItems = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    const items = []; const totalPages = pagination.totalPages; const currentPg = pagination.currentPage; const pageSpread = 2;
    items.push(<PaginationItem key="prev"><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (currentPg > 1) handlePageChange(currentPg - 1);}} className={currentPg === 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-700 hover:text-emerald-400"}/></PaginationItem>);
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPg - pageSpread && i <= currentPg + pageSpread)) {
        items.push(<PaginationItem key={i}><PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i);}} isActive={i === currentPg} className={cn(i === currentPg ? "bg-emerald-600 text-white hover:bg-emerald-700" : "hover:bg-slate-700 hover:text-emerald-400")}>{i}</PaginationLink></PaginationItem>);
      } else if ((i === currentPg - pageSpread - 1 && i > 1) || (i === currentPg + pageSpread + 1 && i < totalPages)) {
        items.push(<PaginationEllipsis key={`ellipsis-${i}`} className="text-slate-400"/>);
      }
    }
    items.push(<PaginationItem key="next"><PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (currentPg < totalPages) handlePageChange(currentPg + 1);}} className={currentPg === totalPages ? "pointer-events-none opacity-50" : "hover:bg-slate-700 hover:text-emerald-400"}/></PaginationItem>);
    return items;
  };

  return (
    <>
      <div className="text-center mb-12 md:mb-16">
        <Store className="mx-auto h-16 w-16 text-emerald-400 mb-4 animate-bounce" /> {/* Animação sutil */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-white">
          Nossas <span className="text-emerald-400">Livrarias Parceiras</span>
        </h1>
        <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
          Descubra uma variedade de sebos e vendedores apaixonados por livros em todo o Brasil.
        </p>
      </div>

      {/* TODO: Adicionar input de busca por nome de loja aqui no futuro */}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[...Array(SELLERS_PER_PAGE)].map((_, i) => (
            <div key={`seller-skel-${i}`} className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-10 w-12 rounded-full" />
                <Skeleton className="h-7 w-3/4" />
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-10 w-full mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : sellers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {sellers.map((seller) => (
              <SellerCard key={seller.id} seller={seller} />
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
        <div className="text-center py-16">
          <Users className="mx-auto h-20 w-20 text-slate-600 mb-6" />
          <h3 className="text-2xl font-semibold text-gray-100">Nenhuma livraria encontrada.</h3>
          <p className="mt-3 text-md text-slate-400">
            Parece que ainda não temos livrarias cadastradas. Volte em breve!
          </p>
        </div>
      )}
    </>
  );
}

// Componente da Página que usa Suspense
export default function SellersPageContainer() {
  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 md:pt-28">
        {/* Suspense é importante aqui por causa do useSearchParams em SellersPageContent */}
        <Suspense fallback={<SellersPageSkeleton />}>
          <SellersPageContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

// Skeleton para a página de vendedores inteira
function SellersPageSkeleton() {
    return (
        <>
            <div className="text-center mb-12 md:mb-16">
                <Skeleton className="h-16 w-16 mx-auto mb-4 rounded-full bg-slate-700" />
                <Skeleton className="h-12 w-3/4 mx-auto mb-4 bg-slate-700" />
                <Skeleton className="h-6 w-1/2 mx-auto bg-slate-700" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[...Array(6)].map((_, i) => (
                     <div key={`page-seller-skel-${i}`} className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
                        <Skeleton className="h-40 w-full bg-slate-700" />
                        <div className="p-5 space-y-3">
                            <Skeleton className="h-10 w-12 rounded-full bg-slate-700" />
                            <Skeleton className="h-7 w-3/4 bg-slate-700" />
                            <div className="flex gap-4">
                                <Skeleton className="h-4 w-1/3 bg-slate-700" />
                                <Skeleton className="h-4 w-1/3 bg-slate-700" />
                            </div>
                            <Skeleton className="h-10 w-full mt-3 bg-slate-700" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}