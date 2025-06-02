// src/components/seller/SellerBooksBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BookWithDetails } from '@/components/books/BookCard'; // Reutilize o tipo
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface SellerBooksBannerProps {
  books: BookWithDetails[]; // Livros do vendedor para o banner
  storeName: string; // Nome da loja para fallback
}

export function SellerBooksBanner({ books, storeName }: SellerBooksBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (books.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % books.length);
    }, 7000); // Mudar a cada 7 segundos
    return () => clearInterval(timer);
  }, [books]);

  if (!books || books.length === 0) {
    // Fallback se não houver livros para o banner
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 p-4">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 shadow-text-strong">
          {storeName}
        </h2>
        <p className="text-lg text-gray-300 shadow-text">Explore os livros desta loja abaixo.</p>
      </div>
    );
  }

  const currentBook = books[currentIndex];

  return (
    <>
      {/* Imagem de Fundo do Banner com AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBook.id + "-bg-seller"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={currentBook.coverImageUrl}
            alt={`Capa de ${currentBook.title}`}
            layout="fill"
            objectFit="cover"
            quality={80}
            className="brightness-[0.40]" // Escurece mais para contraste do texto
            priority={currentIndex === 0} // Prioriza a primeira imagem
          />
        </motion.div>
      </AnimatePresence>
      
      {/* Gradiente Overlay Fixo sobre a imagem */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/40 to-transparent md:bg-gradient-to-r md:from-slate-950/90 md:via-slate-950/60 md:to-transparent z-5"></div>

      {/* Conteúdo textual do Banner (livro em destaque) com AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBook.id + "-info-seller"}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.7, ease: "easeOut" } }}
          exit={{ opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" } }}
          className="relative z-10 flex items-center justify-center md:justify-start h-full"
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-md md:max-w-lg text-center md:text-left">
              <p className="text-sm uppercase tracking-wider font-semibold text-emerald-400 mb-2">
                Em destaque na {storeName}
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight shadow-text-strong">
                {currentBook.title}
              </h2>
              <p className="text-md text-gray-300 mb-6 line-clamp-2 sm:line-clamp-3">
                {currentBook.author}
              </p>
              <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-md text-base shadow-lg hover:shadow-emerald-500/50 transition-shadow">
                <Link href={`/books/${currentBook.id}`}>
                  Ver Livro <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}