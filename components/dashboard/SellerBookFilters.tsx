// src/components/dashboard/SellerBookFilters.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw, Loader2 } from 'lucide-react';

interface SellerBookFiltersProps {
  onFilterSubmit: (searchTerm: string) => void;
  initialSearchTerm?: string;
  isLoading?: boolean;
}

export function SellerBookFilters({ 
  onFilterSubmit, 
  initialSearchTerm = '',
  isLoading = false 
}: SellerBookFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onFilterSubmit(searchTerm);
  };

  const handleReset = () => {
    setSearchTerm('');
    onFilterSubmit('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-slate-800/70 rounded-lg border dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-end shadow-sm">
      <div className="flex-grow w-full">
        <label htmlFor="search-my-books" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
          Buscar em meus livros
        </label>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
                id="search-my-books" 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Título, autor, ISBN..." 
                className="pl-10 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                disabled={isLoading}
            />
        </div>
      </div>
      <div className="flex w-full sm:w-auto space-x-2">
        <Button type="button" variant="ghost" onClick={handleReset} disabled={isLoading} className="flex-1 sm:flex-none">
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Buscar
        </Button>
      </div>
    </form>
  );
}
