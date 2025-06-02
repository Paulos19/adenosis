// src/components/admin/skeletons/AdminBooksPageSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function AdminBooksPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Skeleton className="h-10 w-full sm:w-1/2 md:w-1/3 bg-slate-700 rounded-md" /> {/* Título */}
      </div>
      
      {/* Filtros Skeleton */}
      <div className="p-4 bg-slate-800/70 rounded-lg border border-slate-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {[...Array(4)].map((_, i) => (
            <div key={`filter-skel-${i}`} className="space-y-1">
              <Skeleton className="h-4 w-20 bg-slate-600 rounded-md" />
              <Skeleton className="h-10 w-full bg-slate-700 rounded-md" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32 bg-slate-700 rounded-md" />
        </div>
      </div>

      {/* Tabela Skeleton */}
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        {/* Cabeçalho da Tabela Skeleton */}
        <div className="flex items-center h-[49px] space-x-4 p-3 border-b border-slate-700 bg-slate-800/70">
            <Skeleton className="h-4 w-[40px] bg-slate-600 rounded" /> {/* Capa */}
            <Skeleton className="h-4 flex-[2] bg-slate-600 rounded" /> {/* Titulo/Autor */}
            <Skeleton className="h-4 flex-1 hidden md:block bg-slate-600 rounded" /> {/* Vendedor */}
            <Skeleton className="h-4 flex-1 hidden lg:block bg-slate-600 rounded" /> {/* Categoria */}
            <Skeleton className="h-4 w-20 bg-slate-600 rounded" /> {/* Preço */}
            <Skeleton className="h-4 w-12 hidden sm:block bg-slate-600 rounded" /> {/* Est. */}
            <Skeleton className="h-4 w-24 bg-slate-600 rounded" /> {/* Status */}
            <Skeleton className="h-4 w-[100px] bg-slate-600 rounded" /> {/* Ações */}
        </div>
        {/* Linhas da Tabela Skeleton */}
        {[...Array(5)].map((_, i) => (
          <div key={`row-skel-${i}`} className="flex items-center space-x-4 p-2 sm:p-3 h-[77px] border-b border-slate-700 last:border-b-0">
            <Skeleton className="h-[60px] w-[40px] rounded bg-slate-600" /> {/* Capa */}
            <div className="space-y-2 flex-[2]">
              <Skeleton className="h-4 w-3/4 bg-slate-600 rounded" />
              <Skeleton className="h-3 w-1/2 bg-slate-600 rounded" />
            </div>
            <div className="hidden md:flex flex-1 items-center">
                <Skeleton className="h-4 w-2/3 bg-slate-600 rounded"/>
            </div>
             <div className="hidden lg:flex flex-1 items-center">
                <Skeleton className="h-4 w-2/3 bg-slate-600 rounded"/>
            </div>
            <Skeleton className="h-6 w-20 bg-slate-600 rounded-md" /> {/* Preço */}
            <Skeleton className="h-6 w-12 hidden sm:block bg-slate-600 rounded-md" /> {/* Est. */}
            <Skeleton className="h-6 w-24 bg-slate-600 rounded-md" /> {/* Status */}
            <div className="flex justify-end w-[100px] space-x-1">
                <Skeleton className="h-7 w-7 bg-slate-600 rounded-md" />
                <Skeleton className="h-7 w-7 bg-slate-600 rounded-md" />
                <Skeleton className="h-7 w-7 bg-slate-600 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
          <Skeleton className="h-10 w-64 bg-slate-700 rounded-md" /> {/* Paginação */}
      </div>
    </div>
  );
}