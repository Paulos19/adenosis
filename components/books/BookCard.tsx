// src/components/books/BookCard.tsx
'use client';

import Image from "next/image";
import Link from "next/link";
import { Book, Category, SellerProfile } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios"; // Importe AxiosError se não estiver
import { useState } from "react";

// Tipo para o livro com detalhes incluídos (seller e category)
export type BookWithDetails = Book & {
  category: Category | null;
  seller: Pick<SellerProfile, 'id' | 'storeName' | 'whatsappNumber' | 'userId'> | null; // <<--- ADICIONADO 'userId' AQUI
};

interface BookCardProps {
  book: BookWithDetails;
}

export function BookCard({ book }: BookCardProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isReserving, setIsReserving] = useState(false);

  const formatCondition = (conditionValue: string) => { // Renomeado parâmetro
    return conditionValue.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleContactSellerAndReserve = async () => {
    if (sessionStatus === 'unauthenticated') {
      toast.error('Faça login para contatar o vendedor e reservar o livro.');
      // Redirecionar para login com callback para a página atual ou do livro
      const callbackUrl = typeof window !== 'undefined' ? window.location.pathname : `/book/${book.id}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    // Não permite ação se a sessão ainda estiver carregando
    if (sessionStatus === 'loading') {
        toast('Aguarde, verificando sua sessão...');
        return;
    }
    // Impede que o vendedor reserve seu próprio livro
    if (session?.user?.id === book.seller?.userId) { // Supondo que SellerProfile tenha userId
        toast.error("Você não pode reservar seus próprios livros.");
        return;
    }


    setIsReserving(true);
    const reserveToast = toast.loading('Processando sua reserva...');

    try {
      // Chama a API para criar a reserva
      const reservationResponse = await axios.post('/api/reservations', { bookId: book.id });
      
      toast.success(reservationResponse.data.message || 'Reserva solicitada! O vendedor foi notificado.', { 
        id: reserveToast, 
        duration: 4000 
      });

      // Procede para o WhatsApp se o número existir
      if (book.seller?.whatsappNumber) {
        const whatsappMessage = `Olá, ${book.seller.storeName}! Tenho interesse no livro "${book.title}" e minha solicitação de reserva (ID: ${reservationResponse.data.reservationId}) foi registrada na Adenosis Livraria. Gostaria de combinar os próximos passos.`;
        const whatsappLink = `https://wa.me/${book.seller.whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappLink, '_blank', 'noopener,noreferrer');
      } else {
        // Se não houver WhatsApp, o vendedor foi notificado por email.
        // O usuário pode aguardar o contato do vendedor.
        toast.error("Número de WhatsApp do vendedor não disponível no momento. O vendedor foi notificado por email.", {id: reserveToast});
      }

    } catch (error) {
      toast.dismiss(reserveToast); // Garante que o toast de loading seja removido
      const axiosError = error as AxiosError<{ error?: string, details?: any }>;
      const errorMessage = axiosError.response?.data?.error || 
                           (axiosError.response?.data?.details && typeof axiosError.response.data.details === 'object' 
                             ? Object.values(axiosError.response.data.details).flat().join(' ') 
                             : "Não foi possível registrar sua reserva.");
      toast.error(errorMessage);
      console.error("Erro ao reservar:", error);
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <div className={cn(
      "group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 ease-in-out shadow-lg h-full", // Adicionado h-full
      "bg-adenosis-deep text-adenosis-pale", 
      "border-adenosis-medium/30",
      "hover:shadow-2xl hover:shadow-adenosis-medium/20 hover:border-adenosis-medium/60 transform hover:scale-[1.02]"
    )}>
      <Link href={`/book/${book.id}`} className="block" aria-label={`Ver detalhes do livro ${book.title}`}>
        <div className="aspect-[3/4] bg-black/30 group-hover:opacity-80 transition-opacity duration-300 relative">
          <Image
            src={book.coverImageUrl || "/placeholder-book.png"}
            alt={`Capa do livro ${book.title}`}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-book.png'; }} // Fallback para imagem quebrada
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
            <div className="flex flex-col items-center text-center">
                <Eye className="h-8 w-8 text-adenosis-pale mb-1" />
                <span className="text-xs font-semibold text-adenosis-pale">Ver Detalhes</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-grow space-y-2">
        <h3 className="text-lg font-semibold text-adenosis-pale group-hover:text-adenosis-medium transition-colors truncate" title={book.title}>
          <Link href={`/book/${book.id}`}>
            {book.title}
          </Link>
        </h3>
        <p className="text-sm text-adenosis-pale/80 mt-0.5 truncate" title={book.author}>{book.author}</p>
        
        <div className="flex flex-wrap gap-2 items-center text-xs pt-1">
          {book.category && (
            <Badge 
              variant="outline"
              className="border-adenosis-medium/50 text-adenosis-medium bg-adenosis-deep hover:bg-adenosis-medium/10 px-2.5 py-0.5"
            >
              {book.category.name}
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className="border-adenosis-pale/40 text-adenosis-pale/90 bg-adenosis-deep hover:bg-adenosis-pale/10 px-2.5 py-0.5"
          >
            {formatCondition(book.condition)}
          </Badge>
        </div>
        
        <div className="!mt-auto pt-3 space-y-3"> 
          <p className="text-2xl font-bold text-adenosis-medium">
            R$ {book.price.toFixed(2).replace(".", ",")}
          </p>

          {book.seller?.storeName && (
            <Link href={`/seller/${book.seller.id}`} className="text-xs text-adenosis-pale/70 hover:text-adenosis-pale hover:underline block truncate" title={`Vendido por ${book.seller.storeName}`}>
              Vendido por: {book.seller.storeName}
            </Link>
          )}

          <Button 
            onClick={handleContactSellerAndReserve}
            className={cn(
              "w-full font-semibold transition-all duration-200 ease-in-out transform hover:scale-105",
              "bg-adenosis-medium text-adenosis-deep", 
              "hover:bg-opacity-90",
              "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-adenosis-pale focus-visible:ring-offset-adenosis-deep"
            )}
            disabled={!book.seller?.whatsappNumber || isReserving || book.stock <= 0 || sessionStatus === 'loading'}
            title={
                !book.seller?.whatsappNumber ? "Contato do vendedor indisponível" 
                : book.stock <= 0 ? "Livro fora de estoque" 
                : `Contatar ${book.seller?.storeName} e Reservar`
            }
          >
            {isReserving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isReserving ? 'Reservando...' : (book.stock <= 0 ? 'Indisponível' : 'Contatar Vendedor')}
          </Button>
        </div>
      </div>
    </div>
  );
}