// src/app/(dashboard)/dashboard/books/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense, JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Book, BookCondition } from "@prisma/client";
import { PlusCircle, Edit3, BookOpen as BookIconFallback, Loader2, Trash2, FileUp } from "lucide-react";

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteBookButton } from '@/components/dashboard/DeleteBookButton';
import { SellerBookFilters } from '@/components/dashboard/SellerBookFilters';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis
} from "@/components/ui/pagination";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const BOOKS_PER_PAGE = 10;

interface PaginationInfo {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

function MyBooksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [books, setBooks] = useState<Book[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentQuery = searchParams.get('q') || '';

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', BOOKS_PER_PAGE.toString());
      if (currentQuery) {
        params.append('q', currentQuery);
      }
      
      const response = await axios.get(`/api/books?${params.toString()}`);
      setBooks(response.data.data || []);
      setPagination(response.data.pagination || null);
      setSelectedBooks([]); // Limpa a seleção ao buscar novos dados
    } catch (error) {
      toast.error("Não foi possível carregar os seus livros.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentQuery]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleFilterSubmit = (searchTerm: string) => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    }
    params.set('page', '1'); // Redefine para a primeira página na nova pesquisa
    router.push(`/dashboard/books?${params.toString()}`);
  };
  
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (pagination && newPage > pagination.totalPages)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/dashboard/books?${params.toString()}`);
  };

  const formatCondition = (condition: string) => {
    return condition.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSelectBook = (bookId: string) => {
    setSelectedBooks(prev => 
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedBooks(books.map(book => book.id));
    } else {
      setSelectedBooks([]);
    }
  };

  const handleDeleteSelected = async () => {
    setIsActionLoading(true);
    const toastId = toast.loading(`A excluir ${selectedBooks.length} livros...`);
    try {
        await axios.post('/api/books/batch-delete', { bookIds: selectedBooks });
        toast.success(`${selectedBooks.length} livros foram excluídos com sucesso.`, { id: toastId });
        fetchBooks(); // Recarrega os dados
    } catch (error) {
        toast.error("Falha ao excluir os livros selecionados.", { id: toastId });
    } finally {
        setIsActionLoading(false);
    }
  }

  const renderPaginationItems = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    
    const items: JSX.Element[] = [];
    const totalPages = pagination.totalPages;
    const currentPg = pagination.currentPage;
    const pageSpread = 1; // Quantas páginas mostrar à volta da página atual

    items.push(<PaginationItem key="prev"><PaginationPrevious onClick={() => handlePageChange(currentPg - 1)} className={cn(currentPg === 1 && "pointer-events-none opacity-50")}/></PaginationItem>);
    
    let ellipsisStartShown = false;
    let ellipsisEndShown = false;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPg - pageSpread && i <= currentPg + pageSpread)) {
            items.push(<PaginationItem key={i}><PaginationLink onClick={() => handlePageChange(i)} isActive={i === currentPg}>{i}</PaginationLink></PaginationItem>);
        } else if (i < currentPg && !ellipsisStartShown) {
            items.push(<PaginationEllipsis key="ellipsis-start" />);
            ellipsisStartShown = true;
        } else if (i > currentPg && !ellipsisEndShown) {
            items.push(<PaginationEllipsis key="ellipsis-end" />);
            ellipsisEndShown = true;
        }
    }

    items.push(<PaginationItem key="next"><PaginationNext onClick={() => handlePageChange(currentPg + 1)} className={cn(currentPg === totalPages && "pointer-events-none opacity-50")} /></PaginationItem>);
    
    return items;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Os Meus Livros Cadastrados</h1>
        <div className='flex space-x-2 w-full sm:w-auto'>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 flex-1">
            <Link href="/dashboard/books/new">
              <PlusCircle className="mr-2 h-5 w-5" /> Adicionar
            </Link>
          </Button>
           <Button asChild variant="outline" className="flex-1">
            <Link href="/dashboard/books/import">
              <FileUp className="mr-2 h-5 w-5" /> Importar
            </Link>
          </Button>
        </div>
      </div>

      <SellerBookFilters onFilterSubmit={handleFilterSubmit} initialSearchTerm={currentQuery} isLoading={isLoading} />
      
      {selectedBooks.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-slate-200 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
              <span className="text-sm font-medium">{selectedBooks.length} livro(s) selecionado(s)</span>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isActionLoading}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Selecionados
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                              Tem a certeza de que pretende excluir os {selectedBooks.length} livros selecionados? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSelected} className={cn(buttonVariants({ variant: 'destructive' }))}>
                            {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Excluir
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
          </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700">
          <BookIconFallback className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nenhum livro encontrado.</h3>
          <p className="mt-2 text-md text-gray-500 dark:text-gray-400">
            {currentQuery ? "Tente uma busca diferente ou adicione novos livros." : "Que tal adicionar o seu primeiro livro à loja?"}
          </p>
        </div>
      ) : (
        <Card className="dark:bg-gray-800 shadow-lg">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                  <TableHead className="p-2 w-12"><Checkbox onCheckedChange={handleSelectAll} checked={selectedBooks.length > 0 && (selectedBooks.length === books.length ? true : 'indeterminate')} /></TableHead>
                  <TableHead className="w-[60px] sm:w-[80px] p-3">Capa</TableHead>
                  <TableHead className="p-3">Título</TableHead>
                  <TableHead className="p-3 hidden md:table-cell">Preço</TableHead>
                  <TableHead className="p-3 hidden sm:table-cell">Condição</TableHead>
                  <TableHead className="text-right p-3">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id} data-state={selectedBooks.includes(book.id) && "selected"} className="dark:border-gray-700 dark:data-[state=selected]:bg-slate-700/50">
                    <TableCell className="p-2"><Checkbox onCheckedChange={() => handleSelectBook(book.id)} checked={selectedBooks.includes(book.id)} /></TableCell>
                    <TableCell className="p-2 sm:p-3">
                      <Image
                        src={book.coverImageUrl || "/placeholder-book.png"}
                        alt={`Capa do livro ${book.title}`}
                        width={50}
                        height={75}
                        className="rounded object-cover aspect-[2/3]"
                      />
                    </TableCell>
                    <TableCell className="font-medium p-3 align-middle">{book.title}</TableCell>
                    <TableCell className="p-3 align-middle hidden md:table-cell">
                      R$ {book.price.toFixed(2).replace(".", ",")}
                    </TableCell>
                    <TableCell className="p-3 align-middle hidden sm:table-cell">
                      <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatCondition(book.condition)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right p-3 align-middle">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="outline" size="icon" asChild className="border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30" title={`Editar "${book.title}"`}>
                          <Link href={`/dashboard/books/${book.id}/edit`}>
                            <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Link>
                        </Button>
                        <DeleteBookButton 
                          bookId={book.id} 
                          bookTitle={book.title} 
                          onDeleted={fetchBooks}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!isLoading && pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
            <Pagination>
                <PaginationContent>
                  {renderPaginationItems()}
                </PaginationContent>
            </Pagination>
        </div>
      )}
    </div>
  );
}

export default function MyBooksPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className='mx-auto h-8 w-8 animate-spin' /> Carregando...</div>}>
            <MyBooksPageContent />
        </Suspense>
    );
}
