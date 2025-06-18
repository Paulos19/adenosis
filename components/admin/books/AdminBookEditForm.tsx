// src/components/admin/books/AdminBookEditForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Resolver, useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { z } from 'zod';
import { BookCondition, Category, BookStatus } from "@prisma/client"; 
import { useEffect, useState, ChangeEvent } from 'react';
import { Loader2, X, UploadCloud, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomFormInput } from '@/components/custom-form/CustomFormInput';
import { CustomFormSelect } from '@/components/custom-form/CustomFormSelect';
import { CustomFormTextarea } from '@/components/custom-form/CustomFormTextarea';
import { Label } from '@/components/ui/label';
import { Input as ShadcnInput } from '@/components/ui/input'; // Renomeado para evitar conflito com HTML Input
import { Progress } from "@/components/ui/progress";
import { useFirebaseUpload } from '@/hooks/useFirebaseUpload';
import type { AdminBookView } from '@/app/api/admin/books/route'; // Ajuste o caminho se necessário
import { Skeleton } from '@/components/ui/skeleton';

// Schema Zod para o formulário de edição do admin
const adminEditBookFormSchema = z.object({
  title: z.string().min(3, "Título deve ter ao menos 3 caracteres.").max(255).optional(),
  author: z.string().min(3, "Autor deve ter ao menos 3 caracteres.").max(255).optional(),
  description: z.string().max(10000, "Descrição muito longa.").optional().nullable(),
  price: z.string().optional().transform((val, ctx) => {
    if (val === undefined || val.trim() === '') return undefined; // Permite opcional e string vazia como undefined
    const num = parseFloat(val.replace(',', '.')); // Substitui vírgula por ponto para parsear corretamente
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Preço deve ser um número válido.",
      });
      return z.NEVER; // Impede a continuação da validação se não for número
    }
    if (num <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Preço deve ser positivo.",
        });
        return z.NEVER; // Impede se não for positivo
    }
    return num; // Retorna o número se válido e positivo
  }),
  coverImageUrl: z.string().url("URL da imagem de capa inválida.").nullable().optional(),
  condition: z.nativeEnum(BookCondition).optional(),
  stock: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number({invalid_type_error: "Estoque deve ser um número."}).int("Estoque deve ser inteiro.").min(0, "Estoque não pode ser negativo.").optional()
  ),
  categoryId: z.string().cuid("ID de categoria inválido.").optional(),
  status: z.nativeEnum(BookStatus).optional(),
  isbn: z.string().max(20, "ISBN muito longo.").transform(val => val === '' ? null : val).optional().nullable(),
  publisher: z.string().max(100).transform(val => val === '' ? null : val).optional().nullable(),
  publicationYear: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)), // String vazia ou null para undefined
    z.number({invalid_type_error: "Ano deve ser um número."}).int().min(1000, "Ano inválido.").max(new Date().getFullYear() + 10, "Ano futuro demais.").optional().nullable()
  ),
  language: z.string().max(50).transform(val => val === '' ? null : val).optional().nullable(),
  pages: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number({invalid_type_error: "Páginas deve ser um número."}).int().positive("Número de páginas inválido.").optional().nullable()
  ),
  tags: z.array(z.string().max(50, "Tag muito longa.")).max(10, "Máximo de 10 tags.").optional(),
});
type AdminEditBookFormValues = z.infer<typeof adminEditBookFormSchema>;

const formatBookStatusDisplay = (status: BookStatus): string => {
    switch (status) {
        case BookStatus.PUBLISHED: return "Publicado";
        case BookStatus.UNPUBLISHED: return "Não Publicado";
        case BookStatus.PENDING_APPROVAL: return "Pendente de Aprovação";
        default: return status;
    }
};

interface AdminBookEditFormProps {
  bookId: string;
}

