// src/app/(seu_grupo_admin)/dashboard/books/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Category, SellerProfile, BookStatus } from '@prisma/client'; // Importe BookStatus
import { Library } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { 
  Pagination, PaginationContent, PaginationItem, PaginationLink, 
  PaginationNext, PaginationPrevious, PaginationEllipsis 
} from "@/components/ui/pagination";
import { AdminBooksPageSkeleton } from '@/components/admin/skeletons/AdminBooksPageSkeleton';
import { AdminBookFilters } from '@/components/admin/books/AdminBookFilters';
import { AdminBookTable } from '@/components/admin/books/AdminBookTable';
import type { AdminBookView } from '@/app/api/admin/books/route';
import { cn } from '@/lib/utils';

const BOOKS_PER_PAGE_ADMIN = 10;

interface PaginationInfo {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

interface FiltersState {
    searchTerm: string;
    statusFilter: BookStatus | '';
    categoryFilter: string;
    sellerFilter: string;
}

function AdminBooksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [books, setBooks] = useState<AdminBookView[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para os filtros atuais que disparam a busca
  const [currentFilters, setCurrentFilters] = useState<FiltersState>({
    searchTerm: searchParams.get('q') || '',
    statusFilter: (searchParams.get('status') as BookStatus) || '',
    categoryFilter: searchParams.get('categoryId') || '',
    sellerFilter: searchParams.get('sellerId') || '',
  });

  // Estados para popular os selects de filtro
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<Pick<SellerProfile, 'id' | 'storeName'>[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // Estado para controlar loading de ações na tabela
  const [actionState, setActionState] = useState<{ id: string | null; type: string | null }>({ id: null, type: null });


  const currentPage = parseInt(searchParams.get('page') || '1');

  // Sincroniza currentFilters com searchParams
  useEffect(() => {
    setCurrentFilters({
        searchTerm: searchParams.get('q') || '',
        statusFilter: (searchParams.get('status') as BookStatus) || '',
        categoryFilter: searchParams.get('categoryId') || '',
        sellerFilter: searchParams.get('sellerId') || '',
    });
  }, [searchParams]);

  // Busca dados para os filtros (categorias, vendedores)
  useEffect(() => {
    const fetchFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        const [catRes, selRes] = await Promise.all([
          axios.get('/api/categories'),
          axios.get('/api/sellers?limit=1000&page=1') // Pega todos os vendedores para o select
        ]);
        setCategories(catRes.data || []);
        setSellers(selRes.data?.data || []);
      } catch (error) {
        console.error("Erro ao buscar dados para filtros:", error);
        toast.error("Não foi possível carregar opções de filtro.");
      } finally {
        setIsLoadingFilters(false);
      }
    };
    fetchFilterData();
  }, []);

