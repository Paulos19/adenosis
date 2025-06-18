// src/app/(admin)/admin/dashboard/ratings/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { SellerRating, User, SellerProfile, Prisma } from '@prisma/client';
import { Star, Trash2, Loader2, MessageSquareText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis
} from "@/components/ui/pagination";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Tipos para os dados da API
type RatingWithDetails = SellerRating & {
  ratedBy: Pick<User, 'id' | 'name' | 'email' | 'image'>;
  sellerProfile: Pick<SellerProfile, 'id' | 'storeName'>;
};

interface PaginatedRatingsResponse {
  data: RatingWithDetails[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

const ITEMS_PER_PAGE = 10;

// Componente para renderizar estrelas
const StarRatingDisplay = ({ rating }: { rating: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={cn(
          "h-4 w-4",
          i < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-500"
        )}
      />
    ))}
  </div>
);

function AdminRatingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ratings, setRatings] = useState<RatingWithDetails[]>([]);
  const [pagination, setPagination] = useState<PaginatedRatingsResponse['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionState, setActionState] = useState<{ id: string | null; isLoading: boolean }>({ id: null, isLoading: false });

  const currentPage = parseInt(searchParams.get('page') || '1');

  const fetchRatings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      const response = await axios.get<PaginatedRatingsResponse>(`/api/admin/ratings?${params.toString()}`);
      setRatings(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error("Falha ao carregar avaliações.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const handleDeleteRating = async (ratingId: string) => {
    setActionState({ id: ratingId, isLoading: true });
    const toastId = toast.loading(`Excluindo avaliação...`);
    try {
      await axios.delete(`/api/admin/ratings/${ratingId}`);
      toast.success("Avaliação excluída com sucesso!", { id: toastId });
      fetchRatings(); // Recarrega a lista
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error || "Falha ao excluir avaliação.", { id: toastId });
    } finally {
      setActionState({ id: null, isLoading: false });
    }
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    // ... lógica de renderização de paginação
    return (
        <div className="mt-8 flex justify-center">
            <Pagination>
                <PaginationContent>
                    {/* Implementação simplificada, pode ser expandida */}
                    <PaginationItem><PaginationPrevious href={`?page=${currentPage - 1}`} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
                    <PaginationItem><PaginationLink>{currentPage}</PaginationLink></PaginationItem>
                    <PaginationItem><PaginationNext href={`?page=${currentPage + 1}`} className={currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : undefined} /></PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
  };
  
  if (isLoading) {
    return <AdminRatingsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-100">Gerenciar Avaliações</h1>

      {ratings.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-lg">
          <MessageSquareText className="mx-auto h-16 w-16 text-slate-600 mb-4" />
          <h3 className="text-xl text-gray-100">Nenhuma avaliação encontrada.</h3>
        </div>
      ) : (
        <div className="bg-slate-800/70 rounded-lg border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader><TableRow className="dark:border-slate-700">
              <TableHead>Avaliação</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Avaliador</TableHead>
              <TableHead>Loja Avaliada</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {ratings.map((rating) => (
                <TableRow key={rating.id} className="dark:border-slate-700">
                  <TableCell><StarRatingDisplay rating={rating.rating} /></TableCell>
                  <TableCell className="max-w-xs truncate text-slate-400" title={rating.comment || ''}>{rating.comment || <span className='italic'>Sem comentário</span>}</TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-200">{rating.ratedBy.name}</div>
                    <div className="text-xs text-slate-500">{rating.ratedBy.email}</div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/sellers/${rating.sellerProfile.id}`} className="text-emerald-400 hover:underline">
                      {rating.sellerProfile.storeName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">{format(new Date(rating.createdAt), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="text-right">
                    {/* CORREÇÃO: Envolver o Trigger e o Content no AlertDialog */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400" disabled={actionState.isLoading && actionState.id === rating.id}>
                          {actionState.isLoading && actionState.id === rating.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-800 text-gray-200">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-red-400">Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita e irá recalcular a média da loja.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-slate-700 hover:bg-slate-800">Cancelar</AlertDialogCancel>
                          <Button variant="destructive" onClick={() => handleDeleteRating(rating.id)}>
                            Excluir
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {renderPagination()}
    </div>
  );
}

export default function AdminRatingsPageContainer() {
    return (
        <Suspense fallback={<AdminRatingsPageSkeleton />}>
            <AdminRatingsPageContent />
        </Suspense>
    );
}

function AdminRatingsPageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3 bg-slate-700 rounded-md" />
            <div className="rounded-lg border border-slate-700">
                {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-slate-700 last:border-b-0 h-[85px]">
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4 bg-slate-600"/><Skeleton className="h-3 w-1/2 bg-slate-600"/></div>
                    <div className="w-24"><Skeleton className="h-8 w-full bg-slate-600"/></div>
                </div>
                ))}
            </div>
        </div>
    );
}
