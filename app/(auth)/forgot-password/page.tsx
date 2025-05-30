// src/app/(auth)/forgot-password/page.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Para redirecionar ou manipular histórico

import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validators/auth';
import { CustomFormInput } from '@/components/custom-form/CustomFormInput';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const { control, handleSubmit, formState: { isSubmitting } } = form;

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const loadingToast = toast.loading('Processando sua solicitação...');
    try {
      const response = await axios.post('/api/auth/request-password-reset', values);
      toast.dismiss(loadingToast);
      toast.success(response.data.message || 'Instruções enviadas para seu email, caso ele esteja cadastrado.');
      // Opcional: redirecionar para login ou limpar o form
      form.reset();
      // router.push('/login'); 
    } catch (error) {
      toast.dismiss(loadingToast);
      const axiosError = error as AxiosError<{ error?: string; message?: string }>;
      const backendError = axiosError.response?.data?.error || axiosError.response?.data?.message || 'Algo deu errado.';
      toast.error(backendError);
      console.error("Erro ao solicitar redefinição de senha:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-gray-800 dark:via-gray-900 dark:to-black">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-white rounded-xl shadow-2xl dark:bg-gray-800/90 backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">Esqueceu sua Senha?</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Não se preocupe! Digite seu email abaixo e enviaremos um link para você criar uma nova senha.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <CustomFormInput<ForgotPasswordFormValues>
            name="email"
            control={control}
            label="Seu Email de Cadastro"
            type="email"
            placeholder="seu.email@exemplo.com"
            disabled={isSubmitting}
            autoComplete="email"
          />
          
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 !mt-8" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Link de Redefinição'}
          </Button>
        </form>
        <p className="px-8 text-center text-sm text-muted-foreground">
          Lembrou da senha?{" "}
          <Link href="/login" className="underline underline-offset-4 hover:text-primary font-semibold text-emerald-700 dark:text-emerald-400">
            Fazer Login
          </Link>
        </p>
      </div>
    </div>
  );
}