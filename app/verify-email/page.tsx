// src/app/verify-email/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'; // Ícones

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verificando seu email...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação não encontrado na URL.');
      return;
    }

    const verifyToken = async () => {
      try {
        // Adicionar um pequeno delay para o usuário ver o estado de loading
        // await new Promise(resolve => setTimeout(resolve, 1500));

        const res = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: 'GET',
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verificado com sucesso!');
          // Opcional: redirecionar para o login após alguns segundos
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Falha ao verificar o email.');
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        setStatus('error');
        setMessage('Ocorreu um erro de conexão. Tente novamente mais tarde.');
      }
    };

    verifyToken();
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-gray-800 dark:via-gray-900 dark:to-black text-center">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Verificando...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2 text-green-600 dark:text-green-400">Sucesso!</h1>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2 text-red-600 dark:text-red-400">Ooops!</h1>
          </>
        )}
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        {status !== 'loading' && (
          <Link href="/login" className="inline-block px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-300 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:focus:ring-emerald-800">
            Ir para Login
          </Link>
        )}
      </div>
    </div>
  );
}