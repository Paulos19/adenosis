// src/app/(seu_grupo_admin)/dashboard/books/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense, FormEvent, JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // Import Image se usado em AdminBookTable ou aqui
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Category, SellerProfile, BookStatus, Prisma } from '@prisma/client';
import { Library, Filter, Loader2, Edit3, ToggleRight, ToggleLeft } from 'lucide-react'; // Edit3 para "Adicionar Livro"

import { Button } from '@/components/ui/button';
import { 
  Pagination, PaginationContent, PaginationItem, PaginationLink, 
  PaginationNext, PaginationPrevious, PaginationEllipsis 
} from "@/components/ui/pagination";
import { AdminBooksPageSkeleton } from '@/components/admin/skeletons/AdminBooksPageSkeleton';
import { AdminBookFilters } from '@/components/admin/books/AdminBookFilters';
import { AdminBookTable } from '@/components/admin/books/AdminBookTable';
import type { AdminBookView } from '@/app/api/admin/books/route'; // Ajuste o caminho se necessário
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  // AlertDialogAction, // Usaremos Button com variant="destructive" etc.
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

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

// Helper para informações da Badge de Status do Livro (usado em AdminBooksPageContent e AdminBookTable)
// Se AdminBookTable já define helpers similares, garanta consistência ou importe de um local comum.
export const getAdminBookStatusBadgeInfo = (status: BookStatus): { text: string; className: string; icon?: React.ElementType } => {
    switch (status) {
        case BookStatus.PUBLISHED: return { text: "Publicado", className: "bg-green-600/20 text-green-400 border-green-500/50", icon: ToggleRight };
        case BookStatus.UNPUBLISHED: return { text: "Não Publicado", className: "bg-slate-500/20 text-slate-400 border-slate-500/50", icon: ToggleLeft };
        case BookStatus.PENDING_APPROVAL: return { text: "Pendente", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: Loader2 };
        default: 
            // Para garantir que todos os casos sejam tratados se o enum mudar:
            // const _exhaustiveCheck: never = status;
            const statusStr = status as string; // Fallback
            return { text: statusStr.charAt(0).toUpperCase() + statusStr.slice(1).toLowerCase(), className: "border-slate-500/50 text-slate-400" };
    }
};
// Helper para formatar apenas o texto do status
export const formatAdminBookStatusDisplay = (status: BookStatus): string => {
    return getAdminBookStatusBadgeInfo(status).text;
};


function AdminBooksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [books, setBooks] = useState<AdminBookView[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  
  const [currentFilters, setCurrentFilters] = useState<FiltersState>({
    searchTerm: searchParams.get('q') || '',
    statusFilter: (searchParams.get('status') as BookStatus) || '',
    categoryFilter: searchParams.get('categoryId') || '',
    sellerFilter: searchParams.get('sellerId') || '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<Pick<SellerProfile, 'id' | 'storeName'>[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  
  const [actionState, setActionState] = useState<{ 
    id: string | null; 
    type: 'delete' | 'changeStatus' | null;
    title?: string; 
    currentStatus?: BookStatus;
    isProcessing?: boolean;
  }>({ id: null, type: null, isProcessing: false });

  const currentPage = parseInt(searchParams.get('page') || '1');

  // Sincroniza currentFilters com searchParams
  useEffect(() => {
    setCurrentFilters({
        searchTerm: searchParams.get('q') || '',
        statusFilter: (searchParams.get('status') as BookStatus) || '', // Cast seguro seria melhor com isValidRole
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
          axios.get('/api/sellers?limit=1000&page=1')
        ]);
        setCategories(catRes.data || []);
        setSellers(selRes.data?.data || []);
      } catch (error) {
        console.error("Erro ao buscar dados para filtros (categorias/vendedores):", error);
        toast.error("Não foi possível carregar opções de filtro.");
      } finally {
        setIsLoadingFilters(false);
      }
    };
    fetchFilterData();
  }, []);

  const fetchBooks = useCallback(async () => {
    const isInitialBookLoad = books.length === 0 && !isLoadingFilters; // Só considera carga inicial se filtros já carregaram
    if (isInitialBookLoad) setIsLoadingPageData(true);
    else if (!isLoadingFilters) setIsLoadingPageData(false); // Evita piscar se só filtros carregam

    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', BOOKS_PER_PAGE_ADMIN.toString());
      if (currentFilters.searchTerm) params.append('q', currentFilters.searchTerm);
      if (currentFilters.statusFilter) params.append('status', currentFilters.statusFilter);
      if (currentFilters.categoryFilter) params.append('categoryId', currentFilters.categoryFilter);
      if (currentFilters.sellerFilter) params.set('sellerId', currentFilters.sellerFilter);
      
      const response = await axios.get(`/api/admin/books?${params.toString()}`);
      setBooks(response.data.data || []);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error("Erro ao buscar livros (admin):", error);
      toast.error("Não foi possível carregar a lista de livros.");
      setBooks([]); 
      setPagination(null);
    } finally {
      if (isInitialBookLoad) setIsLoadingPageData(false);
    }
  }, [currentPage, currentFilters, books.length, isLoadingFilters]);

  useEffect(() => {
    if (!isLoadingFilters) { // Só busca livros após os filtros terem sido carregados ou falhado
        fetchBooks();
    }
  }, [fetchBooks, isLoadingFilters]);

  const handleApplyFilters = (filters: FiltersState) => {
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

  const handleAdminEditBookNavigation = (bookId: string) => {
    router.push(`/admin/dashboard/books/${bookId}/edit`);
  };

  const triggerDeleteDialog = (bookId: string, bookTitle: string) => {
    setActionState({ id: bookId, type: 'delete', title: bookTitle, isProcessing: false });
  };

  const triggerChangeStatusDialog = (bookId: string, bookTitle: string, bookCurrentStatus: BookStatus) => {
    setActionState({ id: bookId, type: 'changeStatus', title: bookTitle, currentStatus: bookCurrentStatus, isProcessing: false });
  };

  // FUNÇÃO CORRIGIDA (anteriormente faltava no contexto ou estava com nome diferente)
  const confirmDeleteBook = async () => {
    if (!actionState.id || actionState.type !== 'delete' || !actionState.title) return;
    
    const { id: bookId, title: bookTitle } = actionState;
    setActionState(prev => ({ ...prev, isProcessing: true }));
    const toastId = toast.loading(`Excluindo "${bookTitle}"...`);
    try {
      await axios.delete(`/api/admin/books/${bookId}`); // API de admin para deletar
      toast.success(`Livro "${bookTitle}" excluído com sucesso!`, { id: toastId });
      if (books.length === 1 && currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else {
        fetchBooks(); 
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error || "Falha ao excluir livro.", { id: toastId });
      console.error("Erro ao excluir livro (admin):", error);
    } finally {
      setActionState({ id: null, type: null, isProcessing: false, title: undefined, currentStatus: undefined });
    }
  };

  const confirmChangeStatus = async () => {
  if (!actionState.id || actionState.type !== 'changeStatus' || !actionState.title || actionState.currentStatus === undefined) return;

  const { id: bookId, title: bookTitle, currentStatus } = actionState;
  const newStatusToSet = currentStatus === BookStatus.PUBLISHED ? BookStatus.UNPUBLISHED : BookStatus.PUBLISHED;
  
  setActionState(prev => ({ ...prev, isProcessing: true }));
  const toastId = toast.loading(`Alterando status de "${bookTitle}" para ${formatAdminBookStatusDisplay(newStatusToSet)}...`); // Certifique-se que formatAdminBookStatusDisplay existe
  try {
    // A chamada da API deve ser esta:
    await axios.patch(`/api/admin/books/${bookId}/status`, { status: newStatusToSet });
    
    toast.success(`Status de "${bookTitle}" alterado para ${formatAdminBookStatusDisplay(newStatusToSet)}!`, { id: toastId });
    fetchBooks(); // Re-busca para atualizar a lista
  } catch (error) {
    const axiosError = error as AxiosError<{ error?: string }>;
    toast.error(axiosError.response?.data?.error || "Falha ao alterar status.", { id: toastId });
    console.error("Erro ao mudar status (admin):", error);
  } finally {
    setActionState({ id: null, type: null, isProcessing: false, title: undefined, currentStatus: undefined });
  }
};
  
  const renderPaginationItems = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    const items: JSX.Element[] = []; 
    const totalPages = pagination.totalPages; 
    const currentPg = pagination.currentPage; 
    const pageSpread = 1;
    const basePath = `/admin/dashboard/books`;
    const currentParamsObj = Object.fromEntries(searchParams.entries());
    
    const createPageLink = (page: number): string => {
        const newParams = new URLSearchParams({...currentParamsObj});
        newParams.set('page', page.toString());
        return `${basePath}?${newParams.toString()}`;
    };

    items.push(<PaginationItem key="prev"><PaginationPrevious href={currentPg > 1 ? createPageLink(currentPg - 1) : '#'}  className={cn(currentPg === 1 && "pointer-events-none opacity-60", "hover:bg-slate-700 hover:text-emerald-400")} aria-disabled={currentPg === 1} /></PaginationItem>);
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
    items.push(<PaginationItem key="next"><PaginationNext href={currentPg < totalPages ? createPageLink(currentPg + 1) : '#'} className={cn(currentPg === totalPages && "pointer-events-none opacity-60", "hover:bg-slate-700 hover:text-emerald-400")} aria-disabled={currentPg === totalPages} /></PaginationItem>);
    return items;
  };

  if (isLoadingPageData && books.length === 0 && categories.length === 0 && sellers.length === 0) {
    return <AdminBooksPageSkeleton />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-100">Gerenciar Todos os Livros</h1>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/admin/dashboard/books/new"> {/* Adapte este link se a rota de adicionar for diferente */}
                <Edit3 className="mr-2 h-5 w-5" /> Adicionar Livro (Admin)
            </Link>
          </Button>
        </div>

        <AdminBookFilters
          initialFilters={currentFilters}
          categories={categories}
          sellers={sellers}
          onFilterSubmit={handleApplyFilters}
          isLoading={isLoadingFilters || isLoadingPageData}
        />

        {isLoadingPageData && books.length > 0 && (
            <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" /></div>
        )}

        {!isLoadingPageData && books.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 rounded-lg border border-slate-700">
            <Library className="mx-auto h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-100">Nenhum livro encontrado.</h3>
            <p className="mt-2 text-md text-slate-400">Ajuste os filtros ou adicione novos cadastros.</p>
          </div>
        ) : !isLoadingPageData && books.length > 0 ? (
          <AdminBookTable
            books={books}
            actionState={actionState}
            onEdit={handleAdminEditBookNavigation}
            onDeleteTrigger={triggerDeleteDialog}    
            onChangeStatusTrigger={triggerChangeStatusDialog} 
            isLoading={isLoadingPageData && books.length > 0} 
          />
        ) : null }

        {!isLoadingPageData && pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination>
              <PaginationContent className="bg-slate-800/50 border border-slate-700 rounded-md px-2 py-1">
                {renderPaginationItems()}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* AlertDialog para Excluir Livro */}
      <AlertDialog 
        open={actionState.type === 'delete' && !!actionState.id} 
        onOpenChange={(open) => { if (!open && !actionState.isProcessing) setActionState({id: null, type: null}); }}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o livro <strong>{actionState.title || 'selecionado'}</strong>? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 hover:bg-slate-800" onClick={() => setActionState({id: null, type: null})} disabled={actionState.isProcessing}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDeleteBook} disabled={actionState.isProcessing}>
              {actionState.isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog para Mudar Status */}
      <AlertDialog 
        open={actionState.type === 'changeStatus' && !!actionState.id} 
        onOpenChange={(open) => { if (!open && !actionState.isProcessing) setActionState({id: null, type: null}); }}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-400">Confirmar Mudança de Status</AlertDialogTitle>
            {actionState.type === 'changeStatus' && actionState.currentStatus !== undefined && actionState.title !== undefined && (
                 <AlertDialogDescription className="text-slate-400">
                    Tem certeza que deseja alterar o status do livro "<strong>{actionState.title}</strong>" de <Badge variant="outline" className={cn("text-xs", getAdminBookStatusBadgeInfo(actionState.currentStatus).className)}>{formatAdminBookStatusDisplay(actionState.currentStatus)}</Badge> para <Badge variant="outline" className={cn("text-xs", getAdminBookStatusBadgeInfo(actionState.currentStatus === BookStatus.PUBLISHED ? BookStatus.UNPUBLISHED : BookStatus.PUBLISHED).className)}>{formatAdminBookStatusDisplay(actionState.currentStatus === BookStatus.PUBLISHED ? BookStatus.UNPUBLISHED : BookStatus.PUBLISHED)}</Badge>?
                </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 hover:bg-slate-800" onClick={() => setActionState({id: null, type: null})} disabled={actionState.isProcessing}>Cancelar</AlertDialogCancel>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmChangeStatus} disabled={actionState.isProcessing}>
              {actionState.isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Mudança
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Componente Container da Página
export default function AdminBooksPageContainer() {
  return (
    <Suspense fallback={<AdminBooksPageSkeleton />}>
        <AdminBooksPageContent />
    </Suspense>
  );
}