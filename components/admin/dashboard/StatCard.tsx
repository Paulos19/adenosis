// src/components/admin/dashboard/StatCard.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react"; // Para tipar o ícone

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon; // Ícone opcional da lucide-react
  description?: string;
  isLoading?: boolean;
  className?: string;
  iconClassName?: string; // Classe para customizar cor/tamanho do ícone
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading = false,
  className,
  iconClassName = "text-emerald-400", // Cor padrão verde para ícones
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("bg-slate-800/70 border-slate-700", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-5 w-2/3 bg-slate-600" /> {/* Skeleton para o título */}
          {Icon && <Skeleton className="h-6 w-6 bg-slate-600 rounded-sm" />} {/* Skeleton para o ícone */}
        </CardHeader>
        <CardContent className="space-y-1">
          <Skeleton className="h-8 w-1/2 bg-slate-500" /> {/* Skeleton para o valor */}
          {description && <Skeleton className="h-4 w-full bg-slate-600" />} {/* Skeleton para a descrição */}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-slate-800/70 border-slate-700 text-gray-200 hover:border-emerald-500/60 transition-colors", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
        {Icon && <Icon className={cn("h-5 w-5 text-slate-400", iconClassName)} />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white">{value}</div>
        {description && (
          <p className="text-xs text-slate-400 pt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}