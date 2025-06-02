// src/components/books/ContactSellerReserveButton.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios, { AxiosError } from 'axios';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContactSellerReserveButtonProps {
  bookId: string;
  bookTitle: string;
  bookStock: number;
  sellerName: string | null | undefined;
  sellerWhatsappNumber: string | null | undefined;
  sellerUserId: string | null | undefined; // ID do usuário vendedor para checagem de auto-reserva
  className?: string;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
}

export function ContactSellerReserveButton({
  bookId,
  bookTitle,
  bookStock,
  sellerName,
  sellerWhatsappNumber,
  sellerUserId,
  className,
  size = "lg"
}: ContactSellerReserveButtonProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleContactAndReserve = async () => {
    if (sessionStatus === 'unauthenticated') {
      toast.error('Faça login para contatar o vendedor e reservar o livro.');
      const callbackUrl = typeof window !== 'undefined' ? window.location.pathname : `/book/${bookId}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    if (sessionStatus === 'loading') {
      toast('Aguarde, verificando sua sessão...');
      return;
    }

    if (session?.user?.id === sellerUserId) {
      toast.error("Você não pode reservar ou contatar sobre seus próprios livros.");
      return;
    }

    if (bookStock <= 0) {
      toast.error("Este livro está fora de estoque e não pode ser reservado.");
      return;
    }

    setIsProcessing(true);
    const reserveToast = toast.loading('Processando sua reserva...');

    try {
      const reservationResponse = await axios.post('/api/reservations', { bookId });
      
      toast.success(reservationResponse.data.message || 'Reserva solicitada! O vendedor foi notificado.', { 
        id: reserveToast, 
        duration: 4000 
      });

      if (sellerWhatsappNumber) {
        const whatsappMessage = `Olá, ${sellerName || 'Vendedor'}! Tenho interesse no livro "${bookTitle}" (ID da reserva: ${reservationResponse.data.reservationId}) que vi na Adenosis Livraria e gostaria de combinar a compra. Minha reserva foi registrada.`;
        const whatsappLink = `https://wa.me/${sellerWhatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappLink, '_blank', 'noopener,noreferrer');
      } else {
        toast.error("Número de WhatsApp do vendedor não disponível. O vendedor foi notificado por email sobre sua reserva.", {id: reserveToast});
      }

    } catch (error) {
      toast.dismiss(reserveToast);
      const axiosError = error as AxiosError<{ error?: string, details?: any }>;
      const errorMessage = axiosError.response?.data?.error || 
                           (axiosError.response?.data?.details && typeof axiosError.response.data.details === 'object' 
                             ? Object.values(axiosError.response.data.details).flat().join(' ') 
                             : "Não foi possível registrar sua reserva.");
      toast.error(errorMessage);
      console.error("Erro ao reservar:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      size={size}
      className={cn(
        "bg-green-500 hover:bg-green-600 text-white flex-1 py-3 text-base shadow-md",
        className
      )}
      onClick={handleContactAndReserve}
      disabled={!sellerWhatsappNumber || isProcessing || bookStock <= 0 || sessionStatus === 'loading'}
      title={
        !sellerWhatsappNumber ? "Contato do vendedor indisponível" 
        : bookStock <= 0 ? "Livro fora de estoque" 
        : `Contatar ${sellerName || 'Vendedor'} e Reservar`
      }
    >
      {isProcessing ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <Send className="mr-2 h-5 w-5" />
      )}
      {isProcessing ? 'Processando...' : (bookStock <= 0 ? 'Indisponível' : 'Contatar Vendedor')}
    </Button>
  );
}