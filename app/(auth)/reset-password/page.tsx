// src/app/(auth)/reset-password/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react'; // Adicionado Suspense
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSearchParams, useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';

import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validators/auth';
import { CustomFormInput } from '@/components/custom-form/CustomFormInput';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react'; // Para um indicador de loading

// Componente interno para lidar com a lógica que usa useSearchParams
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [tokenError, setTokenError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const { control, handleSubmit, formState: { isSubmitting } } = form;

  useEffect(() => {
    if (!token) {
      setTokenError('Token de redefinição inválido ou ausente. Solicite um novo link.');
    }
  }, [token]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      toast.error(tokenError || 'Token inválido.');
      return;
    }
    const loadingToast = toast.loading('Redefinindo sua senha...');
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        password: values.password,
      });
      toast.dismiss(loadingToast);
      toast.success('Senha redefinida com sucesso! Você já pode fazer login.');
      router.push('/login');
    } catch (error) {
      toast.dismiss(loadingToast);
      const axiosError = error as AxiosError<{ error?: string; message?: string }>;
      const backendError = axiosError.response?.data?.error || axiosError.response?.data?.message || 'Algo deu errado.';
      toast.error(backendError);
      setTokenError(backendError); // Mostrar o erro do token se for o caso
      console.error("Erro ao redefinir senha:", error);
    }
  };

  if (tokenError && !token) { // Mostrar erro se o token não existir na URL desde o início
    return (
      <div className="text-center p-4">
        <p className="text-red-600 dark:text-red-400">{tokenError}</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-emerald-600 dark:text-emerald-400 hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">Redefinir sua Senha</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Crie uma nova senha segura para sua conta.
        </p>
      </div>

      {token && !tokenError ? ( // Mostrar formulário apenas se houver token e nenhum erro inicial de token
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <CustomFormInput<ResetPasswordFormValues>
            name="password"
            control={control}
            label="Nova Senha"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="new-password"
          />
          <CustomFormInput<ResetPasswordFormValues>
            name="confirmPassword"
            control={control}
            label="Confirmar Nova Senha"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="new-password"
          />
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 !mt-8" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Redefinir Senha'}
          </Button>
        </form>
      ) : tokenError ? ( // Mostrar erro se o token foi invalidado pela API ou erro na submissão
        <div className="text-center p-4">
            <p className="text-red-600 dark:text-red-400">{tokenError}</p>
            <Link href="/forgot-password" className="mt-4 inline-block text-emerald-600 dark:text-emerald-400 hover:underline">
              Solicitar novo link
            </Link>
        </div>
      ) : null } 
      {/* Não mostrar nada se o token não estiver na URL e o useEffect ainda não setou o tokenError */}
      
      <p className="mt-6 px-8 text-center text-sm text-muted-foreground">
        Lembrou da senha ou não precisa mais redefinir?{" "}
        <Link href="/login" className="underline underline-offset-4 hover:text-primary font-semibold text-emerald-700 dark:text-emerald-400">
          Fazer Login
        </Link>
      </p>
    </>
  );
}

// Componente da Página que usa Suspense para useSearchParams
export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-gray-800 dark:via-gray-900 dark:to-black">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white rounded-xl shadow-2xl dark:bg-gray-800/90 backdrop-blur-md">
        <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}