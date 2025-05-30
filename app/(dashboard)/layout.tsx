// src/app/(dashboard)/layout.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link'; // Import Link
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { PanelLeftClose, PanelLeftOpen, Menu, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Import Sheet

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
  };

  const sidebarVariants = {
    open: { width: '16rem', transition: { type: 'spring', stiffness: 300, damping: 30 } }, // md:w-64
    closed: { width: '4.5rem', transition: { type: 'spring', stiffness: 300, damping: 30 } }, // Aprox. para ícones
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* --- Desktop Sidebar --- */}
      <motion.div
        variants={sidebarVariants}
        initial={false} // Não animar no load inicial, aplicar estado direto
        animate={isDesktopSidebarOpen ? "open" : "closed"}
        className="relative hidden md:flex flex-none flex-col bg-white dark:bg-gray-900 border-r dark:border-gray-700"
        // `flex-col` para permitir que a sidebar interna gerencie seu conteúdo verticalmente
      >
        <DashboardSidebar isOpen={isDesktopSidebarOpen} /> {/* Passa o estado para a sidebar */}
        
        {/* Botão de Toggle para Desktop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDesktopSidebar}
          className="absolute top-5 right-0 translate-x-1/2 z-10 bg-background hover:bg-muted border rounded-full hidden md:flex p-2"
          aria-label={isDesktopSidebarOpen ? "Recolher sidebar" : "Expandir sidebar"}
        >
          {isDesktopSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
      </motion.div>

      {/* --- Área Principal (Mobile Header + Conteúdo) --- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header com o gatilho do Sheet */}
        <header className="md:hidden sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 dark:border-gray-800">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="rounded-lg">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0"> {/* Remove padding para DashboardSidebar controlar */}
              {/* A sidebar dentro do Sheet estará sempre "aberta" em termos de conteúdo */}
              <DashboardSidebar isOpen={true} isMobile={true} /> 
            </SheetContent>
          </Sheet>
          
          {/* Logo/Título no Mobile Header */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-emerald-600 dark:text-emerald-400">
            <Palette className="h-6 w-6" />
            <span>Adenosis</span>
          </Link>
          {/* Placeholder para ações no mobile header, ex: avatar do usuário */}
          <div className="w-8 h-8"></div> 
        </header>

        {/* Área de Conteúdo Principal */}
        <main className="flex-grow p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}