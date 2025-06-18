// src/components/books/BookCard.tsx
'use client';

import Link from "next/link";
import { Book, Category, SellerProfile, User } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";
import { useState } from "react";
import { BookCoverImage } from "./BookCoverImage"; // Importa o componente de imagem corrigido

export type BookWithDetails = Book & {
  category: Category | null;
  seller: (Pick<SellerProfile, 'id' | 'storeName' | 'whatsappNumber' | 'userId'> & {
    user?: Pick<User, 'name' | 'image'> | null;
  }) | null;
};

interface BookCardProps {
  book: BookWithDetails;
}

export function BookCard({ book }: BookCardProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isReserving, setIsReserving] = useState(false);

  const formatCondition = (conditionValue: string) => {
    return conditionValue.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleContactSellerAndReserve = async () => {
    if (sessionStatus === 'unauthenticated') {
      toast.error('Faça login para contatar o vendedor e reservar o livro.');
      const callbackUrl = typeof window !== 'undefined' ? window.location.pathname : `/book/${book.id}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    if (sessionStatus === 'loading') {
        toast('Aguarde, a verificar a sua sessão...');
        return;
    }
    if (session?.user?.id === book.seller?.userId) {
        toast.error("Não pode reservar os seus próprios livros.");
        return;
    }

    setIsReserving(true);
    const reserveToast = toast.loading('A processar a sua reserva...');

    try {
      const reservationResponse = await axios.post('/api/reservations', { bookId: book.id });
      
      toast.success(reservationResponse.data.message || 'Reserva solicitada! O vendedor foi notificado.', { 
        id: reserveToast, 
        duration: 4000 
      });

      if (book.seller?.whatsappNumber) {
        const whatsappMessage = `Olá, ${book.seller.storeName}! Tenho interesse no livro "${book.title}" e a minha solicitação de reserva (ID: ${reservationResponse.data.reservationId}) foi registada na Adenosis Livraria. Gostaria de combinar os próximos passos.`;
        const whatsappLink = `https://wa.me/${book.seller.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappLink, '_blank', 'noopener,noreferrer');
      } else {
        toast.error("O número de WhatsApp do vendedor não está disponível no momento. O vendedor foi notificado por email.", {id: reserveToast});
      }

    } catch (error) {
      toast.dismiss(reserveToast);
      const axiosError = error as AxiosError<{ error?: string, details?: any }>;
      const errorMessage = axiosError.response?.data?.error || "Não foi possível registar a sua reserva.";
      toast.error(errorMessage);
      console.error("Erro ao reservar:", error);
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <div className={cn(
      "group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 ease-in-out shadow-lg h-full",
      "bg-slate-900 text-slate-200", 
      "border-slate-700/60",
      "hover:shadow-2xl hover:shadow-emerald-500/20 hover:border-emerald-500/60 transform hover:scale-[1.02]"
    )}>
      <Link href={`/books/${book.id}`} className="block" aria-label={`Ver detalhes do livro ${book.title}`}>
        <div className="aspect-[3/4] bg-slate-800 group-hover:opacity-90 transition-opacity duration-300 relative">
          <BookCoverImage
            srcProp={book.coverImageUrl}
            alt={book.title}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="transition-transform duration-300 group-hover:scale-105"
            fallbackSrc="/cover.jpg" // Garante o fallback
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
            <div className="flex items-center text-center bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                <Eye className="h-4 w-4 text-white mr-1.5" />
                <span className="text-xs font-semibold text-white">Ver Detalhes</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-grow space-y-2">
        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors truncate" title={book.title}>
          <Link href={`/books/${book.id}`}>
            {book.title}
          </Link>
        </h3>
        <p className="text-sm text-slate-400 mt-0.5 truncate" title={book.author}>{book.author}</p>
        
        <div className="flex flex-wrap gap-2 items-center text-xs pt-1">
          {book.category && (
            <Badge 
              variant="outline"
              className="border-emerald-500/50 text-emerald-300 bg-emerald-900/50 hover:bg-emerald-800/50 px-2.5 py-0.5"
            >
              {book.category.name}
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className="border-slate-600 text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5"
          >
            {formatCondition(book.condition)}
          </Badge>
        </div>
        
        <div className="!mt-auto pt-3 space-y-3"> 
          <p className="text-2xl font-bold text-emerald-500">
            R$ {book.price.toFixed(2).replace(".", ",")}
          </p>

          {book.seller?.storeName && (
            <Link href={`/sellers/${book.seller.id}`} className="text-xs text-slate-500 hover:text-emerald-400 hover:underline block truncate" title={`Vendido por ${book.seller.storeName}`}>
              Vendido por: {book.seller.storeName}
            </Link>
          )}

          <Button 
            onClick={handleContactSellerAndReserve}
            className={cn(
              "w-full font-semibold transition-all duration-200 ease-in-out transform hover:scale-105",
              "bg-emerald-600 text-white", 
              "hover:bg-emerald-700",
              "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-slate-900"
            )}
            disabled={!book.seller?.whatsappNumber || isReserving || book.stock <= 0 || sessionStatus === 'loading'}
            title={
                !book.seller?.whatsappNumber ? "Contacto do vendedor indisponível" 
                : book.stock <= 0 ? "Livro fora de stock" 
                : `Contactar ${book.seller?.storeName} e Reservar`
            }
          >
            {isReserving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isReserving ? 'A reservar...' : (book.stock <= 0 ? 'Indisponível' : 'Contactar Vendedor')}
          </Button>
        </div>
      </div>
    </div>
  );
}
