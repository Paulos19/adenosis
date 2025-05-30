// src/components/skeletons/VerifyEmailSkeleton.tsx
import { Loader2 } from 'lucide-react';

export function VerifyEmailSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
      <Loader2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-4" />
      <h1 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-gray-100">
        Verificando seu email...
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Aguarde um momento.
      </p>
    </div>
  );
}