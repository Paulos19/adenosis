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
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import type { AdminBookView } from '@/app/api/admin/books/route'; // Ajuste o caminho se a API estiver em outro local
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminBookTableProps {
  books: AdminBookView[];
  actionState: { id: string | null; type: string | null }; // Para loading de botões
  onEdit: (bookId: string) => void; // Placeholder
  onDelete: (bookId: string, bookTitle: string) => void; // Placeholder
  onChangeStatus: (bookId: string, currentStatus: BookStatus) => void; // Placeholder
  isLoading?: boolean;
}

const getBookStatusBadgeVariantStyle = (status: BookStatus): string => {
    switch (status) {
        case BookStatus.PUBLISHED: return "bg-green-500/20 text-green-400 border-green-500/50";
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

export function AdminBookTable({ books, actionState, onEdit, onDelete, onChangeStatus, isLoading }: AdminBookTableProps) {
  return (
    <div className="bg-slate-800/70 shadow-md rounded-lg border border-slate-700 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="dark:border-slate-700 hover:bg-slate-700/50">
            <TableHead className="p-3 w-[50px] text-white">Capa</TableHead>
            <TableHead className="p-3 min-w-[250px] text-white">Título / Autor</TableHead>
            <TableHead className="p-3 hidden md:table-cell min-w-[150px] text-white">Vendedor</TableHead>
            <TableHead className="p-3 hidden lg:table-cell min-w-[150px] text-white">Categoria</TableHead>
            <TableHead className="p-3 min-w-[100px] text-white">Preço</TableHead>
            <TableHead className="p-3 hidden sm:table-cell w-[70px] text-center text-white">Est.</TableHead>
            <TableHead className="p-3 min-w-[120px] text-white">Status</TableHead>
            <TableHead className="p-3 hidden xl:table-cell min-w-[150px] text-white">Criado em</TableHead>
            <TableHead className="text-right p-3 min-w-[130px] text-white">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && books.length === 0 ? ( // Mostra skeletons de linha se estiver carregando e não houver dados antigos
            [...Array(5)].map((_, i) => (
              <TableRow key={`skel-row-${i}`} className="dark:border-slate-700">
                <TableCell className="p-2 align-middle"><Skeleton className="h-[60px] w-[40px] rounded bg-slate-600" /></TableCell>
                <TableCell className="p-3 align-middle"><div className="space-y-1"><Skeleton className="h-4 w-4/5 bg-slate-600 rounded" /><Skeleton className="h-3 w-3/5 bg-slate-600 rounded" /></div></TableCell>
                <TableCell className="p-3 align-middle hidden md:table-cell"><Skeleton className="h-4 w-3/4 bg-slate-600 rounded" /></TableCell>
                <TableCell className="p-3 align-middle hidden lg:table-cell"><Skeleton className="h-4 w-3/4 bg-slate-600 rounded" /></TableCell>
                <TableCell className="p-3 align-middle"><Skeleton className="h-6 w-16 bg-slate-600 rounded-md" /></TableCell>
                <TableCell className="p-3 align-middle hidden sm:table-cell text-center"><Skeleton className="h-6 w-8 mx-auto bg-slate-600 rounded-md" /></TableCell>
                <TableCell className="p-3 align-middle"><Skeleton className="h-6 w-24 bg-slate-600 rounded-md" /></TableCell>
                <TableCell className="p-3 align-middle hidden xl:table-cell"><Skeleton className="h-4 w-full bg-slate-600 rounded" /></TableCell>
                <TableCell className="text-right p-3 align-middle">
                    <div className="flex justify-end space-x-1">
                        <Skeleton className="h-7 w-7 bg-slate-600 rounded-md" />
                        <Skeleton className="h-7 w-7 bg-slate-600 rounded-md" />
                        <Skeleton className="h-7 w-7 bg-slate-600 rounded-md" />
                    </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            books.map((book) => {
              const isCurrentAction = actionState.id === book.id;
              return (
              <TableRow key={book.id} className="dark:border-slate-600">
                <TableCell className="p-2 align-middle">
                  <Image src={book.coverImageUrl || "/placeholder-book.png"} alt={book.title} width={40} height={60} className="rounded object-cover aspect-[2/3]"/>
                </TableCell>
                <TableCell className="p-3 align-middle">
                  <Link href={`/book/${book.id}`} className="font-medium text-gray-100 hover:text-emerald-400 hover:underline block truncate max-w-xs" title={book.title}>{book.title}</Link>
                  <div className="text-xs text-slate-400 truncate max-w-xs">{book.author}</div>
                </TableCell>
                <TableCell className="p-3 align-middle hidden md:table-cell">
                  <Link href={`/seller/${book.seller?.id}`} className="text-xs text-emerald-400 hover:underline">
                      {book.seller?.storeName || "N/A"}
                  </Link>
                </TableCell>
                <TableCell className="p-3 align-middle hidden lg:table-cell text-xs text-slate-300">{book.category?.name || "N/A"}</TableCell>
                <TableCell className="p-3 align-middle font-medium text-emerald-400">R$ {book.price.toFixed(2).replace('.',',')}</TableCell>
                <TableCell className="p-3 align-middle hidden sm:table-cell text-center">{book.stock}</TableCell>
                <TableCell className="p-3 align-middle">
                  <Badge variant="outline" className={cn("text-xs whitespace-nowrap", getBookStatusBadgeVariantStyle(book.status))}>
                      {formatBookStatusDisplayTable(book.status)}
                  </Badge>
                </TableCell>
                <TableCell className="p-3 align-middle hidden xl:table-cell text-xs text-slate-400">
                  {format(new Date(book.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right p-3 align-middle">
                  <div className="flex justify-end space-x-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-400" onClick={() => onChangeStatus(book.id, book.status)} title={book.status === BookStatus.PUBLISHED ? "Despublicar" : "Publicar"} disabled={isCurrentAction}>
                      {(isCurrentAction && actionState.type === 'changeStatus') ? <Loader2 className="h-4 w-4 animate-spin"/> : (book.status === BookStatus.PUBLISHED ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />)}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-400" onClick={() => onEdit(book.id)} title="Editar Livro" disabled={isCurrentAction}>
                      {(isCurrentAction && actionState.type === 'edit') ? <Loader2 className="h-4 w-4 animate-spin"/> : <Edit3 className="h-4 w-4" />}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400" title="Excluir Livro" disabled={isCurrentAction}>
                          {(isCurrentAction && actionState.type === 'delete') ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-800 text-gray-200">
                        <AlertDialogHeader><AlertDialogTitle className="text-red-400">Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">Tem certeza que deseja excluir o livro <strong>{book.title}</strong>? Esta ação não poderá ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-slate-700 hover:bg-slate-800">Cancelar</AlertDialogCancel>
                          <Button variant="destructive" onClick={() => onDelete(book.id, book.title)} disabled={isCurrentAction && actionState.type === 'delete'}>
                            {(isCurrentAction && actionState.type === 'delete') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
    </div>
  );
}