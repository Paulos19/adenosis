// src/app/(dashboard)/reservations/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
// import Link from 'next/link'; // Descomente se usar Link diretamente
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Loader2, XCircle, CheckCircle, ShoppingCart, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// Importe ReservationStatus diretamente do @prisma/client se ainda não estiver
import { Book, User as Customer, Reservation, ReservationStatus } from '@prisma/client'; 
import { cn } from '@/lib/utils';

type ReservationWithDetails = Reservation & {
  book: Pick<Book, 'id' | 'title' | 'coverImageUrl' | 'price' | 'stock'>;
  user: Pick<Customer, 'id' | 'name' | 'email'>;
};

// CORRIGIDO: Helper para status badge
const getStatusBadgeInfo = (status: ReservationStatus): { text: string; className: string; icon?: React.ElementType } => {
  switch (status) {
    case ReservationStatus.PENDING: // Use o membro do enum
      return { text: 'Pendente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Loader2 };
    case ReservationStatus.CONFIRMED:
      return { text: 'Confirmada', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: CheckCircle };
    case ReservationStatus.COMPLETED:
      return { text: 'Concluída', className: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle };
    case ReservationStatus.CANCELLED:
      return { text: 'Cancelada', className: 'bg-red-500/20 text-red-400 border-red-500/50', icon: XCircle };
    // Se você tiver mais status no seu enum (ex: EXPIRED), adicione um 'case' para ele aqui.
    // Se todos os casos do enum ReservationStatus estiverem cobertos acima, 
    // o TypeScript inferirá 'status' como 'never' no default.
    // Para um fallback seguro, caso o tipo 'status' não seja estritamente o enum:
    default:
      // Isso garante que, se você adicionar um novo valor ao enum ReservationStatus e esquecer de adicioná-lo aqui,
      // o TypeScript irá reclamar sobre 'exhaustiveCheck'.
      // const exhaustiveCheck: never = status; 
      // No entanto, para exibir algo na UI em um caso inesperado:
      const statusAsString = status as string; // Faz um cast para string
      return { 
        text: statusAsString.charAt(0).toUpperCase() + statusAsString.slice(1).toLowerCase().replace(/_/g, " "), 
        className: 'bg-gray-500/20 text-gray-400 border-gray-500/50' 
      };
  }
};


export default function SellerReservationsPage() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionState, setActionState] = useState<{ id: string | null, type: 'cancel' | 'confirm' | null }>({ id: null, type: null });
  const router = useRouter();

  const fetchReservations = useCallback(async () => {
    setIsLoading(true); // Mover para cá para sempre mostrar loading ao buscar
    try {
      const response = await axios.get<ReservationWithDetails[]>('/api/dashboard/reservations');
      setReservations(response.data);
    } catch (error) {
      console.error("Erro ao buscar reservas:", error);
      toast.error("Não foi possível carregar as reservas.");
      setReservations([]); // Limpa em caso de erro
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleCancelReservation = async (reservationId: string, bookTitle: string) => {
    setActionState({ id: reservationId, type: 'cancel' });
    const cancelToast = toast.loading(`Cancelando reserva para "${bookTitle}"...`);
    try {
      await axios.patch(`/api/dashboard/reservations/${reservationId}/cancel`);
      toast.success(`Reserva para "${bookTitle}" cancelada.`, { id: cancelToast });
      // Re-busca as reservas para atualizar a lista com o novo status
      // Ou atualiza o estado local mais rapidamente:
      setReservations(prev => prev.map(r => r.id === reservationId ? {...r, status: ReservationStatus.CANCELLED, updatedAt: new Date()} : r));
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error || "Falha ao cancelar reserva.", { id: cancelToast });
    } finally {
      setActionState({ id: null, type: null });
    }
  };
  
  const handleConfirmPurchase = async (reservationId: string, bookTitle: string) => {
    setActionState({ id: reservationId, type: 'confirm' });
    const confirmToast = toast.loading(`Confirmando compra de "${bookTitle}"...`);
    try {
      await axios.patch(`/api/dashboard/reservations/${reservationId}/confirm`);
      toast.success(`Compra de "${bookTitle}" confirmada! Cliente notificado.`, { id: confirmToast, duration: 5000 });
      // Re-busca as reservas para atualizar a lista com o novo status
      // Ou atualiza o estado local:
      setReservations(prev => prev.map(r => r.id === reservationId ? {...r, status: ReservationStatus.CONFIRMED, updatedAt: new Date()} : r));
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error || "Falha ao confirmar compra.", { id: confirmToast });
      console.error("Erro ao confirmar compra:", error);
    } finally {
      setActionState({ id: null, type: null });
    }
  };

  if (isLoading && reservations.length === 0) { // Mostra loading principal apenas na carga inicial
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gerenciar Reservas</h1>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="ml-3 text-lg text-gray-300">Carregando suas reservas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gerenciar Reservas</h1>

      {reservations.length === 0 && !isLoading ? ( // Estado de lista vazia (após o loading)
        <div className="text-center py-10 bg-white dark:bg-slate-800/50 rounded-lg shadow border dark:border-slate-700">
          <ShoppingCart className="mx-auto h-16 w-16 text-slate-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nenhuma reserva encontrada.</h3>
          <p className="mt-2 text-md text-slate-400">Quando clientes demonstrarem interesse em seus livros, as reservas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/70 shadow-md rounded-lg border dark:border-slate-700 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                <TableHead className="w-[60px] p-3 hidden sm:table-cell">Capa</TableHead>
                <TableHead className="p-3 min-w-[200px]">Livro</TableHead>
                <TableHead className="p-3 min-w-[180px]">Cliente</TableHead>
                <TableHead className="p-3 hidden md:table-cell min-w-[120px]">Data Reserva</TableHead>
                <TableHead className="p-3 min-w-[120px]">Status</TableHead>
                <TableHead className="text-right p-3 min-w-[220px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((res) => {
                // CORRIGIDO: Usa o objeto retornado por getStatusBadgeInfo
                const statusInfo = getStatusBadgeInfo(res.status); 
                const isCurrentActionCancel = actionState.id === res.id && actionState.type === 'cancel';
                const isCurrentActionConfirm = actionState.id === res.id && actionState.type === 'confirm';
                const isAnyActionLoadingForThisRow = actionState.id === res.id;

                return (
                  <TableRow key={res.id} className="dark:border-slate-600">
                    <TableCell className="hidden sm:table-cell p-2 align-middle">
                      <Image src={res.book.coverImageUrl || "/placeholder-book.png"} alt={res.book.title} width={45} height={67} className="rounded object-cover aspect-[2/3]" />
                    </TableCell>
                    <TableCell className="p-3 align-middle">
                      <div className="font-medium text-gray-800 dark:text-gray-100">{res.book.title}</div>
                      <div className="text-xs text-muted-foreground">R$ {res.book.price.toFixed(2).replace('.',',')}</div>
                    </TableCell>
                    <TableCell className="p-3 align-middle">
                      <div className="font-medium text-gray-800 dark:text-gray-100">{res.user.name || "Cliente Anônimo"}</div>
                      <div className="text-xs text-muted-foreground">{res.user.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell p-3 align-middle">
                      {new Date(res.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="p-3 align-middle">
                      <Badge variant="outline" className={cn("text-xs font-semibold", statusInfo.className)}>
                        {statusInfo.icon && <statusInfo.icon className={cn("mr-1.5 h-3 w-3", statusInfo.text === 'Pendente' && "animate-spin")}/>}
                        {statusInfo.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right p-3 align-middle">
                      <div className="flex justify-end space-x-2">
                        {res.status === ReservationStatus.PENDING && ( // Use o membro do enum
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs border-red-500/60 text-red-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                                    disabled={isAnyActionLoadingForThisRow}
                                >
                                   {isCurrentActionCancel ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <XCircle className="mr-1.5 h-3 w-3"/>}
                                   Cancelar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-900 border-slate-800 text-gray-200">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-emerald-400">Confirmar Cancelamento</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    Tem certeza que deseja cancelar a reserva para "<strong>{res.book.title}</strong>" de {res.user.name || 'Cliente'}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-slate-700 hover:bg-slate-800">Voltar</AlertDialogCancel>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleCancelReservation(res.id, res.book.title)}
                                    disabled={isAnyActionLoadingForThisRow}
                                  >
                                    {isCurrentActionCancel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Sim, Cancelar
                                  </Button>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <Button 
                                size="sm" 
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                                onClick={() => handleConfirmPurchase(res.id, res.book.title)}
                                disabled={isAnyActionLoadingForThisRow || res.book.stock <= 0}
                                title={res.book.stock <= 0 ? "Livro fora de estoque" : "Confirmar venda e notificar cliente"}
                            >
                                {isCurrentActionConfirm ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1.5 h-3 w-3"/>}
                                Confirmar
                            </Button>
                          </>
                        )}
                        {res.status !== ReservationStatus.PENDING && ( // Use o membro do enum
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground italic" disabled>
                                Nenhuma ação
                            </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}