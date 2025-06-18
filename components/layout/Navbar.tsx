// src/components/layout/Navbar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  LogIn, LogOut, LayoutDashboard, Settings, 
  BookUser, Menu, Search as SearchIcon, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SearchModal } from '@/components/search/SearchModal';

const mainNavLinks = [
  { href: "/books", label: "Livros" },
  { href: "/categories", label: "Categorias" },
  { href: "/sellers", label: "Vendedores" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); 
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  };

  const user = session?.user;
  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  const navBaseTextColor = isScrolled ? "text-slate-200" : "text-white";
  const navHoverTextColor = isScrolled ? "hover:text-emerald-400" : "hover:text-slate-200";
  const navIconBgHover = isScrolled ? "hover:bg-slate-700" : "hover:bg-white/10";

  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 w-full z-40 transition-colors duration-300 ease-in-out",
        isScrolled
          ? "border-b border-slate-700/60 bg-slate-900/85 backdrop-blur-lg shadow-lg" 
          : "bg-transparent border-b border-transparent" 
      )}>
        <div className="container mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Esquerda: Botão Menu Mobile (em telas pequenas) e Logo */}
          <div className="flex items-center">
            <div className="md:hidden mr-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("transition-colors rounded-md", navBaseTextColor, navIconBgHover)}>
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-3/4 max-w-xs sm:max-w-sm bg-slate-950 border-r-slate-800 text-gray-200 pt-8 pr-0">
                  <div className='h-full flex flex-col'>
                    <Link 
                      href="/" 
                      className="flex items-center space-x-2 px-6 mb-6" 
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {/* Logo no menu mobile */}
                      <Image src="/logo.png" alt="Adenosis Livraria Logo" width={120} height={80} /> {/* Ajuste height/width se necessário */}
                    </Link>
                    <nav className="flex-grow flex flex-col space-y-1 px-3 overflow-y-auto">
                      {mainNavLinks.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          className="text-gray-300 hover:text-emerald-400 hover:bg-slate-800/60 rounded-md p-3 text-base block"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}
                      <DropdownMenuSeparator className="bg-slate-700 my-3" />
                      {!user && status !== 'loading' && (
                        <>
                          <Button asChild className="w-full justify-start text-gray-300 hover:text-emerald-400 hover:bg-slate-800/60 p-3 text-base rounded-md" variant="ghost" onClick={() => {router.push('/login'); setIsMobileMenuOpen(false);}}>
                              <div className="flex items-center"><LogIn className="mr-2 h-5 w-5" /> Login</div>
                          </Button>
                          <Button asChild className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700 p-3 text-base rounded-md mt-2" onClick={() => {router.push('/register'); setIsMobileMenuOpen(false);}}>
                              <div className="flex items-center"><BookUser className="mr-2 h-5 w-5" /> Registrar</div>
                          </Button>
                        </>
                      )}
                       {user && (
                          <>
                           { (user.role === 'SELLER' || user.role === 'ADMIN') && (
                              <Button asChild className="w-full justify-start text-gray-300 hover:text-emerald-400 hover:bg-slate-800/60 p-3 text-base rounded-md" variant="ghost" onClick={() => {router.push('/dashboard'); setIsMobileMenuOpen(false);}}>
                                  <div className="flex items-center"><LayoutDashboard className="mr-2 h-5 w-5" /> Dashboard</div>
                              </Button>
                           )}
                            <Button asChild className="w-full justify-start text-gray-300 hover:text-emerald-400 hover:bg-slate-800/60 p-3 text-base rounded-md" variant="ghost" onClick={() => {router.push('/wishlist'); setIsMobileMenuOpen(false);}}>
                                <div className="flex items-center"><Heart className="mr-2 h-5 w-5" /> Lista de Desejos</div>
                            </Button>
                            <Button asChild className="w-full justify-start text-gray-300 hover:text-emerald-400 hover:bg-slate-800/60 p-3 text-base rounded-md" variant="ghost" onClick={() => {router.push('/settings'); setIsMobileMenuOpen(false);}}>
                                <div className="flex items-center"><Settings className="mr-2 h-5 w-5" /> Configurações</div>
                            </Button>
                            <DropdownMenuSeparator className="bg-slate-700 my-3" />
                            <Button variant="ghost" onClick={() => {handleLogout(); setIsMobileMenuOpen(false);}} className="w-full justify-start text-red-400 hover:text-red-500 hover:bg-slate-800/60 p-3 text-base rounded-md">
                              <div className="flex items-center"><LogOut className="mr-2 h-5 w-5" /> Sair</div>
                            </Button>
                          </>
                       )}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            {/* Logo Principal - APENAS IMAGEM */}
            <Link href="/" className="flex items-center group shrink-0 md:mr-6" aria-label="Página Inicial da Adenosis Livraria">
              <Image
                src="/logo.png" 
                alt="Adenosis Livraria Logo"
                width={200} // Largura da sua logo (ajuste conforme necessário)
                height={130} // Altura da sua logo (ajuste para manter proporção)
                className="transition-opacity group-hover:opacity-80" // Altura máxima para se encaixar na navbar
                priority // Importante para LCP se for o logo principal
              />
              {/* O span com o texto "Adenosis Livraria" foi REMOVIDO daqui */}
            </Link>
          </div>

          {/* Centro: Navegação Principal para Desktop */}
          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-x-6 lg:gap-x-8">
            {mainNavLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  isScrolled ? "text-gray-300 hover:text-emerald-400" : "text-gray-200 hover:text-white/90"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Direita: Ações do Usuário */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3">
            <Button
              variant="ghost" size="icon"
              onClick={() => setIsSearchModalOpen(true)}
              className={cn("transition-colors rounded-full w-9 h-9 text-lg", navBaseTextColor, navIconBgHover)}
              aria-label="Abrir busca"
            >
              <SearchIcon className="h-5 w-5" />
            </Button>

            {user && (
              <Button 
                variant="ghost" size="icon" 
                onClick={() => router.push('/wishlist')} 
                className={cn("hidden sm:inline-flex transition-colors rounded-full w-9 h-9", navBaseTextColor, navIconBgHover)}>
                <Heart className="h-5 w-5" />
                <span className="sr-only">Lista de Desejos</span>
              </Button>
            )}

            {status === 'loading' && (<Skeleton className={cn("h-9 w-9 rounded-full", isScrolled ? "bg-slate-700" : "bg-white/20")} />)}

            {status !== 'loading' && !user && (
              <div className="hidden md:flex items-center space-x-2 shrink-0">
                <Button 
                  variant="ghost" onClick={() => router.push('/login')}
                  className={cn("transition-colors rounded-md text-sm h-9 px-3", !isScrolled && "text-white border-white/70 hover:bg-white/10 hover:text-white focus:ring-white/30", isScrolled && "border-slate-700 hover:bg-slate-800 text-slate-200")}>
                  <LogIn className="mr-1.5 h-4 w-4" /> Login
                </Button>
                <Button 
                  onClick={() => router.push('/register')}
                  className={cn("transition-colors rounded-md text-sm h-9 px-3 text-white", isScrolled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-500 hover:bg-emerald-600")}>
                  <BookUser className="mr-1.5 h-4 w-4" /> Registrar
                </Button>
              </div>
            )}

            {status !== 'loading' && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 shrink-0">
                    <Avatar className={cn("h-9 w-9 border-2 transition-colors", isScrolled ? "border-slate-600" : "border-white/50")}>
                      <AvatarImage src={user.image || undefined} alt={user.name || "Usuário"} />
                      <AvatarFallback className={cn("transition-colors text-xs font-semibold", isScrolled ? "bg-slate-700 text-gray-300" : "bg-slate-800/60 text-white")}>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-900 border-slate-800 text-gray-200 shadow-2xl" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1 p-1">
                      <p className="text-sm font-medium leading-none text-gray-50">{user.name}</p>
                      <p className="text-xs leading-none text-slate-400">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700"/>
                  { (user.role === 'SELLER' || user.role === 'ADMIN') && (
                      <DropdownMenuItem onClick={() => router.push('/dashboard')} className="hover:!bg-slate-800 focus:!bg-slate-800 cursor-pointer">
                          <LayoutDashboard className="mr-2 h-4 w-4 text-emerald-400" /><span>Dashboard</span>
                      </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push('/wishlist')} className="hover:!bg-slate-800 focus:!bg-slate-800 cursor-pointer">
                      <Heart className="mr-2 h-4 w-4 text-emerald-400" /><span>Lista de Desejos</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')} className="hover:!bg-slate-800 focus:!bg-slate-800 cursor-pointer">
                    <Settings className="mr-2 h-4 w-4 text-emerald-400" /><span>Configurações</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700"/>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:!text-red-300 focus:!bg-red-700/30 focus:!text-red-300 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /><span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <SearchModal isOpen={isSearchModalOpen} onOpenChange={setIsSearchModalOpen} />
    </>
  );
}