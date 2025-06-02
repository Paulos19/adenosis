// src/app/confirm-delivery/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Star, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
// Se não tiver um componente de estrelas, usaremos um select simples por enquanto.
// import StarRatingInput from '@/components/ui/star-rating-input'; 

// Schema Zod para o formulário de avaliação
const ratingFormSchema = z.object({
  rating: z.coerce.number().int().min(1, "Selecione de 1 a 5 estrelas.").max(5, "Selecione de 1 a 5 estrelas."),
  comment: z.string().max(1000, "Seu comentário não pode exceder 1000 caracteres.").optional().nullable(),
});
type RatingFormValues = z.infer<typeof ratingFormSchema>;


function ConfirmDeliveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [pageStatus, setPageStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // const [bookTitle, setBookTitle] = useState<string | null>(null); // Opcional: buscar dados da reserva para exibir

  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingFormSchema),
    defaultValues: {
      rating: 0, // Ou 5 para começar com uma sugestão positiva
      comment: '',
    },
  });
  const { control, handleSubmit, formState: { isSubmitting, errors } } = form;

  // Opcional: Validar token e buscar detalhes da reserva no carregamento
  useEffect(() => {
    if (!token) {
      setErrorMessage("Token inválido ou ausente. Por favor, verifique o link ou contate o suporte.");
      setPageStatus('error');
      return;
    }
    // Simplesmente assume que o token é válido por agora e mostra o formulário.
    // Uma chamada GET para validar o token e buscar dados do livro/loja seria ideal aqui.
    // Ex: GET /api/reservations/validate-token?token=TOKEN_AQUI
    // que retornaria { isValid: true, bookTitle: "...", storeName: "..." } ou { isValid: false, error: "..." }
    setPageStatus('form'); 
  }, [token]);


  const onSubmit = async (values: RatingFormValues) => {
    if (!token) {
      toast.error("Token inválido. Não é possível submeter a avaliação.");
      setPageStatus('error');
      setErrorMessage("Token inválido.");
      return;
    }

    const loadingToast = toast.loading('Enviando sua avaliação...');
    try {
      await axios.post('/api/confirm-delivery-and-rate', {
        token,
        rating: values.rating,
        comment: values.comment,
      });
      toast.success('Obrigado! Sua confirmação e avaliação foram registradas.', { id: loadingToast, duration: 5000 });
      setPageStatus('success');
      // Opcional: Redirecionar após alguns segundos
      setTimeout(() => router.push('/'), 5000); 
    } catch (error) {
      toast.dismiss(loadingToast);
      const axiosError = error as AxiosError<{ error?: string; details?: any }>;
      const backendError = axiosError.response?.data?.error || 'Falha ao registrar sua avaliação.';
      toast.error(backendError);
      setPageStatus('error');
      setErrorMessage(backendError);
      console.error("Erro ao confirmar entrega/avaliar:", error);
    }
  };

  // Componente simples para input de estrelas (substitua por um melhor se tiver)
  const StarInput = ({ field }: { field: any }) => (
    <div className="flex space-x-1 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-8 w-8 cursor-pointer transition-colors",
            field.value >= star ? "text-yellow-400 fill-yellow-400" : "text-slate-400 hover:text-yellow-300"
          )}
          onClick={() => field.onChange(star)}
        />
      ))}
    </div>
  );


  if (pageStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6">
        <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-lg text-slate-300">Carregando informações da sua reserva...</p>
      </div>
    );
  }

  if (pageStatus === 'error') {
    return (
      <div className="text-center p-6">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-red-400 mb-3">Erro na Confirmação</h2>
        <p className="text-slate-300 mb-6">{errorMessage || "Não foi possível processar o link."}</p>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/">Voltar para a Página Inicial</Link>
        </Button>
      </div>
    );
  }

  if (pageStatus === 'success') {
    return (
      <div className="text-center p-6">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-green-400 mb-3">Obrigado!</h2>
        <p className="text-slate-300 mb-6">Sua confirmação de entrega e avaliação foram registradas com sucesso.</p>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/">Continuar Navegando</Link>
        </Button>
      </div>
    );
  }

  // pageStatus === 'form'
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-emerald-400">Confirmar Entrega e Avaliar Vendedor</h1>
        <p className="mt-2 text-sm text-slate-400">
          Por favor, confirme o recebimento do seu livro e deixe sua avaliação sobre o vendedor.
          {/* Opcional: "Você está avaliando o livro '{bookTitle}' da loja '{storeName}'." */}
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label className="block text-center text-lg font-medium text-slate-200 mb-3">Sua Avaliação (1-5 estrelas)</Label>
          <Controller
            name="rating"
            control={control}
            render={({ field }) => <StarInput field={field} />}
          />
          {errors.rating && <p className="text-sm text-red-400 mt-2 text-center">{errors.rating.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment" className={cn("text-slate-200", errors.comment && "text-red-400")}>
            Seu Comentário (Opcional)
          </Label>
          <Textarea
            id="comment"
            placeholder="Compartilhe sua experiência com este vendedor..."
            {...form.register("comment")}
            rows={5}
            className={`bg-slate-700/80 border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-emerald-500 focus:border-emerald-500 ${errors.comment ? "border-red-500" : ""}`}
          />
          {errors.comment && <p className="text-sm text-red-400 mt-1">{errors.comment.message}</p>}
        </div>

        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
          {isSubmitting ? 'Enviando...' : 'Confirmar Entrega e Enviar Avaliação'}
        </Button>
      </form>
    </>
  );
}


export default function ConfirmDeliveryPageContainer() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900">
            <div className="w-full max-w-lg p-6 sm:p-8 bg-slate-800/60 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700">
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center text-center p-6">
                        <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                        <p className="text-lg text-slate-300">Carregando...</p>
                    </div>
                }>
                    <ConfirmDeliveryContent />
                </Suspense>
            </div>
        </div>
    );
}