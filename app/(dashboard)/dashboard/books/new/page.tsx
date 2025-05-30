'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image'; 
import { z } from 'zod';
import { BookCondition, Category } from "@prisma/client"; 
import { useEffect, useState, ChangeEvent } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react'; 

import { Button } from '@/components/ui/button';
import { CustomFormInput } from '@/components/custom-form/CustomFormInput';
import { CustomFormSelect } from '@/components/custom-form/CustomFormSelect';
import { CustomFormTextarea } from '@/components/custom-form/CustomFormTextarea';
import { Label } from '@/components/ui/label';
import { Input as ShadcnInput } from '@/components/ui/input'; 
import { Progress } from "@/components/ui/progress";
import { useFirebaseUpload } from '@/hooks/useFirebaseUpload';

const bookFormSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  author: z.string().min(3, "O autor deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres.").max(5000, "Descrição muito longa."),
  price: z.coerce.number().positive("O preço deve ser um valor positivo."),
  coverImageUrl: z.string().url("URL da imagem de capa inválida.").min(1, "A imagem de capa é obrigatória."),
  condition: z.nativeEnum(BookCondition, { errorMap: () => ({ message: "Selecione uma condição válida."}) }),
  stock: z.coerce.number().int().min(0, "O estoque não pode ser negativo.").optional(), 
  categoryId: z.string().min(1, "Selecione uma categoria."),
  isbn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publicationYear: z.coerce.number().int().optional().nullable(),
  language: z.string().optional().nullable(),
  pages: z.coerce.number().int().optional().nullable(),
});
type BookFormValues = z.infer<typeof bookFormSchema>;

