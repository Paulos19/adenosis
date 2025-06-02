// src/components/admin/AdminSidebar.tsx
'use client'; 

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Users, Library, MessageSquareText, BarChartHorizontalBig, Palette, Settings as SettingsIcon } from "lucide-react"; // Renomeado Settings para SettingsIcon
import { cn } from "@/lib/utils";
// Importe Image se for usar a logo
// import Image from 'next/image';

const adminNavLinks = [
  { href: "/admin/dashboard", label: "Visão Geral", icon: ShieldCheck },
  { href: "/admin/dashboard/users", label: "Usuários", icon: Users },
  { href: "/admin/dashboard/books", label: "Livros (Todos)", icon: Library },
  { href: "/admin/dashboard/categories", label: "Categorias", icon: Palette },
  { href: "/admin/dashboard/ratings", label: "Avaliações", icon: MessageSquareText },
  { href: "/admin/dashboard/orders", label: "Pedidos/Reservas", icon: BarChartHorizontalBig },
  { href: "/admin/dashboard/site-settings", label: "Config. Site", icon: SettingsIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col overflow-y-auto px-3 py-4 md:px-2 bg-slate-950 border-r border-slate-800">
      <Link
        className="mb-4 flex h-16 items-center justify-start rounded-md bg-emerald-700 hover:bg-emerald-800 transition-colors p-4 md:h-20"
        href="/admin/dashboard"
      >
        {/* <Image src="/logo.png" alt="Adenosis Admin Logo" width={32} height={32} className="h-8 w-8 mr-2" /> */}
        <ShieldCheck className="w-8 h-8 text-white mr-2 shrink-0" />
        <div className="text-xl text-white font-semibold">Admin Adenosis</div>
      </Link>
      <div className="flex grow flex-col justify-between space-y-2">
        <nav className="flex flex-col space-y-1">
          {adminNavLinks.map((link) => {
            const LinkIcon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "flex h-[48px] items-center gap-3 rounded-md p-3 text-sm font-medium text-gray-300 transition-colors",
                  "hover:bg-slate-800 hover:text-emerald-400",
                  pathname === link.href && "bg-slate-800 text-emerald-400 border-l-2 border-emerald-400" // Destaque para link ativo
                )}
              >
                <LinkIcon className="w-5 h-5 shrink-0" />
                <p className="hidden md:block">{link.label}</p>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto"> </div>
      </div>
    </div>
  );
}