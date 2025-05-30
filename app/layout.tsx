// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
// Navbar NÃO é mais importado ou usado aqui
import NextAuthProvider from '@/components/providers/NextAuthProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Adenosis | Livraria',
  description: 'Seu marketplace local de livros.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col min-h-screen bg-background dark:bg-background`}>
        <NextAuthProvider>
          <Toaster 
            position="top-center"
            reverseOrder={false}
          />
          {/* Navbar foi removido daqui */}
          
          {/* A tag <main> agora é mais simples e ocupará o espaço disponível */}
          <main className="flex-1"> 
            {children} {/* O conteúdo da página (incluindo o Navbar, se a página o tiver) será renderizado aqui */}
          </main>
          
          {/* Você pode adicionar um Footer global aqui se desejar, ou também por página */}
          {/* Exemplo de Footer global:
            <footer className="border-t py-8 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Adenosis Livraria. Todos os direitos reservados.
            </footer>
          */}
        </NextAuthProvider>
      </body>
    </html>
  );
}