  // Busca os livros
  const fetchBooks = useCallback(async () => {
    const initialLoad = books.length === 0;
    if (initialLoad) setIsLoading(true);
    else setIsLoading(false); // Para re-fetch, não mostrar skeleton da página toda

    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', BOOKS_PER_PAGE_ADMIN.toString());
      if (currentFilters.searchTerm) params.append('q', currentFilters.searchTerm);
      if (currentFilters.statusFilter) params.append('status', currentFilters.statusFilter);
      if (currentFilters.categoryFilter) params.append('categoryId', currentFilters.categoryFilter);
      if (currentFilters.sellerFilter) params.append('sellerId', currentFilters.sellerFilter);
      
      const response = await axios.get(`/api/admin/books?${params.toString()}`);
      setBooks(response.data.data || []);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error("Erro ao buscar livros (admin):", error);
      toast.error("Não foi possível carregar a lista de livros.");
      setBooks([]); 
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentFilters, books.length]); // books.length para diferenciar carga inicial

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleFilterSubmitInPage = (filters: FiltersState) => {
    const params = new URLSearchParams();
    if (filters.searchTerm.trim()) params.set('q', filters.searchTerm.trim());
    if (filters.statusFilter) params.set('status', filters.statusFilter);
    if (filters.categoryFilter) params.set('categoryId', filters.categoryFilter);
    if (filters.sellerFilter) params.set('sellerId', filters.sellerFilter);
    params.set('page', '1');
    router.push(`/admin/dashboard/books?${params.toString()}`);
  };
  
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/admin/dashboard/books?${params.toString()}`);
  };

  // Placeholder para ações futuras
  const handleEditBook = (bookId: string) => { console.log(`Admin edit book: ${bookId}`); toast("Função Editar Admin (a implementar)"); };
  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    setActionState({id: bookId, type: 'delete'});
    toast.loading(`Excluindo ${bookTitle}...`, {id: 'delete-toast'});
    try {
        // await axios.delete(`/api/admin/books/${bookId}`); // API de deleção admin a ser criada
        await new Promise(res => setTimeout(res, 1000)); // Simula API
        toast.success(`Livro ${bookTitle} excluído (simulação).`, {id: 'delete-toast'});
        fetchBooks(); // Re-fetch
    } catch (error) {
        toast.error(`Falha ao excluir ${bookTitle}.`, {id: 'delete-toast'});
    } finally {
        setActionState({id: null, type: null});
    }
  };
  const handleChangeStatus = async (bookId: string, currentStatus: BookStatus) => {
    setActionState({id: bookId, type: 'changeStatus'});
    const newStatus = currentStatus === BookStatus.PUBLISHED ? BookStatus.UNPUBLISHED : BookStatus.PUBLISHED;
    toast.loading(`Alterando status para ${newStatus}...`, {id: 'status-toast'});
    try {
        // await axios.patch(`/api/admin/books/${bookId}/status`, { status: newStatus }); // API a ser criada
        await new Promise(res => setTimeout(res, 1000)); // Simula API
        toast.success(`Status alterado para ${newStatus} (simulação).`, {id: 'status-toast'});
        fetchBooks(); // Re-fetch
    } catch (error) {
        toast.error(`Falha ao alterar status.`, {id: 'status-toast'});
    } finally {
        setActionState({id: null, type: null});
    }
  };

  const renderPaginationItems = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    const items = []; 
    const totalPages = pagination.totalPages; 
    const currentPg = pagination.currentPage; 
    const pageSpread = 1;
    const basePath = `/admin/dashboard/books`;
    const currentParamsObj = Object.fromEntries(searchParams.entries());
    
    const createPageLink = (page: number) => {
        const newParams = new URLSearchParams({...currentParamsObj});
        newParams.set('page', page.toString());
        return `${basePath}?${newParams.toString()}`;
    }

    items.push(<PaginationItem key="prev"><PaginationPrevious href={currentPg > 1 ? createPageLink(currentPg - 1) : '#'}  className={cn(currentPg === 1 && "pointer-events-none opacity-60", "hover:bg-slate-700 hover:text-emerald-400")}/></PaginationItem>);
    let ellipsisStartShown = false;
    let ellipsisEndShown = false;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPg - pageSpread && i <= currentPg + pageSpread)) {
        items.push(<PaginationItem key={i}><PaginationLink href={createPageLink(i)} isActive={i === currentPg} className={cn(i === currentPg ? "bg-emerald-600 text-white hover:bg-emerald-700" : "hover:bg-slate-700 hover:text-emerald-400")}>{i}</PaginationLink></PaginationItem>);
        if (i < currentPg) ellipsisStartShown = false;
        if (i > currentPg) ellipsisEndShown = false;
      } else {
        if (i < currentPg && !ellipsisStartShown) {
          items.push(<PaginationEllipsis key="ellipsis-start" className="text-slate-400"/>);
          ellipsisStartShown = true;
        } else if (i > currentPg && !ellipsisEndShown) {
          items.push(<PaginationEllipsis key="ellipsis-end" className="text-slate-400"/>);
          ellipsisEndShown = true;
        }
      }
    }
    items.push(<PaginationItem key="next"><PaginationNext href={currentPg < totalPages ? createPageLink(currentPg + 1) : '#'} className={cn(currentPg === totalPages && "pointer-events-none opacity-60", "hover:bg-slate-700 hover:text-emerald-400")}/></PaginationItem>);
    return items;
  };


  if (isLoading && books.length === 0 && categories.length === 0 && sellers.length === 0) {
    return <AdminBooksPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-100">Gerenciar Todos os Livros</h1>
        {/* Botão de adicionar livro admin pode ser implementado depois */}
      </div>

      <AdminBookFilters
        initialFilters={currentFilters}
        categories={categories}
        sellers={sellers}
        onFilterSubmit={handleFilterSubmitInPage}
        isLoading={isLoadingFilters || isLoading}
      />

      {isLoading && books.length === 0 ? ( // Mostra skeleton da tabela se estiver carregando e não houver livros para exibir
         <div className="rounded-lg border border-slate-700 overflow-hidden mt-6">
            <div className="flex items-center h-[49px] space-x-4 p-3 border-b border-slate-700 bg-slate-800/70">{/* ... skeletons de header ... */}</div>
            {[...Array(5)].map((_, i) => ( <div key={`content-book-skel-${i}`} className="flex items-center space-x-4 p-2 sm:p-3 h-[77px] border-b border-slate-700 last:border-b-0">{/* ... skeletons de linha ... */}</div> ))}
        </div>
      ) : !isLoading && books.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-lg border border-slate-700">
          <Library className="mx-auto h-16 w-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-100">Nenhum livro encontrado.</h3>
          <p className="mt-2 text-md text-slate-400">Ajuste os filtros ou aguarde novos cadastros.</p>
        </div>
      ) : (
        <AdminBookTable
          books={books}
          actionState={actionState}
          onEdit={handleEditBook}
          onDelete={handleDeleteBook}
          onChangeStatus={handleChangeStatus}
          isLoading={isLoading && books.length > 0} // Passa loading para a tabela se já houver dados
        />
      )}

      {!isLoading && pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent className="bg-slate-800/50 border border-slate-700 rounded-md px-2 py-1">
              {renderPaginationItems()}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

export default function AdminBooksPageContainer() {
  return (
    <Suspense fallback={<AdminBooksPageSkeleton />}>
      <AdminBooksPageContent />
    </Suspense>
  );
}