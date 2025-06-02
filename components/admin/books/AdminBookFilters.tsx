// src/components/admin/books/AdminBookFilters.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react'; // Importado FormEvent
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Filter, Loader2, RotateCcw } from 'lucide-react';
import { BookStatus, Category, SellerProfile } from '@prisma/client';
import { cn } from '@/lib/utils'; // Importe cn

// Constantes para os valores "todos" dos selects
const ALL_STATUS_VALUE = "ALL_STATUSES";
const ALL_CATEGORIES_VALUE = "ALL_CATEGORIES";
const ALL_SELLERS_VALUE = "ALL_SELLERS";

interface AdminBookFiltersProps {
  initialFilters: {
    searchTerm: string;
    statusFilter: BookStatus | ''; // O pai ainda espera '' para "todos"
    categoryFilter: string;      // O pai ainda espera '' para "todos"
    sellerFilter: string;        // O pai ainda espera '' para "todos"
  };
  categories: Category[];
  sellers: Pick<SellerProfile, 'id' | 'storeName'>[];
  onFilterSubmit: (filters: {
    searchTerm: string;
    statusFilter: BookStatus | ''; // Envia '' para "todos"
    categoryFilter: string;      // Envia '' para "todos"
    sellerFilter: string;        // Envia '' para "todos"
  }) => void;
  isLoading?: boolean;
}

export function AdminBookFilters({ 
  initialFilters, 
  categories, 
  sellers, 
  onFilterSubmit,
  isLoading 
}: AdminBookFiltersProps) {
  
  // Estados internos para os selects usarem os valores "ALL_*"
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm);
  const [statusSelectValue, setStatusSelectValue] = useState<BookStatus | typeof ALL_STATUS_VALUE>(
    initialFilters.statusFilter === '' ? ALL_STATUS_VALUE : initialFilters.statusFilter
  );
  const [categorySelectValue, setCategorySelectValue] = useState<string>(
    initialFilters.categoryFilter === '' ? ALL_CATEGORIES_VALUE : initialFilters.categoryFilter
  );
  const [sellerSelectValue, setSellerSelectValue] = useState<string>(
    initialFilters.sellerFilter === '' ? ALL_SELLERS_VALUE : initialFilters.sellerFilter
  );

  // Sincroniza o estado interno com as props iniciais se elas mudarem (ex: navegação por URL)
  useEffect(() => {
    setSearchTerm(initialFilters.searchTerm);
    setStatusSelectValue(initialFilters.statusFilter === '' ? ALL_STATUS_VALUE : initialFilters.statusFilter);
    setCategorySelectValue(initialFilters.categoryFilter === '' ? ALL_CATEGORIES_VALUE : initialFilters.categoryFilter);
    setSellerSelectValue(initialFilters.sellerFilter === '' ? ALL_SELLERS_VALUE : initialFilters.sellerFilter);
  }, [initialFilters]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onFilterSubmit({
      searchTerm: searchTerm.trim(),
      statusFilter: statusSelectValue === ALL_STATUS_VALUE ? '' : statusSelectValue as BookStatus,
      categoryFilter: categorySelectValue === ALL_CATEGORIES_VALUE ? '' : categorySelectValue,
      sellerFilter: sellerSelectValue === ALL_SELLERS_VALUE ? '' : sellerSelectValue,
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusSelectValue(ALL_STATUS_VALUE);
    setCategorySelectValue(ALL_CATEGORIES_VALUE);
    setSellerSelectValue(ALL_SELLERS_VALUE);
    onFilterSubmit({ searchTerm: '', statusFilter: '', categoryFilter: '', sellerFilter: '' });
  };
  
  const formatBookStatusDisplay = (status: BookStatus) => {
    switch (status) {
        case BookStatus.PUBLISHED: return "Publicado";
        case BookStatus.UNPUBLISHED: return "Não Publicado";
        case BookStatus.PENDING_APPROVAL: return "Pendente";
        default: return status;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-slate-800/70 rounded-lg border border-slate-700 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <Label htmlFor="search-books-admin" className="block text-sm font-medium text-slate-300 mb-1">Buscar</Label>
          <Input 
            id="search-books-admin" 
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Título, autor, ISBN, loja..." 
            className="bg-slate-700 border-slate-600 text-gray-200 focus:ring-emerald-500 focus:border-emerald-500" 
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="status-filter-admin" className="block text-sm font-medium text-slate-300 mb-1">Status</Label>
          <Select 
            value={statusSelectValue} 
            onValueChange={(value) => setStatusSelectValue(value as BookStatus | typeof ALL_STATUS_VALUE)} 
            disabled={isLoading}
          >
            <SelectTrigger id="status-filter-admin" className="bg-slate-700 border-slate-600 text-gray-200 focus:ring-emerald-500 focus:border-emerald-500">
                <SelectValue placeholder="Todos Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-gray-200">
              <SelectItem value={ALL_STATUS_VALUE} className={cn("hover:!bg-slate-700 focus:!bg-slate-700")}>Todos Status</SelectItem>
              {Object.values(BookStatus).map(s => <SelectItem key={s} value={s} className={cn("hover:!bg-slate-700 focus:!bg-slate-700")}>{formatBookStatusDisplay(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="category-filter-admin" className="block text-sm font-medium text-slate-300 mb-1">Categoria</Label>
          <Select 
            value={categorySelectValue} 
            onValueChange={(value) => setCategorySelectValue(value)} 
            disabled={isLoading || categories.length === 0}
          >
            <SelectTrigger id="category-filter-admin" className="bg-slate-700 border-slate-600 text-gray-200 focus:ring-emerald-500 focus:border-emerald-500">
                <SelectValue placeholder="Todas Categorias" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-gray-200 max-h-60">
              <SelectItem value={ALL_CATEGORIES_VALUE} className={cn("hover:!bg-slate-700 focus:!bg-slate-700")}>Todas Categorias</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id} className={cn("hover:!bg-slate-700 focus:!bg-slate-700")}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="seller-filter-admin" className="block text-sm font-medium text-slate-300 mb-1">Livraria</Label>
          <Select 
            value={sellerSelectValue} 
            onValueChange={(value) => setSellerSelectValue(value)} 
            disabled={isLoading || sellers.length === 0}
          >
            <SelectTrigger id="seller-filter-admin" className="bg-slate-700 border-slate-600 text-gray-200 focus:ring-emerald-500 focus:border-emerald-500">
                <SelectValue placeholder="Todas Livrarias" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-gray-200 max-h-60">
              <SelectItem value={ALL_SELLERS_VALUE} className={cn("hover:!bg-slate-700 focus:!bg-slate-700")}>Todas Livrarias</SelectItem>
              {sellers.map(s => <SelectItem key={s.id} value={s.id} className={cn("hover:!bg-slate-700 focus:!bg-slate-700")}>{s.storeName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <Button type="button" variant="ghost" onClick={handleResetFilters} disabled={isLoading} className="text-slate-400 hover:text-slate-200">
            <RotateCcw className="h-4 w-4 mr-2" /> Limpar Filtros
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4 mr-2"/>}
            Aplicar Filtros
        </Button>
      </div>
    </form>
  );
}