export default function AddNewBookPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const { 
    uploadFile, 
    deleteFile,
    uploadedFileUrl, 
    uploadedFilePath,
    uploadProgress, 
    isLoading: isUploadingImage, 
    resetUploadState 
  } = useFirebaseUpload('book-covers'); 

  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: '',
      author: '',
      description: '',
      price: 0, 
      coverImageUrl: '',
      condition: undefined, 
      stock: 1, 
      categoryId: '',     
      isbn: '',
      publisher: '',
      publicationYear: undefined, 
      language: '',
      pages: undefined,           
    },
  });
  const { 
    control, 
    handleSubmit, 
    formState: { isSubmitting, errors }, 
    getValues,
    setValue,
    trigger, 
    reset 
  } = form;

  useEffect(() => {
    if (uploadedFileUrl) {
      setValue('coverImageUrl', uploadedFileUrl, { shouldValidate: true });
    }
  }, [uploadedFileUrl, setValue]);

  useEffect(() => {
    if (!uploadedFileUrl && imagePreviewUrl) {
        setImagePreviewUrl(null);
        setSelectedFileForUpload(null);
    }
  }, [uploadedFileUrl, imagePreviewUrl]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await axios.get('/api/categories');
        setCategories(response.data);
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        toast.error("Não foi possível carregar as categorias.");
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (uploadedFilePath) { 
        await deleteFile(uploadedFilePath); 
        resetUploadState(); 
        setValue('coverImageUrl', '', {shouldValidate: true}); 
      }

      setSelectedFileForUpload(file);
      setImagePreviewUrl(URL.createObjectURL(file)); 
      
      const result = await uploadFile(file); 
      if (!result.url) { 
        setImagePreviewUrl(null);
        setSelectedFileForUpload(null);
        if (event.target) event.target.value = ''; 
      }
    }
  };
  
  const handleRemoveImage = async () => {
    if (uploadedFilePath) {
      await deleteFile(uploadedFilePath);
    }
    resetUploadState();
    setValue('coverImageUrl', '', {shouldValidate: true});
    setImagePreviewUrl(null);
    setSelectedFileForUpload(null);
    const fileInput = document.getElementById('coverImageFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleGenerateDescription = async () => {
    const title = getValues('title');
    const author = getValues('author');
    if (!title) {
      toast.error('Insira um título para gerar a descrição.');
      return;
    }
    setIsGeneratingDescription(true);
    const genToast = toast.loading('Gerando descrição com IA...');
    try {
      const response = await axios.post('/api/ai/generate-description', { title, author });
      if (response.data.description) {
        setValue('description', response.data.description, { shouldValidate: true, shouldDirty: true });
        toast.success('Descrição sugerida pela IA!', { id: genToast });
      } else {
        toast.error(response.data.error || 'Não foi possível obter uma sugestão.', { id: genToast });
      }
    } catch (e) {  } 
    finally { setIsGeneratingDescription(false); }
  };

  const onSubmit = async (values: BookFormValues) => {
    if (!values.coverImageUrl && !uploadedFileUrl) { 
        toast.error("Por favor, faça o upload de uma imagem de capa ou aguarde o término do upload.");
        trigger("coverImageUrl");
        return;
    }
    const finalCoverImageUrl = values.coverImageUrl || uploadedFileUrl;

    if (!finalCoverImageUrl) { 
        toast.error("A imagem de capa é obrigatória.");
        return;
    }

    const dataToSubmit = {
        ...values,
        coverImageUrl: finalCoverImageUrl, 
        price: Number(values.price),
        stock: values.stock === undefined || values.stock === null || isNaN(Number(values.stock)) ? undefined : Number(values.stock),
        publicationYear: values.publicationYear ? Number(values.publicationYear) : null,
        pages: values.pages ? Number(values.pages) : null,
        isbn: values.isbn || null,
        publisher: values.publisher || null,
        language: values.language || null,
    };
    
    const loadingToast = toast.loading('Adicionando livro...');
    try {
      await axios.post('/api/books', dataToSubmit);
      toast.dismiss(loadingToast);
      toast.success('Livro adicionado com sucesso!');
      reset(); 
      resetUploadState();
      setImagePreviewUrl(null);
      setSelectedFileForUpload(null);
      router.push('/dashboard/books'); 
      router.refresh(); 
    } catch (error) {  
        toast.dismiss(loadingToast);
        const axiosError = error as AxiosError<{ error?: string; details?: any }>;
        const backendErrorMsg = axiosError.response?.data?.error;
        const backendDetails = axiosError.response?.data?.details;
        let displayError = backendErrorMsg || 'Algo deu errado ao adicionar o livro.';
        if (backendDetails && typeof backendDetails === 'object') {
            const fieldErrors = Object.entries(backendDetails).map(([key, messages]) => `${key}: ${(messages as string[]).join(', ')}`).join('\n');
            if (fieldErrors) displayError = fieldErrors;
        }
        toast.error(displayError, { duration: 6000 });
    }
  };

  const bookConditionOptions = Object.values(BookCondition).map(condition => ({
    value: condition,
    label: condition.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
  }));
  const categoryOptions = categories.map(category => ({ value: category.id, label: category.name }));

  const isProcessing = isSubmitting || isUploadingImage || isGeneratingDescription;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Adicionar Novo Livro</h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/books">Cancelar</Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7 p-6 md:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {}
        <fieldset className="space-y-5" disabled={isProcessing}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-3">Informações Principais</legend>
            <CustomFormInput<BookFormValues> name="title" control={control} label="Título do Livro" placeholder="Ex: O Guia do Mochileiro das Galáxias" />
            <CustomFormInput<BookFormValues> name="author" control={control} label="Autor(es)" placeholder="Ex: Douglas Adams" />
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="description" className={errors.description ? "text-destructive" : ""}>Descrição</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isProcessing || !getValues('title')} className="text-xs py-1 px-2 h-auto text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/50">
                  {isGeneratingDescription ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1.5 h-3 w-3" />}
                  Sugerir com IA
                </Button>
              </div>
              <CustomFormTextarea<BookFormValues> name="description" control={control} label="" placeholder="Detalhes sobre o livro... (Adicione uma Imagem para poder utilizar a IA)" rows={8} />
            </div>
        </fieldset>

        {}
        <fieldset className="space-y-2 pt-4 border-t dark:border-gray-700" disabled={isProcessing}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-3">Imagem de Capa</legend>
            <Label htmlFor="coverImageFile" className={errors.coverImageUrl && !imagePreviewUrl ? "text-destructive" : ""}>Arquivo da Capa</Label>
            <ShadcnInput 
                id="coverImageFile" 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleFileChange}
                disabled={isProcessing}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-800 dark:file:text-emerald-300 dark:hover:file:bg-emerald-700"
            />
            {isUploadingImage && (
                <div className="mt-2 space-y-1">
                    <Progress value={uploadProgress} className="w-full h-2 [&>*]:bg-emerald-500" />
                    <p className="text-xs text-muted-foreground">{uploadProgress}% enviado</p>
                </div>
            )}
            {imagePreviewUrl && (
                <div className="mt-4 relative w-32 h-48 group">
                    <Image src={imagePreviewUrl} alt="Preview da capa" layout="fill" objectFit="cover" className="rounded-md border dark:border-gray-700" />
                    {!isUploadingImage && (
                        <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleRemoveImage}
                            title="Remover imagem"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
            {errors.coverImageUrl && !imagePreviewUrl && !isUploadingImage && (
                <p className="text-sm font-medium text-destructive">{errors.coverImageUrl.message}</p>
            )}
             {}
            <input type="hidden" {...form.register('coverImageUrl')} />
        </fieldset>

        {}
        <fieldset className="space-y-5 pt-4 border-t dark:border-gray-700" disabled={isProcessing}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-3">Detalhes Comerciais e Físicos</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <CustomFormInput<BookFormValues> name="price" control={control} label="Preço (R$)" type="number" step="0.01" placeholder="29.90" />
                <CustomFormInput<BookFormValues> name="stock" control={control} label="Estoque Disponível" type="number" step="1" placeholder="1" />
                <CustomFormSelect<BookFormValues> name="condition" control={control} label="Condição do Livro" placeholder="Selecione a condição" options={bookConditionOptions} />
                <CustomFormSelect<BookFormValues> name="categoryId" control={control} label="Categoria" placeholder="Selecione uma categoria" options={categoryOptions} isLoading={isLoadingCategories} />
            </div>
        </fieldset>
        
        {}
        <fieldset className="space-y-5 pt-4 border-t dark:border-gray-700" disabled={isProcessing}>
            <legend className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Informações Adicionais (Opcional)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <CustomFormInput<BookFormValues> name="isbn" control={control} label="ISBN" placeholder="978-3-16-148410-0" />
                <CustomFormInput<BookFormValues> name="publisher" control={control} label="Editora" placeholder="Ex: Companhia das Letras" />
                <CustomFormInput<BookFormValues> name="publicationYear" control={control} label="Ano de Publicação" type="number" placeholder="2023" />
                <CustomFormInput<BookFormValues> name="language" control={control} label="Idioma" placeholder="Ex: Português" />
                <CustomFormInput<BookFormValues> name="pages" control={control} label="Número de Páginas" type="number" placeholder="300" />
            </div>
        </fieldset>

        <div className="flex justify-end space-x-3 pt-4 !mt-8">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isProcessing}>
                Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isProcessing}>
                {isSubmitting ? 'Salvando...' : (isUploadingImage ? 'Enviando imagem...' : (isGeneratingDescription ? 'Aguarde IA...' : 'Adicionar Livro'))}
            </Button>
        </div>
      </form>
    </div>
  );
}