// src/components/search/SearchModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Search as SearchIcon, X, Loader2, BookOpen } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose, // Para fechar o modal
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area'; // Para lista de resultados rolável
import { type BookWithDetails } from '@/components/books/BookCard'; // Reutilize o tipo

// Hook simples para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface SearchModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ isOpen, onOpenChange }: SearchModalProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<BookWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms de delay

  const fetchResults = useCallback(async (query: string) => {
    if (query.trim().length < 2) { // Não busca se o termo for muito curto
      setResults([]);
      setHasSearched(query.trim().length > 0); // Considera "buscado" se algo foi digitado
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await axios.get(`/api/books/search?q=${encodeURIComponent(query)}`);
      setResults(response.data.data || []);
    } catch (error) {
      console.error("Erro na busca:", error);
      setResults([]);
      // toast.error("Erro ao buscar resultados."); // Opcional
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) { // Apenas busca se o modal estiver aberto
        fetchResults(debouncedSearchTerm);
    } else { // Limpa os resultados e termo ao fechar o modal
        setSearchTerm('');
        setResults([]);
        setHasSearched(false);
    }
  }, [debouncedSearchTerm, fetchResults, isOpen]);

  const handleResultClick = () => {
    onOpenChange(false); // Fecha o modal ao clicar em um resultado
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-gray-200 p-0 max-w-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-800">
          <DialogTitle className="text-xl text-emerald-400">Buscar Livros</DialogTitle>
          <DialogDescription className="text-slate-400">
            Encontre livros por título, autor, ISBN, categoria ou vendedor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <Input
              type="search"
              placeholder="Digite sua busca aqui..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg bg-slate-800 border-slate-700 placeholder-slate-500 text-gray-100 focus:ring-emerald-500 focus:border-emerald-500 rounded-md"
              autoFocus
            />
            {searchTerm && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500 hover:text-slate-300"
                >
                    <X className="h-5 w-5"/>
                </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] min-h-[100px] px-2 pb-6"> {/* Altura máxima para resultados */}
            {results.length > 0 ? (
              <ul className="space-y-2 px-4">
                {results.map((book) => (
                  <li key={book.id}>
                    <Link
                      href={`/books/${book.id}`}
                      onClick={handleResultClick}
                      className="flex items-center p-3 hover:bg-slate-800 rounded-md transition-colors group"
                    >
                      <div className="relative w-12 h-16 mr-4 shrink-0 rounded overflow-hidden border border-slate-700">
                        <Image
                          src={book.coverImageUrl || '/placeholder-book.png'}
                          alt={book.title}
                          layout="fill"
                          objectFit="cover"
                        />
                      </div>
                      <div className="flex-grow overflow-hidden">
                        <h3 className="text-md font-semibold text-emerald-400 group-hover:text-emerald-300 truncate">{book.title}</h3>
                        <p className="text-sm text-slate-400 truncate">Por: {book.author}</p>
                        {book.category && <p className="text-xs text-slate-500 truncate">{book.category.name}</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : hasSearched && debouncedSearchTerm.length >= 2 ? ( // Só mostra "nenhum resultado" se uma busca válida foi feita
              <div className="text-center py-10 px-4">
                <BookOpen className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-slate-400">Nenhum livro encontrado para "<span className="font-semibold text-slate-300">{debouncedSearchTerm}</span>".</p>
                <p className="text-sm text-slate-500">Tente palavras-chave diferentes.</p>
              </div>
            ) : !hasSearched && debouncedSearchTerm.length < 2 && isOpen && (
              <div className="text-center py-10 px-4">
                <SearchIcon className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-slate-400">Digite pelo menos 2 caracteres para iniciar a busca.</p>
              </div>
            )}
          </ScrollArea>
        )}
         <div className="p-4 border-t border-slate-800 flex justify-end">
            <DialogClose asChild>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-700">Fechar</Button>
            </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}