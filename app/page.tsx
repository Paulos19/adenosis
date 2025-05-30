// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Send, Heart, Palette, BookOpen as IconBookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios'; // Continuaremos usando axios para consistência

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BookCard, type BookWithDetails } from '@/components/books/BookCard';
import { FAQSection } from '@/components/home/FAQSection';
import { Button } from '@/components/ui/button';
import { BannerSkeleton } from '@/components/skeletons/BannerSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Category } from '@prisma/client';

// Dados do FAQ (como antes)
const faqItemsData = [
    { question: "Como funciona a Adenosis Livraria?", answer: "A Adenosis é um marketplace local que conecta vendedores de livros (novos e usados) com compradores da sua região. As negociações e entregas são combinadas diretamente entre as partes." },
    { question: "Como posso vender meus livros?", answer: "É simples! Crie uma conta de vendedor, cadastre seus livros com detalhes e fotos, e aguarde o contato dos interessados. Você combina o pagamento e a entrega diretamente com o comprador." },
    { question: "É seguro comprar e vender aqui?", answer: "Nós facilitamos a conexão, mas recomendamos que compradores e vendedores tomem as precauções comuns em transações locais: encontrar em locais públicos, verificar o produto, etc." },
    { question: "Quais são as taxas para vender?", answer: "Atualmente, a Adenosis Livraria não cobra taxas para listar ou vender seus livros. Aproveite!" }
];

// Componente BannerTextContent (como antes, com animações)
function BannerTextContent({ book }: { book: BookWithDetails }) {
  const whatsappLink = book.seller?.whatsappNumber 
    ? `https://wa.me/${book.seller.whatsappNumber}?text=${encodeURIComponent(`Olá, tenho interesse no livro "${book.title}" que vi na Adenosis Livraria!`)}`
    : "#";

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
    }),
  };

  return (
    <motion.div
      key={book.id + "-content"}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="absolute inset-0 flex items-center z-10"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg lg:max-w-xl text-center md:text-left py-10 md:py-0">
            {book.category?.name && (
                <motion.p custom={0} variants={itemVariants} className="text-sm uppercase tracking-wider font-semibold text-emerald-400 mb-2 md:mb-3">
                    {book.category.name}
                </motion.p>
            )}
            <motion.h1 custom={1} variants={itemVariants} className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-white mb-3 md:mb-4 leading-tight shadow-text-strong">
                {book.title}
            </motion.h1>
            <motion.p custom={2} variants={itemVariants} className="text-sm text-gray-300 mb-3 md:mb-4">
                Por: <span className="font-medium">{book.author}</span>
            </motion.p>
            <motion.p custom={3} variants={itemVariants} className="text-base text-gray-200 mb-5 md:mb-6 line-clamp-3 sm:line-clamp-4 leading-relaxed">
                {book.description}
            </motion.p>
            <motion.p custom={4} variants={itemVariants} className="text-sm text-gray-400 mb-6 md:mb-8">
                Vendido por: {' '}
                {book.seller?.storeName ? (
                <Link href={`/seller/${book.seller.id}`} className="font-medium text-emerald-400 hover:underline">
                    {book.seller.storeName}
                </Link>
                ) : ( 'Vendedor não disponível' )}
            </motion.p>
            <motion.div custom={5} variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-start justify-center md:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
                <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-md text-base w-full sm:w-auto shadow-lg hover:shadow-emerald-500/50 transition-shadow">
                    <Link href={`/books/${book.id}`}>Ver Detalhes</Link>
                </Button>
                {book.seller?.whatsappNumber && (
                <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="border-green-500 text-green-300 hover:bg-green-500 hover:text-white px-8 py-3 rounded-md text-base w-full sm:w-auto backdrop-blur-sm bg-slate-700/30 hover:bg-green-500/90 shadow-lg hover:shadow-green-500/50 transition-all"
                >
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                    <Send className="mr-2 h-4 w-4" /> Contatar Vendedor
                    </a>
                </Button>
                )}
            </motion.div>
        </div>
      </div>
    </motion.div>
  );
}


