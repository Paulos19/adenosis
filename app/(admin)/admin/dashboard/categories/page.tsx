// src/app/(admin_group_name)/dashboard/categories/page.tsx
'use client';

import { useState, useEffect, useCallback, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Adicionado useSearchParams
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Category as PrismaCategory, Prisma } from '@prisma/client'; // Importe Prisma para tipos
import { Palette, PlusCircle, Edit3, Trash2, Loader2, Sparkles, Info } from 'lucide-react';
import { useDebounce } from 'use-debounce'; // npm install use-debounce

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Para descrição da categoria
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose, DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Tipo para categoria com contagem de livros
type CategoryWithCount = PrismaCategory & {
  _count: { books: number };
};

const categoryFormSchema = z.object({ // Zod para o formulário
  name: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional().nullable(),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// Componente do formulário para adicionar/editar categoria
function CategoryForm({
  initialData,
  onSubmit,
  isSubmitting,
  onCancel,
  formId,
}: {
  initialData?: Partial<CategoryFormValues>;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  isSubmitting: boolean;
  onCancel?: () => void;
  formId: string;
}) {
  const [categoryName, setCategoryName] = useState(initialData?.name || '');
  const [debouncedCategoryName] = useDebounce(categoryName, 700); // Delay para sugestões Gemini
  const [geminiSuggestions, setGeminiSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [existingCategoryNames, setExistingCategoryNames] = useState<string[]>([]); // Para passar ao Gemini

  // Efeito para buscar sugestões do Gemini
  useEffect(() => {
    if (debouncedCategoryName.length > 2 && formId === 'add-category-form') { // Só para o form de adicionar
      const fetchSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
          // Idealmente, você teria uma lista de categorias existentes para passar aqui
          // Para evitar sugerir o que já existe.
          const response = await axios.post('/api/admin/ai/suggest-categories', { 
            baseCategoryName: debouncedCategoryName,
            existingCategories: existingCategoryNames // Passa categorias existentes
          });
          setGeminiSuggestions(response.data.suggestions || []);
        } catch (error) {
          console.error("Erro ao buscar sugestões do Gemini:", error);
          setGeminiSuggestions([]); // Limpa em caso de erro
        } finally {
          setIsLoadingSuggestions(false);
        }
      };
      fetchSuggestions();
    } else {
      setGeminiSuggestions([]);
    }
  }, [debouncedCategoryName, formId, existingCategoryNames]);

  // Atualizar nomes de categorias existentes (ex: para o useEffect do Gemini)
  // Este useEffect dependeria de uma prop 'allCategories' se você a passasse
  // useEffect(() => {
  // if (allCategories) setExistingCategoryNames(allCategories.map(c => c.name));
  // }, [allCategories]);


  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initialData || { name: '', description: '' },
  });

  useEffect(() => { // Para preencher o formulário se initialData mudar (modo edição)
    if (initialData) {
      reset(initialData);
      setCategoryName(initialData.name || '');
    }
  }, [initialData, reset]);

  const handleSuggestionClick = (suggestion: string) => {
    setValue('name', suggestion, { shouldValidate: true, shouldDirty: true });
    setCategoryName(suggestion); // Atualiza o input para o debouncer
    setGeminiSuggestions([]); // Limpa sugestões após clique
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} id={formId} className="space-y-4">
      <div>
        <Label htmlFor={`${formId}-name`} className={cn(errors.name && "text-destructive")}>Nome da Categoria</Label>
        <Input
          id={`${formId}-name`}
          {...register("name")}
          placeholder="Ex: Ficção Científica"
          className={cn("bg-slate-700 border-slate-600", errors.name && "border-destructive")}
          disabled={isSubmitting}
          value={categoryName} // Controlado para o debounce do Gemini
          onChange={(e) => setCategoryName(e.target.value)} // Atualiza o estado local e o RHF via register
          onBlurCapture={() => setValue("name", categoryName, {shouldValidate: true})} // Sincroniza com RHF no blur
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        
        {/* Sugestões do Gemini (apenas para o formulário de adicionar) */}
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
      {/* Botões de submit são geralmente colocados fora do CategoryForm, no DialogFooter */}
    </form>
  );
}


function AdminCategoriesPageContent() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithCount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Para o formulário dentro do Dialog

  const router = useRouter(); // Para refresh após ação

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<CategoryWithCount[]>('/api/categories');
      setCategories(response.data);
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
      await axios.post('/api/categories', values);
      toast.success("Categoria adicionada com sucesso!", { id: toastId });
      setIsAddDialogOpen(false);
      fetchCategories(); // Recarrega a lista
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
      await axios.put(`/api/categories/${editingCategory.id}`, values);
      toast.success("Categoria atualizada!", { id: toastId });
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) { /* ... tratamento de erro ... */ } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsSubmitting(true); // Reutiliza para o botão de deletar no dialog
    const toastId = toast.loading(`Excluindo "${deletingCategory.name}"...`);
    try {
      await axios.delete(`/api/categories/${deletingCategory.id}`);
      toast.success("Categoria excluída!", { id: toastId });
      setIsDeleteDialogOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (error) { 
        const axiosError = error as AxiosError<{ error?: string }>;
        // Se a API retornar um erro específico sobre a categoria estar em uso:
        const errorMsg = axiosError.response?.data?.error || "Falha ao excluir categoria.";
        toast.error(errorMsg, { id: toastId, duration: 5000 });
    } 
    finally { setIsSubmitting(false); }
  };

  const openEditDialog = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (category: CategoryWithCount) => {
    setDeletingCategory(category);
    setIsDeleteDialogOpen(true);
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
                onCancel={() => setIsAddDialogOpen(false)}
                formId="add-category-form"
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

      {categories.length === 0 && !isLoading ? (
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
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400" title="Excluir Categoria" disabled={category._count.books > 0}>
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
                                    <AlertDialogCancel className="border-slate-700 hover:bg-slate-800">Cancelar</AlertDialogCancel>
                                    <Button variant="destructive" onClick={() => {setDeletingCategory(category); handleDeleteCategory();}} disabled={isSubmitting || category._count.books > 0}>
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

      {/* Dialog para Editar Categoria */}
      {editingCategory && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {if(!open)setEditingCategory(null); setIsEditDialogOpen(open);}}>
            <DialogContent className="bg-slate-900 border-slate-800 text-gray-200 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-emerald-400 text-xl">Editar Categoria: {editingCategory.name}</DialogTitle>
                </DialogHeader>
                <CategoryForm 
                    initialData={{name: editingCategory.name, description: editingCategory.description as string | null}}
                    onSubmit={handleEditCategory} 
                    isSubmitting={isSubmitting}
                    onCancel={() => {setIsEditDialogOpen(false); setEditingCategory(null);}}
                    formId="edit-category-form"
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

// Componente Container da Página
export default function AdminCategoriesPageContainer() {
  return (
    <Suspense fallback={<AdminCategoriesPageSkeleton />}> {/* Crie este skeleton se necessário */}
        <AdminCategoriesPageContent />
    </Suspense>
  );
}

// Skeleton para a página de categorias (exemplo simples)
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

// Importe Zod se não estiver já no topo do arquivo
import { z, ZodError } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
// Importe useForm e useDebounce se não estiverem no topo
// import { useForm } from 'react-hook-form';
// import { useDebounce } from 'use-debounce';