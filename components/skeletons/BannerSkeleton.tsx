// src/components/skeletons/BannerSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function BannerSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex items-center h-full">
      <div className="max-w-lg lg:max-w-xl text-center md:text-left py-20 md:py-0"> {/* Adicionado py para visibilidade */}
        <Skeleton className="h-6 w-1/4 bg-slate-700 mb-3" />
        <Skeleton className="h-12 md:h-16 w-full bg-slate-600 mb-4" />
        <Skeleton className="h-4 w-1/3 bg-slate-700 mb-4" />
        <Skeleton className="h-20 w-full bg-slate-700 mb-6" /> {/* Para descrição */}
        <Skeleton className="h-4 w-1/2 bg-slate-700 mb-8" /> {/* Para vendedor */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center md:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
          <Skeleton className="h-12 w-40 bg-slate-500 rounded-md" />
          <Skeleton className="h-12 w-48 bg-slate-500 rounded-md" />
        </div>
      </div>
    </div>
  );
}