export default function HomePage() {
  const [bannerCycleBooks, setBannerCycleBooks] = useState<BookWithDetails[]>([]);
  const [staticRecentGridBooks, setStaticRecentGridBooks] = useState<BookWithDetails[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Único estado de loading para dados iniciais de livros
  
  const [displayCategories, setDisplayCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const NUM_BOOKS_FOR_BANNER_CYCLE = 5; // Quantos livros diferentes rotacionar no banner
  const NUM_BOOKS_FOR_RECENT_GRID = 4;  // Quantos livros mostrar na grade estática "Recém Chegados"
  const TOTAL_BOOKS_TO_FETCH = Math.max(NUM_BOOKS_FOR_BANNER_CYCLE, NUM_BOOKS_FOR_RECENT_GRID) + 2; // Busca alguns extras

  useEffect(() => {
    async function fetchInitialData() {
      setIsLoading(true);
      setIsLoadingCategories(true);
      try {
        // Busca livros recentes
        const booksResponse = await axios.get(`/api/books?limit=${TOTAL_BOOKS_TO_FETCH}&sort=recent`); 
        if (booksResponse.data && Array.isArray(booksResponse.data.data)) {
            const allFetchedBooks = booksResponse.data.data as BookWithDetails[];
            if (allFetchedBooks.length > 0) {
                // Define os livros para o ciclo do banner
                setBannerCycleBooks(allFetchedBooks.slice(0, Math.min(NUM_BOOKS_FOR_BANNER_CYCLE, allFetchedBooks.length)));
                // Define os livros para a grade estática "Recém Adicionados"
                setStaticRecentGridBooks(allFetchedBooks.slice(0, Math.min(NUM_BOOKS_FOR_RECENT_GRID, allFetchedBooks.length)));
            } else {
                setBannerCycleBooks([]);
                setStaticRecentGridBooks([]);
            }
        } else {
            setBannerCycleBooks([]);
            setStaticRecentGridBooks([]);
        }

        // Busca Categorias
        const categoriesResponse = await fetch('/api/categories');
        if (!categoriesResponse.ok) throw new Error('Falha ao buscar categorias');
        const fetchedCategories = await categoriesResponse.json();
        if (fetchedCategories && Array.isArray(fetchedCategories)) {
          setDisplayCategories(fetchedCategories.slice(0, 5)); // Pega as primeiras 5
        } else {
          setDisplayCategories([]);
        }

      } catch (error) {
        console.error("Erro ao buscar dados para HomePage:", error);
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar os dados da página.");
        setBannerCycleBooks([]);
        setStaticRecentGridBooks([]);
        setDisplayCategories([]);
      } finally {
        setIsLoading(false);
        setIsLoadingCategories(false);
      }
    }
    fetchInitialData();
  }, []);

  // Timer para rotação do banner
  useEffect(() => {
    if (bannerCycleBooks.length <= 1) return; 
    const timer = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % bannerCycleBooks.length);
    }, 10000); 
    return () => clearInterval(timer);
  }, [bannerCycleBooks]);

  const featuredBookForBanner = bannerCycleBooks.length > 0 ? bannerCycleBooks[currentBannerIndex] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200">
      <Navbar />
      
      <div className="flex-1"> 
        {/* Seção Banner Dinâmico */}
        <section className="relative h-screen w-full flex items-center overflow-hidden">
          <AnimatePresence mode="wait">
            {isLoading && !featuredBookForBanner && (
                 <motion.div key="banner-bg-skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-800 z-0" />
            )}
            {featuredBookForBanner && (
              <motion.div key={featuredBookForBanner.id + "-bg-image"} initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 1.5, ease: [0.42, 0, 0.58, 1] }} className="absolute inset-0 z-0" >
                <Image src={featuredBookForBanner.coverImageUrl} alt={featuredBookForBanner.title || "Livro em destaque"} layout="fill" objectFit="cover" quality={85} className="brightness-[0.35]" priority={bannerCycleBooks.indexOf(featuredBookForBanner) === 0} />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent md:bg-gradient-to-r md:from-slate-950/95 md:via-slate-950/80 md:to-transparent z-5"></div>
          
          <AnimatePresence mode="wait">
            {isLoading && !featuredBookForBanner ? (
                <motion.div key="banner-content-skeleton" className="w-full h-full flex items-center justify-center md:justify-start"> <BannerSkeleton /> </motion.div>
            ) : (
                featuredBookForBanner ? <BannerTextContent book={featuredBookForBanner} /> : (
                    !isLoading && <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex items-center h-full justify-center text-center">
                        <div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">Bem-vindo à Adenosis Livraria</h1>
                            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl">Sua aventura literária começa aqui.</p>
                            <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-md text-base">
                                <Link href="/books">Explorar Livros <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                        </div>
                    </div>
                )
            )}
          </AnimatePresence>
        </section>

        {/* Seção de Livros Recém Adicionados - AGORA ESTÁTICA E INDEPENDENTE DO BANNER */}
        <section className="container mx-auto py-16 md:py-24 px-4">
          <div className="flex justify-between items-center mb-10 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-100">
              Recém <span className="text-emerald-400">Adicionados</span>
            </h2>
            <Button variant="outline" asChild className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300">
              <Link href="/books">Ver Mais Livros <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          {/* Mostra skeletons se isLoading E não há livros ainda em staticRecentGridBooks */}
          {isLoading && staticRecentGridBooks.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {[...Array(NUM_BOOKS_FOR_RECENT_GRID)].map((_, i) => <Skeleton key={`recent-skel-${i}`} className="h-[450px] w-full rounded-lg bg-slate-800" />)}
            </div>
          ) : staticRecentGridBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {staticRecentGridBooks.map((book) => ( // Renderiza diretamente de staticRecentGridBooks
                  <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : ( 
            !isLoading && <p className="text-center text-gray-500 py-8">Nenhum livro encontrado recentemente. Volte em breve!</p> 
          )}
        </section>

        {/* Seção de Categorias em Destaque (Dinâmica) */}
        <section className="py-16 md:py-24 bg-slate-900">
             {/* ... (código da seção de categorias como antes, com skeletons) ... */}
             <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-100 mb-10 md:mb-12">
                    Navegue por <span className="text-emerald-400">Categorias</span>
                </h2>
                {isLoadingCategories && displayCategories.length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 text-center">
                    {[...Array(5)].map((_, i) => <Skeleton key={`cat-skel-${i}`} className="h-32 w-full rounded-lg bg-slate-800" />)}
                  </div>
                ) : displayCategories.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 text-center">
                    {displayCategories.map(category => (
                        <Link 
                            key={category.id} 
                            href={`/books?categoryId=${category.id}`} 
                            className="block p-6 bg-slate-800 rounded-lg shadow-lg hover:shadow-emerald-500/30 hover:bg-slate-700 transition-all transform hover:-translate-y-1 group"
                        >
                            <IconBookOpen className="h-8 w-8 mx-auto mb-3 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                            <h3 className="font-semibold text-lg text-gray-200 group-hover:text-white transition-colors">{category.name}</h3>
                        </Link>
                    ))}
                  </div>
                ) : ( !isLoadingCategories && <p className="text-center text-gray-500">Nenhuma categoria para exibir.</p> )}
            </div>
        </section>

        <FAQSection />
      </div>
      
      <Footer />
    </div>
  );
}