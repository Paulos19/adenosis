// src/app/(dashboard)/books/[bookId]/edit/page.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation'; // useParams para pegar o bookId
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { z } from 'zod';
import { BookCondition, Category, Book } from "@prisma/client"; 
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
import Image from 'next/image';

// Usar o mesmo schema Zod de criação, mas adaptar o comportamento.
// Ou criar um schema de update específico se as validações forem muito diferentes.
// Vamos reutilizar o schema de criação por ora.
const bookFormSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  author: z.string().min(3, "O autor deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres.").max(5000, "Descrição muito longa."),
  price: z.coerce.number().positive("O preço deve ser um valor positivo."),
  coverImageUrl: z.string().url("URL da imagem de capa inválida.").min(1, "A imagem de capa é obrigatória."),
  condition: z.nativeEnum(BookCondition),
  stock: z.coerce.number().int().min(0, "O estoque não pode ser negativo.").optional(), 
  categoryId: z.string().min(1, "Selecione uma categoria."),
  isbn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publicationYear: z.coerce.number().int().optional().nullable(),
  language: z.string().optional().nullable(),
  pages: z.coerce.number().int().optional().nullable(),
});
type BookFormValues = z.infer<typeof bookFormSchema>;

export default function EditBookPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string; // Pega o ID do livro da URL

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isLoadingBookData, setIsLoadingBookData] = useState(true);
  
  const { 
    uploadFile, deleteFile, uploadedFileUrl, uploadedFilePath,
    uploadProgress, isLoading: isUploadingImage, resetUploadState 
  } = useFirebaseUpload('book-covers');

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [initialCoverImageUrl, setInitialCoverImageUrl] = useState<string | null>(null); // Para saber se a imagem mudou

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: { // Serão preenchidos pelo fetch do livro
      title: '', author: '', description: '', price: 0,
      coverImageUrl: '', condition: undefined, stock: 1, categoryId: '',
      isbn: '', publisher: '', publicationYear: undefined, language: '', pages: undefined,
    },
  });

  const { control, handleSubmit, formState: { isSubmitting, errors }, getValues, setValue, reset, trigger } = form;

  // Buscar dados do livro para preencher o formulário
  useEffect(() => {
    if (!bookId) return;
    const fetchBookData = async () => {
      setIsLoadingBookData(true);
      try {
        const response = await axios.get(`/api/books/${bookId}`);
        const book: Book = response.data;
        // Preencher o formulário com os dados do livro
        reset({ // 'reset' preenche os defaultValues e reseta o estado do formulário
            title: book.title,
            author: book.author,
            description: book.description,
            price: book.price,
            coverImageUrl: book.coverImageUrl,
            condition: book.condition,
            stock: book.stock ?? 1,
            categoryId: book.categoryId,
            isbn: book.isbn || '',
            publisher: book.publisher || '',
            publicationYear: book.publicationYear || undefined,
            language: book.language || '',
            pages: book.pages || undefined,
        });
        setImagePreviewUrl(book.coverImageUrl); // Mostra a imagem de capa atual
        setInitialCoverImageUrl(book.coverImageUrl); // Guarda a URL inicial
      } catch (error) {
        console.error("Erro ao buscar dados do livro:", error);
        toast.error("Não foi possível carregar os dados do livro.");
        router.push("/dashboard/books"); // Volta se não conseguir carregar
      } finally {
        setIsLoadingBookData(false);
      }
    };
    fetchBookData();
  }, [bookId, reset, router]);


  // Atualizar o campo coverImageUrl no formulário quando o upload do Firebase for bem-sucedido
  useEffect(() => {
    if (uploadedFileUrl) {
      setValue('coverImageUrl', uploadedFileUrl, { shouldValidate: true });
    }
  }, [uploadedFileUrl, setValue]);

  // Buscar categorias
  useEffect(() => { /* ... (mesmo fetchCategories da página de 'new') ... */ 
    const fetchCategories = async () => {
        try { setIsLoadingCategories(true); const response = await axios.get('/api/categories'); setCategories(response.data); }
        catch (error) { console.error("Erro ao buscar categorias:", error); toast.error("Não foi possível carregar as categorias."); }
        finally { setIsLoadingCategories(false); }
    };
    fetchCategories();
  }, []);

  // Lidar com a seleção de arquivo
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Se uma nova imagem for selecionada e a imagem inicial não era do Firebase (ou queremos deletar a antiga do Firebase)
      // A deleção da imagem antiga do Firebase deve acontecer APÓS a submissão bem-sucedida do formulário com a nova imagem.
      // Por enquanto, apenas fazemos o upload da nova. O `uploadedFilePath` ajudará a saber qual deletar depois.
      // Se o usuário já tinha uma imagem (uploadedFilePath não nulo) e seleciona outra, podemos deletar a anterior do firebase.
      if (uploadedFilePath) { // Se um upload anterior nesta sessão de edição ocorreu
          await deleteFile(uploadedFilePath);
      } else if (initialCoverImageUrl && initialCoverImageUrl.includes("firebasestorage.googleapis.com")) {
          // Se a imagem inicial era do Firebase, guardamos seu path para deletar se a atualização for bem sucedida com nova imagem.
          // Esta lógica de deleção da imagem *antiga* do Firebase é melhor no backend após a atualização bem-sucedida do livro.
          // Para simplificar aqui, vamos focar no upload da nova.
      }
      
      resetUploadState(); // Limpa estado de upload anterior
      setImagePreviewUrl(URL.createObjectURL(file));
      
      const result = await uploadFile(file);
      if (result.url) {
        // O useEffect já cuida de setValue('coverImageUrl', result.url)
      } else {
        setImagePreviewUrl(initialCoverImageUrl); // Volta para a imagem inicial se o upload falhar
        if(event.target) event.target.value = '';
      }
    }
  };
  
  // Lidar com a remoção da imagem (volta para a imagem inicial ou nenhuma)
  const handleRemoveImage = async () => {
    // Se uma nova imagem foi carregada nesta sessão de edição, delete-a do Firebase
    if (uploadedFilePath) {
      await deleteFile(uploadedFilePath);
    }
    resetUploadState();
    setValue('coverImageUrl', initialCoverImageUrl || '', { shouldValidate: true }); // Volta para a URL inicial ou string vazia
    setImagePreviewUrl(initialCoverImageUrl);
    const fileInput = document.getElementById('coverImageFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Gerar Descrição com IA
  const handleGenerateDescription = async () => { /* ... (mesma função da página 'new') ... */ 
    const title = getValues('title'); const author = getValues('author');
    if (!title) { toast.error('Insira um título para gerar a descrição.'); return; }
    setIsGeneratingDescription(true); const genToast = toast.loading('Gerando descrição com IA...');
    try {
      const response = await axios.post('/api/ai/generate-description', { title, author });
      if (response.data.description) { setValue('description', response.data.description, { shouldValidate: true, shouldDirty: true }); toast.success('Descrição sugerida!', { id: genToast });}
      else { toast.error(response.data.error || 'Não foi possível obter sugestão.', { id: genToast });}
    } catch (e) { const axiosError = e as AxiosError<{ error?: string }>; toast.error(axiosError.response?.data?.error || 'Falha no serviço de IA.', { id: genToast });}
    finally { setIsGeneratingDescription(false); }
  };

  // Submissão do Formulário de Edição
  const onSubmit = async (values: BookFormValues) => {
    // Se a coverImageUrl não mudou do inicial E não houve novo upload, ou se houve novo upload bem sucedido
    if (!values.coverImageUrl && !uploadedFileUrl) {
        if(initialCoverImageUrl){ // Se tinha uma imagem inicial e o campo está vazio, significa que o usuário removeu
            values.coverImageUrl = ''; // Garante que está vazio para a API (ou trate como manter original)
        } else {
            toast.error("A imagem de capa é obrigatória.");
            trigger("coverImageUrl");
            return;
        }
    }
    
    const dataToSubmit = { ...values };
    // Lógica de limpeza de dados como na página 'new'
    // ... (price, stock, publicationYear, pages, isbn, publisher, language) ...

    const loadingToast = toast.loading('Atualizando livro...');
    try {
      await axios.put(`/api/books/${bookId}`, dataToSubmit);
      toast.dismiss(loadingToast);
      toast.success('Livro atualizado com sucesso!');
      // Opcional: Se uma imagem antiga do Firebase foi substituída, aqui seria um bom lugar para
      // chamar uma API para deletar a `initialCoverImageUrl` do Firebase, se ela era uma URL do Firebase e diferente da nova.
      // Isso requer que `initialCoverImageUrl` seja passada para a API de atualização ou uma API de delete de imagem separada.
      router.push('/dashboard/books');
      router.refresh();
    } catch (error) { /* ... (tratamento de erro como na página 'new') ... */ 
        toast.dismiss(loadingToast);
        const axiosError = error as AxiosError<{ error?: string; details?: any }>;
        const backendErrorMsg = axiosError.response?.data?.error;
        const backendDetails = axiosError.response?.data?.details;
        let displayError = backendErrorMsg || 'Algo deu errado ao atualizar o livro.';
        if (backendDetails && typeof backendDetails === 'object') {
            const fieldErrors = Object.entries(backendDetails).map(([key, messages]) => `${key}: ${(messages as string[]).join(', ')}`).join('\n');
            if (fieldErrors) displayError = fieldErrors;
        }
        toast.error(displayError, { duration: 6000 });
    }
  };

  const bookConditionOptions = Object.values(BookCondition).map(c => ({value: c, label: c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}));
  const categoryOptions = categories.map(c => ({value: c.id, label: c.name}));
  const isProcessing = isSubmitting || isUploadingImage || isGeneratingDescription || isLoadingBookData;


  if (isLoadingBookData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="ml-2">Carregando dados do livro...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Editar Livro</h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard/books">Cancelar</Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7 p-6 md:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {/* Os fieldsets e campos são os mesmos da página de adicionar, mas serão pré-preenchidos */}
        {/* Seção 1: Informações Principais */}
        <fieldset className="space-y-5" disabled={isProcessing}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-3">Informações Principais</legend>
            <CustomFormInput<BookFormValues> name="title" control={control} label="Título do Livro" />
            <CustomFormInput<BookFormValues> name="author" control={control} label="Autor(es)" />
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="description" className={errors.description ? "text-destructive" : ""}>Descrição</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isProcessing || !getValues('title')} className="text-xs ...">
                  {isGeneratingDescription ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1.5 h-3 w-3" />}
                  Sugerir com IA
                </Button>
              </div>
              <CustomFormTextarea<BookFormValues> name="description" control={control} label="" rows={8} />
            </div>
        </fieldset>

        {/* SEÇÃO 2: Imagem de Capa */}
        <fieldset className="space-y-2 pt-4 border-t dark:border-gray-700" disabled={isProcessing}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-3">Imagem de Capa</legend>
            <Label htmlFor="coverImageFile" className={errors.coverImageUrl && !imagePreviewUrl ? "text-destructive" : ""}>
                Alterar Arquivo da Capa (opcional)
            </Label>
            <ShadcnInput 
                id="coverImageFile" type="file" accept="image/*" 
                onChange={handleFileChange} disabled={isProcessing}
                className="file:mr-4 file:py-2 file:px-4 ..."/>
            {isUploadingImage && <Progress value={uploadProgress} className="w-full h-2 mt-2 [&>*]:bg-emerald-500" />}
            
            {imagePreviewUrl && (
                <div className="mt-4 relative w-32 h-48 group">
                    <Image src={imagePreviewUrl} alt="Preview da capa" layout="fill" objectFit="cover" className="rounded-md border dark:border-gray-700" />
                    {!isUploadingImage && (
                        <Button type="button" variant="destructive" size="icon" 
                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100"
                            onClick={handleRemoveImage} title="Remover imagem">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
             {!imagePreviewUrl && !isUploadingImage && ( // Mostra se o campo está vazio e não há upload
                <p className="text-sm text-muted-foreground">Nenhuma imagem de capa selecionada.</p>
            )}
            {errors.coverImageUrl && ( // Sempre mostra o erro do Zod se houver
                <p className="text-sm font-medium text-destructive">{errors.coverImageUrl.message}</p>
            )}
            <input type="hidden" {...form.register('coverImageUrl')} />
        </fieldset>

        {/* SEÇÃO 3: Detalhes Comerciais e Físicos */}
        <fieldset className="space-y-5 pt-4 border-t dark:border-gray-700" disabled={isProcessing}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-3">Detalhes Comerciais e Físicos</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <CustomFormInput<BookFormValues> name="price" control={control} label="Preço (R$)" type="number" step="0.01" />
                <CustomFormInput<BookFormValues> name="stock" control={control} label="Estoque Disponível" type="number" step="1" />
                <CustomFormSelect<BookFormValues> name="condition" control={control} label="Condição do Livro" placeholder="Selecione a condição" options={bookConditionOptions} />
                <CustomFormSelect<BookFormValues> name="categoryId" control={control} label="Categoria" placeholder="Selecione uma categoria" options={categoryOptions} isLoading={isLoadingCategories} />
            </div>
        </fieldset>
        
        {/* SEÇÃO 4: Informações Adicionais */}
        <fieldset className="space-y-5 pt-4 border-t dark:border-gray-700" disabled={isProcessing}>
            <legend className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Informações Adicionais (Opcional)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <CustomFormInput<BookFormValues> name="isbn" control={control} label="ISBN" />
                <CustomFormInput<BookFormValues> name="publisher" control={control} label="Editora" />
                <CustomFormInput<BookFormValues> name="publicationYear" control={control} label="Ano de Publicação" type="number" />
                <CustomFormInput<BookFormValues> name="language" control={control} label="Idioma" />
                <CustomFormInput<BookFormValues> name="pages" control={control} label="Número de Páginas" type="number" />
            </div>
        </fieldset>

        <div className="flex justify-end space-x-3 pt-4 !mt-8">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/books')} disabled={isProcessing}>
                Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isProcessing}>
                {isSubmitting ? 'Salvando alterações...' : (isUploadingImage ? 'Enviando imagem...' : (isGeneratingDescription ? 'Aguarde IA...' : 'Salvar Alterações'))}
            </Button>
        </div>
      </form>
    </div>
  );
}