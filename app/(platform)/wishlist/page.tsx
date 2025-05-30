// src/app/wishlist/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { HeartOff, Loader2 } from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BookCard, type BookWithDetails } from '@/components/books/BookCard'; // Reutilizamos o BookCard
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
// O WishlistButton pode ser usado, mas precisaremos de uma forma de atualizar a lista localmente
// ou podemos ter um botão de remover específico aqui.
// Vamos criar um botão de remover específico para esta página para clareza na ação de refresh.

export default function WishlistPage() {
  const { data: session, status } = useSession();
  const [wishlistBooks, setWishlistBooks] = useState<BookWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (status === 'authenticated') {
      setIsLoading(true);
      try {
        const response = await axios.get<BookWithDetails[]>('/api/wishlist');
        setWishlistBooks(response.data);
      } catch (error) {
        console.error("Erro ao buscar lista de desejos:", error);
        toast.error("Não foi possível carregar sua lista de desejos.");
        setWishlistBooks([]);
      } finally {
        setIsLoading(false);
      }
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
      setWishlistBooks([]); // Limpa se o usuário deslogar
    }
  }, [status]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemoveFromWishlist = async (bookId: string, bookTitle: string) => {
    const removingToast = toast.loading(`Removendo "${bookTitle}"...`);
    try {
      await axios.delete(`/api/wishlist/${bookId}`);
      toast.success(`"${bookTitle}" removido da lista de desejos!`, { id: removingToast });
      // Atualiza a lista localmente removendo o livro
      setWishlistBooks((prevBooks) => prevBooks.filter(book => book.id !== bookId));
    } catch (error) {
      toast.error("Falha ao remover o livro da lista.", { id: removingToast });
      console.error("Erro ao remover da wishlist:", error);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-gray-200 flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 md:pt-28">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-8">Minha Lista de Desejos</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={`wishlist-skel-${i}`} className="rounded-lg bg-slate-800 overflow-hidden">
                <Skeleton className="h-[300px] w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full mt-2" /> {/* Botão de remover */}
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-950 text-gray-200 flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 md:pt-28 text-center">
            <HeartOff className="mx-auto h-20 w-20 text-slate-600 mb-6" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">Sua Lista de Desejos está Vazia</h1>
            <p className="text-slate-400 mb-8">Você precisa estar logado para ver sua lista de desejos.</p>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link href="/login?callbackUrl=/wishlist">Fazer Login</Link>
            </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 md:pt-28">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-10">Minha Lista de Desejos</h1>
        
        {wishlistBooks.length === 0 ? (
          <div className="text-center py-12">
            <HeartOff className="mx-auto h-20 w-20 text-slate-600 mb-6" />
            <h3 className="text-2xl font-semibold text-gray-100">Sua lista de desejos está vazia.</h3>
            <p className="mt-3 text-md text-slate-400">Adicione livros que você ama para encontrá-los facilmente depois!</p>
            <Button asChild className="mt-8 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/books">Explorar Livros</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {wishlistBooks.map((book) => (
              <div key={book.id} className="flex flex-col"> {/* Wrapper para BookCard e botão */}
                <BookCard book={book} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveFromWishlist(book.id, book.title)}
                  className="mt-2 w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <HeartOff className="mr-2 h-4 w-4" /> Remover da Lista
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}