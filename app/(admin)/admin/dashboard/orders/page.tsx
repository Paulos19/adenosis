// src/app/(admin)/admin/dashboard/orders/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Reservation, ReservationStatus, User, SellerProfile, Book } from '@prisma/client';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis
} from "@/components/ui/pagination";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Tipos
type ReservationWithDetails = Reservation & {
  book: Pick<Book, 'id' | 'title' | 'coverImageUrl'>;
  user: Pick<User, 'id' | 'name' | 'email'>;
  sellerProfile: Pick<SellerProfile, 'id' | 'storeName'>;
};

interface PaginatedReservationsResponse {
  data: ReservationWithDetails[];
  pagination: {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
  };
}

const ITEMS_PER_PAGE = 10;

// Helper para Status
const getStatusBadgeInfo = (status: ReservationStatus) => {
  switch (status) {
    case ReservationStatus.PENDING: return { text: 'Pendente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' };
    case ReservationStatus.CONFIRMED: return { text: 'Confirmada', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' };
    case ReservationStatus.COMPLETED: return { text: 'Concluída', className: 'bg-green-500/20 text-green-400 border-green-500/50' };
    case ReservationStatus.CANCELLED: return { text: 'Cancelada', className: 'bg-red-500/20 text-red-400 border-red-500/50' };
    default: return { text: 'Desconhecido', className: 'bg-gray-500/20 text-gray-400 border-gray-500/50' };
  }
};

function AdminOrdersPageContent() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [pagination, setPagination] = useState<PaginatedReservationsResponse['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage.toString(), limit: ITEMS_PER_PAGE.toString() });
      const response = await axios.get<PaginatedReservationsResponse>(`/api/admin/orders?${params.toString()}`);
      setReservations(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error("Falha ao carregar pedidos e reservas.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-100">Pedidos e Reservas</h1>
            <div className="rounded-lg border border-slate-700">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border-b border-slate-700 last:border-b-0 h-[85px]">
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4 bg-slate-600"/><Skeleton className="h-3 w-1/2 bg-slate-600"/></div>
                    <div className="w-24"><Skeleton className="h-8 w-full bg-slate-600"/></div>
                    </div>
                ))}
            </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-100">Todos os Pedidos e Reservas</h1>

      {reservations.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-lg">
          <ShoppingBag className="mx-auto h-16 w-16 text-slate-600 mb-4" />
          <h3 className="text-xl text-gray-100">Nenhum pedido ou reserva encontrado.</h3>
        </div>
      ) : (
        <div className="bg-slate-800/70 rounded-lg border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader><TableRow className="dark:border-slate-700">
              <TableHead>Livro</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {reservations.map((res) => (
                <TableRow key={res.id} className="dark:border-slate-700">
                  <TableCell className="font-medium text-slate-200">{res.book.title}</TableCell>
                  <TableCell>{res.user.name}</TableCell>
                  <TableCell>{res.sellerProfile.storeName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', getStatusBadgeInfo(res.status).className)}>
                        {getStatusBadgeInfo(res.status).text}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">{format(new Date(res.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Paginação */}
    </div>
  );
}

export default function AdminOrdersPageContainer() {
    return (
        <Suspense fallback={<div className='p-8 text-center'><Loader2 className='mx-auto h-8 w-8 animate-spin'/></div>}>
            <AdminOrdersPageContent />
        </Suspense>
    )
}
