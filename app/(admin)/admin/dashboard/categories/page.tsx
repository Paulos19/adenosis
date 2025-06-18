// src/app/(admin)/admin/dashboard/categories/page.tsx
'use client';

import { useState, useEffect, useCallback, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Category as PrismaCategory, Prisma } from '@prisma/client';
import { Palette, PlusCircle, Edit3, Trash2, Loader2, Sparkles, Info } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';


// Tipo para categoria com contagem de livros
type CategoryWithCount = PrismaCategory & {
  _count: { books: number };
};

const categoryFormSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional().nullable(),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// Componente do formulário para adicionar/editar categoria
function CategoryForm({
  initialData,
  onSubmit,
  isSubmitting,
  formId,
  allCategories, // Passa todas as categorias existentes
}: {
  initialData?: Partial<CategoryFormValues>;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  isSubmitting: boolean;
  formId: string;
  allCategories: CategoryWithCount[];
}) {
  const [categoryName, setCategoryName] = useState(initialData?.name || '');
  const [debouncedCategoryName] = useDebounce(categoryName, 700);
  const [geminiSuggestions, setGeminiSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [existingCategoryNames, setExistingCategoryNames] = useState<string[]>([]);

  useEffect(() => {
    setExistingCategoryNames(allCategories.map(c => c.name));
  }, [allCategories]);

  useEffect(() => {
    if (debouncedCategoryName.length > 2 && formId === 'add-category-form') {
      const fetchSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
          const response = await axios.post('/api/ai/suggest-categories', { 
            baseCategoryName: debouncedCategoryName,
            existingCategories: existingCategoryNames,
          });
          setGeminiSuggestions(response.data.suggestions || []);
        } catch (error) {
          console.error("Erro ao buscar sugestões do Gemini:", error);
          setGeminiSuggestions([]);
        } finally {
          setIsLoadingSuggestions(false);
        }
      };
      fetchSuggestions();
    } else {
      setGeminiSuggestions([]);
    }
  }, [debouncedCategoryName, formId, existingCategoryNames]);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialData || { name: '', description: '' },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
      setCategoryName(initialData.name || '');
    }
  }, [initialData, reset]);

  const handleSuggestionClick = (suggestion: string) => {
    setValue('name', suggestion, { shouldValidate: true, shouldDirty: true });
    setCategoryName(suggestion);
    setGeminiSuggestions([]);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} id={formId} className="space-y-4">
      <div>
        <Label htmlFor={`${formId}-name`} className={cn(errors.name && "text-destructive")}>Nome da Categoria</Label>
        <Input
          id={`${formId}-name`}
          {...register("name", {
            onChange: (e) => setCategoryName(e.target.value),
            onBlur: (e) => setValue("name", e.target.value, {shouldValidate: true})
          })}
          placeholder="Ex: Ficção Científica"
          className={cn("bg-slate-700 border-slate-600", errors.name && "border-destructive")}
          disabled={isSubmitting}
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        
        {formId === 'add-category-form' && (isLoadingSuggestions || geminiSuggestions.length > 0) && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-slate-400 flex items-center">
              {isLoadingSuggestions && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              Sugestões da IA:
            </p>
            <div className="flex flex-wrap gap-2">
              {geminiSuggestions.map((sug, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(sug)}
                  className="text-xs h-auto py-1 px-2 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-300"
                >
                  {sug}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor={`${formId}-description`} className={cn(errors.description && "text-destructive")}>Descrição (Opcional)</Label>
        <Textarea
          id={`${formId}-description`}
          {...register("description")}
          placeholder="Uma breve descrição sobre a categoria"
          className={cn("bg-slate-700 border-slate-600 min-h-[80px]", errors.description && "border-destructive")}
          disabled={isSubmitting}
        />
        {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
      </div>
    </form>
  );
}


function AdminCategoriesPageContent() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithCount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/categories'); // Note que a API retorna PrismaCategory[], não CategoryWithCount[]
      // Para obter a contagem, a API precisaria ser ajustada. Por ora, vamos simular a contagem ou deixar 0.
      const categoriesWithCount = (response.data as PrismaCategory[]).map(c => ({...c, _count: { books: 0 }})); // Simulação
      setCategories(categoriesWithCount);
    } catch (error) {
      toast.error("Falha ao carregar categorias.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Adicionando categoria...");
    try {
      // CORREÇÃO: Enviar o payload no formato esperado pela API
      await axios.post('/api/categories', { names: [values.name], description: values.description });
      toast.success("Categoria adicionada com sucesso!", { id: toastId });
      setIsAddDialogOpen(false);
      fetchCategories();
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string, details?: any }>;
      const errorMsg = axiosError.response?.data?.error || "Falha ao adicionar categoria.";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = async (values: CategoryFormValues) => {
    if (!editingCategory) return;
    setIsSubmitting(true);
    const toastId = toast.loading(`Editando "${editingCategory.name}"...`);
    try {
      // Assumindo que a API de edição espera uma estrutura similar (não implementada no projeto)
      await axios.put(`/api/categories/${editingCategory.id}`, values); 
      toast.success("Categoria atualizada!", { id: toastId });
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) { 
        const axiosError = error as AxiosError<{ error?: string, details?: any }>;
        const errorMsg = axiosError.response?.data?.error || "Falha ao editar categoria.";
        toast.error(errorMsg, { id: toastId });
    } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsSubmitting(true);
    const toastId = toast.loading(`Excluindo "${deletingCategory.name}"...`);
    try {
      await axios.delete(`/api/categories/${deletingCategory.id}`);
      toast.success("Categoria excluída!", { id: toastId });
      setIsEditDialogOpen(false); // Fecha o dialog de confirmação
      setDeletingCategory(null);
      fetchCategories();
    } catch (error) { 
        const axiosError = error as AxiosError<{ error?: string }>;
        const errorMsg = axiosError.response?.data?.error || "Falha ao excluir categoria.";
        toast.error(errorMsg, { id: toastId, duration: 5000 });
    } 
    finally { setIsSubmitting(false); }
  };

  const openEditDialog = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 bg-slate-700 rounded-md" />
          <Skeleton className="h-10 w-36 bg-slate-700 rounded-md" />
        </div>
        <div className="rounded-lg border border-slate-700">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-slate-700 last:border-b-0">
              <div className="space-y-1"><Skeleton className="h-5 w-32 bg-slate-600"/><Skeleton className="h-3 w-24 bg-slate-600"/></div>
              <Skeleton className="h-8 w-20 bg-slate-600"/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-100">Gerenciar Categorias</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-gray-200 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-emerald-400 text-xl">Nova Categoria</DialogTitle>
              <DialogDescription className="text-slate-400">
                Preencha os detalhes abaixo para criar uma nova categoria.
              </DialogDescription>
            </DialogHeader>
            <CategoryForm 
                onSubmit={handleAddCategory} 
                isSubmitting={isSubmitting} 
                formId="add-category-form"
                allCategories={categories}
            />
            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-700 hover:bg-slate-800" disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" form="add-category-form" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Adicionar Categoria
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-10 bg-slate-800/50 rounded-lg border border-slate-700">
          <Palette className="mx-auto h-16 w-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-100">Nenhuma categoria cadastrada.</h3>
          <p className="mt-2 text-md text-slate-400">Comece adicionando sua primeira categoria.</p>
        </div>
      ) : (
        <div className="bg-slate-800/70 shadow-md rounded-lg border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader><TableRow className="dark:border-slate-700 hover:bg-slate-700/50">
                <TableHead className="p-3">Nome</TableHead>
                <TableHead className="p-3 hidden md:table-cell">Descrição</TableHead>
                <TableHead className="p-3 text-center hidden sm:table-cell">Livros</TableHead>
                <TableHead className="text-right p-3">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id} className="dark:border-slate-600">
                  <TableCell className="font-medium text-gray-100 p-3">{category.name}</TableCell>
                  <TableCell className="text-sm text-slate-400 p-3 hidden md:table-cell max-w-sm truncate" title={category.description || ""}>
                    {category.description || <span className="italic text-slate-500">Sem descrição</span>}
                  </TableCell>
                  <TableCell className="text-center text-slate-300 p-3 hidden sm:table-cell">{category._count.books}</TableCell>
                  <TableCell className="text-right p-3">
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-400" onClick={() => openEditDialog(category)} title="Editar Categoria">
                            <Edit3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={deletingCategory?.id === category.id} onOpenChange={(open) => {if(!open) setDeletingCategory(null)}}>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400" title="Excluir Categoria" disabled={category._count.books > 0} onClick={() => setDeletingCategory(category)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-800 text-gray-200">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-400">Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        Tem certeza que deseja excluir a categoria <strong>{category.name}</strong>? Esta ação não poderá ser desfeita.
                                        {category._count.books > 0 && <p className="mt-2 text-yellow-400"><Info className="inline h-4 w-4 mr-1"/> Esta categoria está associada a {category._count.books} livro(s) e não pode ser excluída.</p>}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="border-slate-700 hover:bg-slate-800" disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                                    <Button variant="destructive" onClick={handleDeleteCategory} disabled={isSubmitting || category._count.books > 0}>
                                        {isSubmitting && deletingCategory?.id === category.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Excluir
                                    </Button>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editingCategory && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {if(!open)setEditingCategory(null); setIsEditDialogOpen(open);}}>
            <DialogContent className="bg-slate-900 border-slate-800 text-gray-200 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-emerald-400 text-xl">Editar Categoria: {editingCategory.name}</DialogTitle>
                </DialogHeader>
                <CategoryForm 
                    initialData={{name: editingCategory.name, description: editingCategory.description}}
                    onSubmit={handleEditCategory} 
                    isSubmitting={isSubmitting}
                    formId="edit-category-form"
                    allCategories={categories}
                />
                 <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => {setIsEditDialogOpen(false); setEditingCategory(null);}} className="border-slate-700 hover:bg-slate-800" disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" form="edit-category-form" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AdminCategoriesPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-48 bg-slate-700 rounded-md" />
                <Skeleton className="h-10 w-40 bg-slate-700 rounded-md" />
            </div>
            <div className="rounded-lg border border-slate-700">
                {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-slate-700 last:border-b-0 h-[73px]">
                    <div className="space-y-1"><Skeleton className="h-5 w-32 bg-slate-600 rounded"/><Skeleton className="h-3 w-48 bg-slate-600 rounded"/></div>
                    <div className="flex space-x-2"><Skeleton className="h-8 w-8 bg-slate-600 rounded"/><Skeleton className="h-8 w-8 bg-slate-600 rounded"/></div>
                </div>
                ))}
            </div>
        </div>
    );
}

// Componente Container da Página
export default function AdminCategoriesPageContainer() {
  return (
    <Suspense fallback={<AdminCategoriesPageSkeleton />}>
        <AdminCategoriesPageContent />
    </Suspense>
  );
}
