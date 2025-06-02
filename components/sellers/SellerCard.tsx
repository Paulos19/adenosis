// src/components/sellers/SellerCard.tsx
import Image from "next/image";
import Link from "next/link";
import { SellerProfile } from "@prisma/client"; // User não é mais necessário aqui diretamente
import { Button } from "@/components/ui/button";
import { Star, BookCopy, Store, Eye, ArrowRight, ImageOff } from "lucide-react"; // Adicionado ImageOff
import { cn } from "@/lib/utils";

// Tipo importado da API de /api/sellers
import type { SellerProfileWithStatsAndAvgRating } from "@/app/api/sellers/route";

interface SellerCardProps {
  seller: SellerProfileWithStatsAndAvgRating;
}

export function SellerCard({ seller }: SellerCardProps) {
  const averageRatingDisplay = seller.averageRating 
    ? seller.averageRating.toFixed(1) 
    : "N/A";
  const totalRatings = seller._count.ratingsReceived;

  // Usa storeLogoUrl se disponível, senão um placeholder
  const logoSrc = seller.storeLogoUrl || "/placeholder-store-logo.png"; // Crie este placeholder em /public

  return (
    <div className={cn(
      "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ease-in-out h-full", // h-full para cards de mesma altura em um grid
      "bg-slate-800/80 border-slate-700 text-gray-200 backdrop-blur-sm", 
      "hover:shadow-xl hover:shadow-emerald-500/20 hover:border-emerald-500/60 transform hover:scale-[1.02]"
    )}>
      {/* Banner/Imagem Superior do Card (Pode usar seller.storeBannerUrl no futuro) */}
      <Link href={`/sellers/${seller.id}`} className="block" aria-label={`Visitar loja de ${seller.storeName}`}>
        <div className="aspect-[16/7] sm:aspect-video bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700 group-hover:from-emerald-700/40 group-hover:to-teal-800/40 transition-all duration-300 flex items-center justify-center rounded-t-2xl relative overflow-hidden">
          {/* Se tiver seller.storeBannerUrl, usar aqui. Senão, um placeholder visual. */}
          {/* <Image src={seller.storeBannerUrl || "/placeholder-banner.png"} alt={`Banner de ${seller.storeName}`} layout="fill" objectFit="cover" /> */}
          <Store className="h-16 w-16 text-emerald-400 opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
            <Eye className="h-10 w-10 text-white opacity-80" />
          </div>
        </div>
      </Link>

      <div className="p-5 flex flex-col flex-grow">
        {/* Logo da Loja (Circular) e Nome */}
        <div className="flex items-start space-x-4 -mt-12 mb-3 relative z-10"> {/* -mt-12 para sobrepor ao banner */}
          <div className={cn(
            "relative w-20 h-20 shrink-0 rounded-full overflow-hidden border-4 transition-colors",
            "border-slate-800 group-hover:border-emerald-500 bg-slate-700 flex items-center justify-center" // Fundo para o caso de não ter logo
          )}>
            <Image 
              src={logoSrc} 
              alt={`Logo de ${seller.storeName}`}
              fill
              style={{ objectFit: "cover" }} // 'cover' para preencher o círculo
              sizes="80px"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-store-logo.png'; }} // Fallback se a URL quebrar
            />
             {!seller.storeLogoUrl && ( // Mostra um ícone se não houver logoSrc real além do placeholder
                <Store className="h-10 w-10 text-slate-500" />
             )}
          </div>
          <div className="pt-10 min-w-0"> {/* pt-10 para alinhar com a base do logo */}
            <h3 className="text-xl font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors truncate" title={seller.storeName}>
              <Link href={`/sellers/${seller.id}`}>
                {seller.storeName}
              </Link>
            </h3>
          </div>
        </div>
        
        {/* Estatísticas */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
          <div className="flex items-center" title={`Avaliação Média: ${averageRatingDisplay} de ${totalRatings} ${totalRatings === 1 ? 'avaliação' : 'avaliações'}`}>
            <Star className={cn("h-4 w-4 mr-1", seller.averageRating && seller.averageRating > 0 ? "text-yellow-400 fill-yellow-400" : "text-slate-500")} />
            <span>{averageRatingDisplay}</span>
            {totalRatings > 0 && <span className="ml-1 text-xs text-slate-400">({totalRatings})</span>}
          </div>
          <div className="flex items-center" title="Livros Cadastrados">
            <BookCopy className="h-4 w-4 mr-1.5 text-emerald-400/80" />
            <span>{seller._count.books} {seller._count.books === 1 ? 'Livro' : 'Livros'}</span>
          </div>
        </div>

        {/* Descrição Curta */}
        {seller.storeDescription && (
            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mt-2 flex-grow min-h-[3.75rem]"> {/* Garante altura mínima para consistência */}
                {seller.storeDescription}
            </p>
        )}
         {!seller.storeDescription && (
             <p className="text-xs text-slate-500 italic line-clamp-3 leading-relaxed mt-2 flex-grow min-h-[3.75rem]">
                Nenhuma descrição fornecida por esta livraria.
            </p>
         )}


        <div className="!mt-auto pt-4"> {/* Empurra o botão para o final do card */}
          <Button 
            asChild 
            className={cn(
                "w-full font-semibold transition-all duration-200 ease-in-out transform hover:scale-105",
                "bg-emerald-600 hover:bg-emerald-700 text-white",
                "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-slate-900"
            )}
            title={`Visitar loja de ${seller.storeName}`}
          >
            <Link href={`/sellers/${seller.id}`} className="flex items-center justify-center">
              Visitar Loja <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}