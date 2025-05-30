// src/app/(auth)/login/page.tsx
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm'; // Importe o componente de formulário
import { LoginFormSkeleton } from '@/components/skeletons/LoginFormSkeleton'; // Importe o skeleton

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-gray-800 dark:via-gray-900 dark:to-black">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}