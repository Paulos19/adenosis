// src/components/admin/skeletons/AdminBookFormSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function AdminBookFormSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-10 w-1/2 md:w-1/3 bg-slate-700 rounded-md" /> {/* Título */}
        <Skeleton className="h-10 w-24 bg-slate-700 rounded-md" /> {/* Botão Cancelar/Voltar */}
      </div>

      <div className="space-y-7 p-6 md:p-8 bg-slate-800 rounded-lg shadow-md">
        {/* Skeleton para Fieldset 1 */}
        <div className="space-y-5">
          <Skeleton className="h-6 w-1/4 bg-slate-600 mb-3 rounded-md" /> {/* Legenda */}
          {[...Array(3)].map((_, i) => (
            <div key={`fs1-skel-${i}`} className="space-y-1.5">
              <Skeleton className="h-4 w-1/3 bg-slate-600 rounded-md" /> {/* Label */}
              <Skeleton className="h-10 w-full bg-slate-700 rounded-md" /> {/* Input/Textarea */}
            </div>
          ))}
        </div>

        {/* Skeleton para Fieldset Imagem */}
        <div className="space-y-3 pt-4 border-t border-slate-700">
          <Skeleton className="h-6 w-1/3 bg-slate-600 mb-2 rounded-md" /> {/* Legenda */}
          <Skeleton className="h-4 w-1/4 bg-slate-600 rounded-md" /> {/* Label do input file */}
          <Skeleton className="h-10 w-full bg-slate-700 rounded-md" /> {/* Input file */}
          <div className="mt-4 w-32 h-48">
            <Skeleton className="w-full h-full rounded-md bg-slate-700" /> {/* Preview */}
          </div>
        </div>
        
        {/* Skeleton para Fieldset 2 */}
        <div className="space-y-5 pt-4 border-t border-slate-700">
          <Skeleton className="h-6 w-2/5 bg-slate-600 mb-3 rounded-md" /> {/* Legenda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={`fs2-skel-${i}`} className="space-y-1.5">
                <Skeleton className="h-4 w-1/3 bg-slate-600 rounded-md" /> {/* Label */}
                <Skeleton className="h-10 w-full bg-slate-700 rounded-md" /> {/* Input/Select */}
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton para Fieldset 3 (Opcional) */}
        <div className="space-y-5 pt-4 border-t border-slate-700">
           <Skeleton className="h-6 w-1/2 bg-slate-600 mb-3 rounded-md" /> {/* Legenda */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={`fs3-skel-${i}`} className="space-y-1.5">
                <Skeleton className="h-4 w-1/3 bg-slate-600 rounded-md" /> {/* Label */}
                <Skeleton className="h-10 w-full bg-slate-700 rounded-md" /> {/* Input */}
              </div>
            ))}
          </div>
        </div>

        {/* Botões de Ação Skeleton */}
        <div className="flex justify-end space-x-3 pt-4 !mt-8">
            <Skeleton className="h-10 w-24 bg-slate-700 rounded-md" />
            <Skeleton className="h-10 w-32 bg-slate-700 rounded-md" />
        </div>
      </div>
    </div>
  );
}