export function AdminBookEditForm({ bookId }: AdminBookEditFormProps) {
  const router = useRouter();
  const [initialBookData, setInitialBookData] = useState<AdminBookView | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const { 
    uploadFile, deleteFile, uploadedFileUrl, uploadedFilePath,
    uploadProgress, isLoading: isUploadingImage, resetUploadState 
  } = useFirebaseUpload('book-covers');

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [currentInitialCoverImageUrlFromLoad, setCurrentInitialCoverImageUrlFromLoad] = useState<string | null>(null);

  const form = useForm<AdminEditBookFormValues>({
    resolver: zodResolver(adminEditBookFormSchema) as Resolver<AdminEditBookFormValues>,
    defaultValues: { // Será preenchido pelo reset com dados do livro
      title: '', author: '', description: null, price: undefined,
      coverImageUrl: null, condition: undefined, stock: undefined, categoryId: undefined,
      status: undefined, isbn: null, publisher: null, publicationYear: null,
      language: null, pages: null, tags: [],
    },
  });
  const { control, handleSubmit, formState: { isSubmitting, errors, dirtyFields }, setValue, getValues, reset } = form;

  useEffect(() => {
    if (!bookId) return;
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [bookRes, catRes] = await Promise.all([
          axios.get(`/api/admin/books/${bookId}`),
          axios.get('/api/categories')
        ]);
        
        const fetchedBook: AdminBookView = bookRes.data;
        setInitialBookData(fetchedBook);
        setCategories(catRes.data || []);

        const defaultFormData: Partial<AdminEditBookFormValues> = {
            title: fetchedBook.title || undefined,
            author: fetchedBook.author || undefined,
            description: fetchedBook.description || null,
            // Para o price, como o schema agora espera string no input, mas o form state é number | undefined
            // e os dados do backend são number, precisamos converter para string para o defaultValues
            // ou ajustar o schema para aceitar number no input também (mais complexo com transform)
            // Por ora, vamos converter para string para o defaultValues se existir.
            price: fetchedBook.price ?? undefined,
            coverImageUrl: fetchedBook.coverImageUrl || null,
            condition: fetchedBook.condition || undefined,
            stock: fetchedBook.stock ?? undefined,
            categoryId: fetchedBook.categoryId || undefined,
            status: fetchedBook.status || undefined,
            isbn: fetchedBook.isbn || null,
            publisher: fetchedBook.publisher || null,
            publicationYear: fetchedBook.publicationYear ?? null, // Mantém null se for null
            language: fetchedBook.language || null,
            pages: fetchedBook.pages ?? null, // Mantém null se for null
            tags: fetchedBook.tags || [],
        };
        reset(defaultFormData as any); // Usar 'as any' temporariamente devido à mudança no tipo de price
        
        if (fetchedBook.coverImageUrl) {
            setImagePreviewUrl(fetchedBook.coverImageUrl);
            setCurrentInitialCoverImageUrlFromLoad(fetchedBook.coverImageUrl);
        } else {
            setImagePreviewUrl(null);
            setCurrentInitialCoverImageUrlFromLoad(null);
        }
      } catch (error) {
        console.error("Erro ao buscar dados para edição:", error);
        toast.error("Não foi possível carregar dados do livro ou categorias.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [bookId, reset]);

  useEffect(() => {
    if (uploadedFileUrl) {
      setValue('coverImageUrl', uploadedFileUrl, { shouldValidate: true, shouldDirty: true });
    }
  }, [uploadedFileUrl, setValue]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (uploadedFilePath) { await deleteFile(uploadedFilePath); } 
      resetUploadState();
      setImagePreviewUrl(URL.createObjectURL(file));
      const result = await uploadFile(file);
      if (!result.url) { 
        setImagePreviewUrl(currentInitialCoverImageUrlFromLoad); 
        if(event.target) event.target.value = '';
        toast.error("Falha no upload da nova imagem.");
      }
    }
  };
  
  const handleRemoveImage = async () => {
    if (uploadedFilePath) { await deleteFile(uploadedFilePath); }
    resetUploadState();
    setValue('coverImageUrl', null, { shouldValidate: true, shouldDirty: true });
    setImagePreviewUrl(null);
    const fileInput = document.getElementById('coverImageFileAdminEdit') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const onSubmit = async (values: AdminEditBookFormValues) => {
    const dataToSubmit: { [key: string]: any } = {}; 
    let hasActualChanges = false;

    (Object.keys(values) as Array<keyof AdminEditBookFormValues>).forEach(key => {
      if (dirtyFields[key] || (key === 'coverImageUrl' && values.coverImageUrl !== currentInitialCoverImageUrlFromLoad)) {
        let value = values[key];
        
        // O campo 'price' já foi transformado para número pelo Zod schema
        // Outras transformações específicas para o payload da API podem ser mantidas se necessário
        if ((key === 'description' || key === 'isbn' || key === 'publisher' || key === 'language') && value === '') {
            value = null;
        } else if ((key === 'publicationYear' || key === 'pages' || key === 'stock')) {
            const numValue = Number(value);
            if (value === '' || value === null || (value !== undefined && isNaN(numValue))) {
                value = adminEditBookFormSchema.shape[key].isNullable() ? null : undefined;
            } else {
                value = numValue;
            }
        }
        
        if (value !== undefined) { 
            dataToSubmit[key] = value;
            hasActualChanges = true;
        }
      }
    });

    if (dirtyFields.coverImageUrl && values.coverImageUrl === null && currentInitialCoverImageUrlFromLoad !== null) {
        dataToSubmit.coverImageUrl = null; 
        hasActualChanges = true;
    }

    if (!hasActualChanges) {
        toast("Nenhuma alteração detectada para salvar.");
        router.push('/admin/dashboard/books');
        return;
    }

    const loadingToast = toast.loading('Atualizando livro...');
    try {
      await axios.put(`/api/admin/books/${bookId}`, dataToSubmit);
      toast.success('Livro atualizado com sucesso!', { id: loadingToast });
      router.push('/admin/dashboard/books');
      router.refresh(); 
    } catch (error) {
        toast.dismiss(loadingToast);
        const axiosError = error as AxiosError<{ error?: string; details?: any }>;
        const backendErrorMsg = axiosError.response?.data?.error;
        const backendDetails = axiosError.response?.data?.details;
        let displayError = backendErrorMsg || 'Algo deu errado ao atualizar o livro.';
        if (backendDetails && typeof backendDetails === 'object') {
            const fieldErrors = Object.entries(backendDetails)
            .map(([key, messages]) => `${key}: ${(messages as string[]).join(', ')}`)
            .join('\n');
            if (fieldErrors) displayError = fieldErrors;
        }
        toast.error(displayError, { duration: 6000 });
        console.error("Erro ao atualizar livro (admin):", error);
    }
  };

  const bookConditionOptions = Object.values(BookCondition).map(c => ({value: c, label: c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}));
  const bookStatusOptions = Object.values(BookStatus).map(s => ({value: s, label: formatBookStatusDisplay(s)}));
  const categoryOptions = categories.map(c => ({value: c.id, label: c.name}));
  const isProcessingAny = isSubmitting || isUploadingImage;

  if (isLoadingData) {
    return <div className="p-6"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-96 w-full" /></div>; 
  }
  if (!initialBookData && !isLoadingData) { 
    return <div className="p-6 text-center"><p className="text-lg text-red-500">Erro: Livro não encontrado ou falha ao carregar dados.</p><Button onClick={() => router.push('/admin/dashboard/books')}>Voltar</Button></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Editar Livro (Admin)</h1>
        <Button variant="outline" asChild className="border-slate-600 hover:bg-slate-700 text-slate-200">
          <Link href="/admin/dashboard/books">Voltar para Lista</Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7 p-6 md:p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <fieldset className="space-y-5" disabled={isProcessingAny}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-3">Informações Principais</legend>
            <CustomFormInput<AdminEditBookFormValues> name="title" control={control} label="Título do Livro"/>
            <CustomFormInput<AdminEditBookFormValues> name="author" control={control} label="Autor(es)"/>
            <CustomFormTextarea<AdminEditBookFormValues> name="description" control={control} label="Descrição" rows={8}/>
        </fieldset>
        
         <fieldset className="space-y-3 pt-4 border-t dark:border-slate-700" disabled={isProcessingAny}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Imagem de Capa</legend>
            <Label htmlFor="coverImageFileAdminEdit" className={errors.coverImageUrl && !imagePreviewUrl ? "text-destructive" : ""}>
                Novo Arquivo da Capa (opcional para alterar)
            </Label>
            <ShadcnInput id="coverImageFileAdminEdit" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} disabled={isProcessingAny} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-800/60 dark:file:text-emerald-300 dark:hover:file:bg-emerald-700/60"/>
            {isUploadingImage && <Progress value={uploadProgress} className="w-full h-2 mt-2 [&>*]:bg-emerald-500" />}
            {imagePreviewUrl && (
                <div className="mt-4 relative w-32 h-48 group">
                    <Image src={imagePreviewUrl} alt="Preview da capa" fill style={{objectFit:"cover"}} className="rounded-md border dark:border-slate-600"/>
                    {!isUploadingImage && <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleRemoveImage} title="Remover imagem"><X className="h-4 w-4" /></Button>}
                </div>
            )}
            {!imagePreviewUrl && !isUploadingImage && (<p className="text-xs text-muted-foreground mt-1">Nenhuma imagem de capa selecionada.</p>)}
            {errors.coverImageUrl && (<p className="text-sm font-medium text-destructive">{errors.coverImageUrl.message}</p>)}
        </fieldset>

        <fieldset className="space-y-5 pt-4 border-t dark:border-slate-700" disabled={isProcessingAny}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-3">Detalhes Comerciais e Físicos</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <CustomFormInput<AdminEditBookFormValues> name="price" control={control} label="Preço (R$)" type="text" placeholder="Ex: 29,90" />
                <CustomFormInput<AdminEditBookFormValues> name="stock" control={control} label="Estoque" type="number" step="1" placeholder="Ex: 10" />
                <CustomFormSelect<AdminEditBookFormValues> name="condition" control={control} label="Condição" options={bookConditionOptions} placeholder="Selecione a condição"/>
                <CustomFormSelect<AdminEditBookFormValues> name="categoryId" control={control} label="Categoria" options={categoryOptions} isLoading={isLoadingData} placeholder="Selecione uma categoria"/>
                <CustomFormSelect<AdminEditBookFormValues> name="status" control={control} label="Status do Livro" options={bookStatusOptions} placeholder="Selecione o status"/>
            </div>
        </fieldset>
        
        <fieldset className="space-y-5 pt-4 border-t dark:border-slate-700" disabled={isProcessingAny}>
            <legend className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Informações Adicionais (Opcional)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <CustomFormInput<AdminEditBookFormValues> name="isbn" control={control} label="ISBN" placeholder="Ex: 978-3-16-148410-0" />
                <CustomFormInput<AdminEditBookFormValues> name="publisher" control={control} label="Editora" placeholder="Ex: Companhia das Letras" />
                <CustomFormInput<AdminEditBookFormValues> name="publicationYear" control={control} label="Ano de Publicação" type="number" placeholder="Ex: 2023" />
                <CustomFormInput<AdminEditBookFormValues> name="language" control={control} label="Idioma" placeholder="Ex: Português" />
                <CustomFormInput<AdminEditBookFormValues> name="pages" control={control} label="Nº de Páginas" type="number" placeholder="Ex: 300" />
            </div>
            <div>
                <Label htmlFor="tags-input-admin-edit">Tags (separadas por vírgula)</Label>
                 <ShadcnInput 
                    id="tags-input-admin-edit"
                    placeholder="Ex: ficção, aventura, clássico"
                    defaultValue={getValues('tags')?.join(', ') || ''}
                    onChange={(e) => {
                        const value = e.target.value;
                        setValue('tags', value ? value.split(',').map(tag => tag.trim()).filter(Boolean) : [], {shouldDirty: true});
                    }}
                    disabled={isProcessingAny}
                    className="bg-slate-700 border-slate-600 text-gray-200 mt-1"
                 />
                 {errors.tags && <p className="text-sm font-medium text-destructive">{errors.tags.message}</p>}
             </div>
        </fieldset>

        <div className="flex justify-end space-x-3 pt-4 !mt-8">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/dashboard/books')} disabled={isProcessingAny} className="border-slate-600 hover:bg-slate-700 text-slate-200">
                Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isProcessingAny}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Salvando...' : (isUploadingImage ? 'Enviando imagem...' : 'Salvar Alterações')}
            </Button>
        </div>
      </form>
    </div>
  );
}