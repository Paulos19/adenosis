// src/components/books/WishlistButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  bookId: string;
  // No futuro, podemos passar um initialIsInWishlist se buscarmos essa info no server
}

export function WishlistButton({ bookId }: WishlistButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isInWishlist, setIsInWishlist] = useState(false); // Estado inicial, idealmente viria da API
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true); // Para checar o status inicial

  // TODO: No futuro, buscar o status inicial da wishlist para este livro e usuário
  useEffect(() => {
    // Simulação: se tivermos uma API GET /api/wishlist/status?bookId=...
    // Por agora, vamos deixar como false e o usuário precisa clicar para adicionar
    // Exemplo de como poderia ser:
    // if (session?.user) {
    //   axios.get(`/api/wishlist/status?bookId=${bookId}`)
    //     .then(response => setIsInWishlist(response.data.isInWishlist))
    //     .catch(console.error)
    //     .finally(() => setIsCheckingStatus(false));
    // } else {
    //   setIsCheckingStatus(false);
    // }
    setIsCheckingStatus(false); // Placeholder
  }, [bookId, session]);

  const handleToggleWishlist = async () => {
    if (status === 'unauthenticated') {
      toast.error('Você precisa estar logado para adicionar à lista de desejos.');
      router.push(`/login?callbackUrl=${window.location.pathname}`);
      return;
    }
    if (status === 'loading' || isCheckingStatus) return;

    setIsLoading(true);
    const actionToast = toast.loading(isInWishlist ? 'Removendo...' : 'Adicionando...');

    try {
      if (isInWishlist) {
        // TODO: Implementar API DELETE /api/wishlist/{bookId} ou /api/wishlist com bookId no body
        // await axios.delete(`/api/wishlist/${bookId}`);
        console.log(`Placeholder: API DELETE /api/wishlist/${bookId}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simula chamada API
        toast.success('Removido da lista de desejos!', { id: actionToast });
        setIsInWishlist(false);
      } else {
        // TODO: Implementar API POST /api/wishlist
        // await axios.post('/api/wishlist', { bookId });
        console.log(`Placeholder: API POST /api/wishlist com bookId: ${bookId}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simula chamada API
        toast.success('Adicionado à lista de desejos!', { id: actionToast });
        setIsInWishlist(true);
      }
      // router.refresh(); // Para atualizar contadores de wishlist, etc., se houver
    } catch (error) {
      toast.error('Ocorreu um erro. Tente novamente.', { id: actionToast });
      console.error("Erro ao interagir com wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus || status === 'loading') {
    return <Button variant="outline" className="w-full md:w-auto" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</Button>;
  }

  return (
    <Button
      variant={isInWishlist ? "default" : "outline"}
      onClick={handleToggleWishlist}
      disabled={isLoading}
      className={cn(
        "w-full md:w-auto flex text-green-400 items-center transition-all",
        isInWishlist && "bg-pink-600 hover:bg-pink-700 text-white border-pink-600"
      )}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("mr-2 h-4 w-4", isInWishlist && "fill-current")} />
      )}
      {isInWishlist ? 'Na Lista de Desejos' : 'Adicionar à Lista'}
    </Button>
  );
}