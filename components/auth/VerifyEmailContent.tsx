// src/components/auth/VerifyEmailContent.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Import Button

export function VerifyEmailContent() {
  const searchParams = useSearchParams(); // Agora usado dentro de um componente filho do Suspense
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verificando seu email...');

  useEffect(() => {
    // Se não houver token na primeira renderização do lado do cliente, define o erro.
    // O `Suspense` garante que `searchParams` estará disponível aqui.
    if (!token && status === 'loading') { // Checa status para evitar re-setar se já houve erro
      setStatus('error');
      setMessage('Token de verificação não encontrado ou inválido.');
      return;
    }
    
    if (token && status === 'loading') { // Processar apenas se houver token e ainda estiver carregando
        const verifyToken = async () => {
        try {
            const res = await fetch(`/api/auth/verify-email?token=${token}`, {
            method: 'GET',
            });

            const data = await res.json();

            if (res.ok) {
            setStatus('success');
            setMessage(data.message || 'Email verificado com sucesso!');
            setTimeout(() => {
                router.push('/login');
            }, 3000);
            } else {
            setStatus('error');
            setMessage(data.error || 'Falha ao verificar o email. O link pode ter expirado ou ser inválido.');
            }
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            setStatus('error');
            setMessage('Ocorreu um erro de conexão. Tente novamente mais tarde.');
        }
        };
        verifyToken();
    }
  }, [token, router, status]); // Adicionado status à dependência para evitar loops se token for nulo inicialmente

  return (
    <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full text-center">
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
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href={status === 'success' ? '/login' : '/login'}> {/* Ajuste o link se necessário */}
            {status === 'success' ? 'Ir para Login' : 'Tentar Novamente ou Ir para Login'}
          </Link>
        </Button>
      )}
    </div>
  );
}