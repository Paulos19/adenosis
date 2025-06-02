// src/components/admin/skeletons/AdminUsersPageSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function AdminUsersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Skeleton className="h-10 w-48 md:w-1/3 bg-slate-700 rounded-md" /> {/* Título */}
        <Skeleton className="h-10 w-full sm:w-44 bg-slate-700 rounded-md" /> {/* Botão Adicionar Usuário */}
      </div>
      
      {/* Filtros */}
      <div className="p-4 bg-slate-800/70 rounded-lg border border-slate-700 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-grow space-y-1">
            <Skeleton className="h-4 w-24 bg-slate-600 rounded-md" />
            <Skeleton className="h-10 w-full bg-slate-700 rounded-md" />
        </div>
        <div className="w-full sm:w-auto min-w-[180px] space-y-1">
            <Skeleton className="h-4 w-20 bg-slate-600 rounded-md" />
            <Skeleton className="h-10 w-full bg-slate-700 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full sm:w-32 bg-slate-700 rounded-md" /> {/* Botão Aplicar Filtros */}
      </div>

      {/* Tabela Skeleton */}
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        {/* Cabeçalho da Tabela Skeleton */}
        <div className="flex items-center space-x-4 p-4 border-b border-slate-700 bg-slate-800/70">
            <Skeleton className="h-4 w-12 hidden sm:block bg-slate-600 rounded" /> {/* Avatar col */}
            <Skeleton className="h-4 flex-1 bg-slate-600 rounded" /> {/* Nome & Email col */}
            <Skeleton className="h-4 flex-1 hidden md:block bg-slate-600 rounded" /> {/* Loja col */}
            <Skeleton className="h-4 w-20 bg-slate-600 rounded" /> {/* Role col */}
            <Skeleton className="h-4 w-28 hidden lg:block bg-slate-600 rounded" /> {/* Desde col */}
            <Skeleton className="h-4 w-24 bg-slate-600 rounded" /> {/* Ações col */}
        </div>
        {/* Linhas da Tabela Skeleton */}
        {[...Array(5)].map((_, i) => (
          <div key={`content-user-skel-${i}`} className="flex items-center space-x-4 p-4 border-b border-slate-700 last:border-b-0">
            <Skeleton className="h-10 w-10 rounded-full bg-slate-600 hidden sm:block" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4 bg-slate-600 rounded" />
              <Skeleton className="h-4 w-1/2 bg-slate-600 rounded" />
            </div>
            <div className="hidden md:flex flex-1 items-center">
                <Skeleton className="h-4 w-2/3 bg-slate-600 rounded"/>
            </div>
            <Skeleton className="h-6 w-20 bg-slate-600 rounded-md" />
            <div className="hidden lg:flex items-center w-28">
                 <Skeleton className="h-4 w-full bg-slate-600 rounded"/>
            </div>
            <div className="flex justify-end w-24 space-x-2">
                <Skeleton className="h-8 w-8 bg-slate-600 rounded-md" />
                <Skeleton className="h-8 w-8 bg-slate-600 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Paginação Skeleton */}
      <div className="mt-8 flex justify-center">
          <Skeleton className="h-10 w-64 bg-slate-700 rounded-md" />
      </div>
    </div>
  );
}