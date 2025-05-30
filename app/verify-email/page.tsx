import { Suspense } from 'react';
import { VerifyEmailContent } from '@/components/auth/VerifyEmailContent';
import { VerifyEmailSkeleton } from '@/components/skeletons/VerifyEmailSkeleton';

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-gray-800 dark:via-gray-900 dark:to-black">
      <Suspense fallback={<VerifyEmailSkeleton />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}