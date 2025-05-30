// src/components/skeletons/LoginFormSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md p-6 sm:p-8 space-y-7 bg-white rounded-xl shadow-2xl dark:bg-gray-800/90 backdrop-blur-md">
      {/* Skeleton para o Título e Subtítulo */}
      <div className="text-center mb-8 space-y-2">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>

      {/* Skeleton para os campos do formulário */}
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Input */}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Input */}
        </div>
        
        {/* Skeleton para o Botão */}
        <Skeleton className="h-10 w-full !mt-8" /> {/* Botão */}
      </div>
      
      {/* Skeleton para o link de registro */}
      <div className="text-center">
        <Skeleton className="h-4 w-3/5 mx-auto" />
      </div>
    </div>
  );
}