// src/components/admin/books/AdminBookTable.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookStatus } from '@prisma/client';
import { Edit3, Trash2, ToggleRight, ToggleLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent } from "@/components/ui/alert-dialog"; // Apenas para o trigger se o dialog completo estiver no pai
import type { AdminBookView } from '@/app/api/admin/books/route'; // Ajuste o caminho
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminBookTableProps {
  books: AdminBookView[];
  actionState: { id: string | null; type: string | null; title?: string; currentStatus?: BookStatus, isProcessing?: boolean };
  onEdit: (bookId: string) => void;
  onDeleteTrigger: (bookId: string, bookTitle: string) => void; // Dispara o dialog de delete no pai
  onChangeStatusTrigger: (bookId: string, bookTitle: string, currentStatus: BookStatus) => void; // Dispara o dialog de status no pai
  isLoading?: boolean;
}

const getBookStatusBadgeVariantStyle = (status: BookStatus): string => {
    switch (status) {
        case BookStatus.PUBLISHED: return "bg-green-600/20 text-green-400 border-green-500/50";
        case BookStatus.UNPUBLISHED: return "bg-slate-500/20 text-slate-400 border-slate-500/50";
        case BookStatus.PENDING_APPROVAL: return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
        default: return "border-slate-500/50 text-slate-400";
    }
};
const formatBookStatusDisplayTable = (status: BookStatus) => {
    switch (status) {
        case BookStatus.PUBLISHED: return "Publicado";
        case BookStatus.UNPUBLISHED: return "Não Publicado";
        case BookStatus.PENDING_APPROVAL: return "Pendente";
        default: return status;
    }
};

export function AdminBookTable({ 
    books, 
    actionState, 
    onEdit, 
    onDeleteTrigger, 
    onChangeStatusTrigger, 
    isLoading 
}: AdminBookTableProps) {

  if (isLoading && books.length === 0) { 
    // Skeleton de linhas da tabela (pode ser movido para AdminBooksPageSkeleton)
    return (
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        <div className="flex items-center h-[49px] space-x-4 p-3 border-b border-slate-700 bg-slate-800/70">{/* Header */}</div>
        {[...Array(5)].map((_, i) => ( <div key={`skel-row-table-${i}`} className="flex items-center space-x-4 p-2 sm:p-3 h-[77px] border-b border-slate-700 last:border-b-0">{/* Row Skeletons */}</div> ))}
      </div>
    );
  }
  
  return (
    <div className="bg-slate-800/70 shadow-md rounded-lg border border-slate-700 overflow-x-auto">
      <Table>
        <TableHeader><TableRow className="dark:border-slate-700 hover:bg-slate-700/50">
            <TableHead className="p-3 w-[50px]">Capa</TableHead>
            <TableHead className="p-3 min-w-[250px]">Título / Autor</TableHead>
            <TableHead className="p-3 hidden md:table-cell min-w-[150px]">Vendedor</TableHead>
            <TableHead className="p-3 hidden lg:table-cell min-w-[150px]">Categoria</TableHead>
            <TableHead className="p-3 min-w-[100px]">Preço</TableHead>
            <TableHead className="p-3 hidden sm:table-cell w-[70px] text-center">Est.</TableHead>
            <TableHead className="p-3 min-w-[140px]">Status</TableHead>
            <TableHead className="p-3 hidden xl:table-cell min-w-[150px]">Criado em</TableHead>
            <TableHead className="text-right p-3 min-w-[130px]">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {books.map((book) => {
            const isCurrentBookProcessing = actionState.id === book.id && actionState.isProcessing;
            const statusInfo = getBookStatusBadgeVariantStyle(book.status);

            return (
            <TableRow key={book.id} className="dark:border-slate-600">
              <TableCell className="p-2 align-middle">
                <Image src={book.coverImageUrl || "/placeholder-book.png"} alt={book.title} width={40} height={60} className="rounded object-cover aspect-[2/3]"/>
              </TableCell>
              <TableCell className="p-3 align-middle">
                <Link href={`/book/${book.id}`} target="_blank" className="font-medium text-gray-100 hover:text-emerald-400 hover:underline block truncate max-w-xs" title={book.title}>{book.title}</Link>
                <div className="text-xs text-slate-400 truncate max-w-xs">{book.author}</div>
              </TableCell>
              <TableCell className="p-3 align-middle hidden md:table-cell">
                <Link href={`/seller/${book.seller?.id}`} target="_blank" className="text-xs text-emerald-400 hover:underline">
                    {book.seller?.storeName || "N/A"}
                </Link>
              </TableCell>
              <TableCell className="p-3 align-middle hidden lg:table-cell text-xs text-slate-300">{book.category?.name || "N/A"}</TableCell>
              <TableCell className="p-3 align-middle font-medium text-emerald-400">R$ {book.price.toFixed(2).replace('.',',')}</TableCell>
              <TableCell className="p-3 align-middle hidden sm:table-cell text-center">{book.stock}</TableCell>
              <TableCell className="p-3 align-middle">
                <Button 
                    variant="outline"
                    size="sm" 
                    className={cn("text-xs whitespace-nowrap min-w-[110px]", statusInfo)} 
                    onClick={() => onChangeStatusTrigger(book.id, book.title, book.status)} 
                    disabled={isCurrentBookProcessing}
                    title={`Mudar status de ${formatBookStatusDisplayTable(book.status)}`}
                >
                    {(isCurrentBookProcessing && actionState.type === 'changeStatus') ? <Loader2 className="h-4 w-4 animate-spin" /> : (book.status === BookStatus.PUBLISHED ? <ToggleRight className="mr-1 h-4 w-4"/> : <ToggleLeft className="mr-1 h-4 w-4"/>)}
                    {formatBookStatusDisplayTable(book.status)}
                </Button>
              </TableCell>
              <TableCell className="p-3 align-middle hidden xl:table-cell text-xs text-slate-400">
                {format(new Date(book.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right p-3 align-middle">
                <div className="flex justify-end space-x-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-400" onClick={() => onEdit(book.id)} title="Editar Livro" disabled={isCurrentBookProcessing}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400" onClick={() => onDeleteTrigger(book.id, book.title)} title="Excluir Livro" disabled={isCurrentBookProcessing}>
                    {(isCurrentBookProcessing && actionState.type === 'delete') ? <Loader2 className="h-4 w-4 animate-spin text-red-400"/> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
          })}
        </TableBody>
      </Table>
    </div>
  );
}