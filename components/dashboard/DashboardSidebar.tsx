// src/components/dashboard/DashboardSidebar.tsx
'use client'; 

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, BarChart3, Settings, Palette, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from 'framer-motion';
import { SheetClose } from "@/components/ui/sheet"; // Importar SheetClose

interface DashboardSidebarProps {
  isOpen: boolean;
  isMobile?: boolean; // Nova prop para identificar se está no modo mobile (dentro de um Sheet)
}

const dashboardLinks = [
  { href: "/dashboard", label: "Visão Geral", icon: Home },
  { href: "/dashboard/books", label: "Meus Livros", icon: BookOpen },
  { href: "/dashboard/reservations", label: "Reservas", icon: ShoppingCart },
  { href: "/dashboard/analytics", label: "Análises", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
];

export function DashboardSidebar({ isOpen, isMobile = false }: DashboardSidebarProps) {
  const pathname = usePathname();

  const LinkWrapper = isMobile ? SheetClose : ({ children }: { children: React.ReactNode }) => <>{children}</>;

  return (
    <div className={cn(
        "flex h-full flex-col overflow-y-auto px-2 py-4 transition-all duration-300 ease-in-out",
        // isOpen ? "md:px-2" : "md:px-1 items-center" // Comentado para simplificar, ajuste se necessário
    )}>
      <LinkWrapper>
        <Link
          className={cn(
              "mb-4 flex items-center rounded-md bg-emerald-600 p-4 transition-all duration-300 ease-in-out",
              isOpen ? "h-16 md:h-20 justify-start" : "h-12 md:h-14 w-12 md:w-14 justify-center mx-auto"
          )}
          href="/"
          title="Adenosis Livraria - Voltar para Home"
        >
          <Palette className={cn("text-white transition-all duration-300 ease-in-out", isOpen ? "w-7 h-7 mr-2" : "w-6 h-6")} />
          <AnimatePresence>
          {(isOpen || isMobile) && ( // Mostrar texto se isOpen (desktop) ou se for mobile (onde isOpen é true)
              <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
              >
                  <span className="text-xl text-white font-semibold">Adenosis</span>
              </motion.div>
          )}
          </AnimatePresence>
        </Link>
      </LinkWrapper>
      
      <nav className="flex flex-col space-y-1 flex-grow">
        {dashboardLinks.map((link) => {
          const LinkIcon = link.icon;
          const linkContent = (
            <>
              <LinkIcon className={cn("transition-all duration-300 ease-in-out", (isOpen || isMobile) ? "w-5 h-5" : "w-6 h-6")} />
              <AnimatePresence>
                {(isOpen || isMobile) && ( // Mostrar texto se isOpen (desktop) ou se for mobile
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {link.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </>
          );

          return (
            <LinkWrapper key={link.label}>
              <Link
                href={link.href}
                title={link.label}
                className={cn(
                  "flex h-[48px] items-center gap-3 rounded-md p-3 text-sm font-medium transition-colors duration-150 ease-in-out",
                  "hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-gray-800 dark:hover:text-emerald-400",
                  {
                    "bg-emerald-100 text-emerald-700 dark:bg-gray-800 dark:text-emerald-400": pathname === link.href,
                    "text-gray-700 dark:text-gray-300": pathname !== link.href,
                  },
                  (isOpen || isMobile) ? "justify-start px-3" : "justify-center w-12 mx-auto"
                )}
              >
                {linkContent}
              </Link>
            </LinkWrapper>
          );
        })}
      </nav>
      {/* Botão de toggle desktop foi movido para DashboardLayout */}
    </div>
  );
}