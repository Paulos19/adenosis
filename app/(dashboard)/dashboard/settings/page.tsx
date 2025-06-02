// src/app/(dashboard)/settings/page.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
import { SellerProfile } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { CustomFormInput } from '@/components/custom-form/CustomFormInput';
import { CustomFormTextarea } from '@/components/custom-form/CustomFormTextarea';
import { Label } from '@/components/ui/label';
import { Input as ShadcnInput } from '@/components/ui/input'; // Para file input
import { Progress } from '@/components/ui/progress';
import { useFirebaseUpload } from '@/hooks/useFirebaseUpload'; // Hook de upload

// Schema Zod (inclui storeLogoUrl)
const settingsFormSchema = z.object({
  storeName: z.string().min(3, "O nome da loja deve ter pelo menos 3 caracteres.").max(100),
  storeDescription: z.string().max(5000, "Descrição muito longa.").optional().nullable(),
  whatsappNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "WhatsApp inválido (ex: +55119...").min(10),
  storeLogoUrl: z.string().url("URL do logo inválida.").optional().nullable(),
});
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function StoreSettingsPage() {
  const router = useRouter();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [briefDescriptionForAI, setBriefDescriptionForAI] = useState(''); // Para o input da IA

  // Hook de Upload do Firebase para o LOGO
  const { 
    uploadFile: uploadLogo, 
    deleteFile: deleteLogo,
    uploadedFileUrl: uploadedLogoUrl, 
    uploadedFilePath: uploadedLogoPath,
    uploadProgress: logoUploadProgress, 
    isLoading: isUploadingLogo,
    resetUploadState: resetLogoUploadState 
  } = useFirebaseUpload('store-logos'); // Pasta 'store-logos'

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [initialLogoUrl, setInitialLogoUrl] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      storeName: '',
      storeDescription: '',
      whatsappNumber: '',
      storeLogoUrl: null,
    },
  });

  const { control, handleSubmit, formState: { isSubmitting, errors }, reset, setValue, getValues } = form;

  // Buscar dados atuais e preencher formulário
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoadingData(true);
      try {
        const response = await axios.get('/api/seller/profile');
        const profile: SellerProfile = response.data;
        const formData = {
            storeName: profile.storeName,
            storeDescription: profile.storeDescription || '',
            whatsappNumber: profile.whatsappNumber,
            storeLogoUrl: profile.storeLogoUrl || null,
        };
        reset(formData);
        if (profile.storeLogoUrl) {
            setLogoPreview(profile.storeLogoUrl);
            setInitialLogoUrl(profile.storeLogoUrl);
        }
      } catch (error) { /* ... */ } 
      finally { setIsLoadingData(false); }
    };
    fetchProfileData();
  }, [reset]);

  // Atualiza campo do formulário quando o logo é carregado
  useEffect(() => {
    if (uploadedLogoUrl) {
      setValue('storeLogoUrl', uploadedLogoUrl, { shouldValidate: true });
    }
  }, [uploadedLogoUrl, setValue]);

  const handleLogoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (uploadedLogoPath) { await deleteLogo(uploadedLogoPath); } // Deleta o anterior se já houve upload nesta sessão
      else if (initialLogoUrl && initialLogoUrl.includes("firebasestorage.googleapis.com")) {
        // Se vai substituir uma imagem antiga do Firebase, a deleção dela deve ocorrer no backend após salvar
        // Por ora, apenas guardamos a URL antiga e focamos no upload da nova.
      }
      resetLogoUploadState();
      setLogoPreview(URL.createObjectURL(file));
      const result = await uploadLogo(file); // Inicia o upload
      if (!result.url) { setLogoPreview(initialLogoUrl); if(event.target) event.target.value = '';}
    }
  };

  const handleRemoveLogo = async () => {
    if (uploadedLogoPath) { await deleteLogo(uploadedLogoPath); } // Deleta o que foi recém carregado
    else if (initialLogoUrl) {
        // Para deletar uma imagem já salva, o ideal é que o backend faça isso ao salvar com storeLogoUrl = null
        // ou ter uma flag "deleteLogo" no submit. Por enquanto, apenas limpa o preview e o campo.
        toast.success("Logo será removido ao salvar as alterações.");
    }
    resetLogoUploadState();
    setValue('storeLogoUrl', null, { shouldValidate: true });
    setLogoPreview(null);
    // setInitialLogoUrl(null); // Não resetar o initial se a imagem ainda está no DB
    const fileInput = document.getElementById('storeLogoFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleGenerateStoreDescription = async () => {
    if (!briefDescriptionForAI.trim()) {
      toast.error('Descreva brevemente sua loja para a IA gerar uma sugestão.');
      return;
    }
    const storeNameValue = getValues('storeName');
    setIsGeneratingDescription(true);
    const genToast = toast.loading('Gerando descrição da loja com IA...');
    try {
      const response = await axios.post('/api/ai/generate-store-description', { 
        briefDescription: briefDescriptionForAI,
        storeName: storeNameValue 
      });
      if (response.data.description) {
        setValue('storeDescription', response.data.description, { shouldValidate: true, shouldDirty: true });
        toast.success('Descrição sugerida pela IA!', { id: genToast });
      } else {
        toast.error(response.data.error || 'Não foi possível obter sugestão.', { id: genToast });
      }
    } catch (e) { /* ... (tratamento de erro como na página de adicionar livro) ... */ }
    finally { setIsGeneratingDescription(false); }
  };

  const onSubmit = async (values: SettingsFormValues) => {
    const loadingToast = toast.loading('Salvando alterações...');
    try {
      // Se a logoPreview for nula E havia uma initialLogoUrl, significa que o usuário removeu a logo.
      // Precisamos enviar storeLogoUrl: null para o backend para que ele possa deletar a imagem antiga se necessário.
      const dataToSubmit = { ...values };
      if (!logoPreview && initialLogoUrl) {
        dataToSubmit.storeLogoUrl = null; // Indica que a logo foi removida
      } else if (uploadedLogoUrl) {
        dataToSubmit.storeLogoUrl = uploadedLogoUrl; // Usa a nova logo carregada
      } else {
        dataToSubmit.storeLogoUrl = initialLogoUrl; // Mantém a logo original se nada mudou
      }


      const response = await axios.put('/api/seller/profile', dataToSubmit);
      toast.success('Configurações da loja atualizadas!', { id: loadingToast });
      setInitialLogoUrl(response.data.storeLogoUrl); // Atualiza o initialLogoUrl com o valor salvo
      reset(response.data); // Reseta o formulário com os dados atualizados do backend
      setLogoPreview(response.data.storeLogoUrl); // Atualiza o preview
      router.refresh();
    } catch (error) { /* ... (tratamento de erro como antes) ... */ 
        toast.dismiss(loadingToast);
        toast.error("Falha ao salvar alterações.");
    }
  };

  const isProcessing = isSubmitting || isUploadingLogo || isGeneratingDescription;

  if (isLoadingData) { /* ... (seu loader como antes) ... */ }

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Configurações da Loja</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-6 md:p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        {/* Seção Logo da Loja */}
        <fieldset className="space-y-3" disabled={isProcessing}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Logo da Loja</legend>
            <Label htmlFor="storeLogoFile" className={errors.storeLogoUrl && !logoPreview ? "text-destructive" : ""}>
                Arquivo do Logo (PNG, JPG, WEBP)
            </Label>
            <ShadcnInput 
                id="storeLogoFile" type="file" accept="image/png, image/jpeg, image/webp" 
                onChange={handleLogoFileChange} disabled={isProcessing}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-800/60 dark:file:text-emerald-300 dark:hover:file:bg-emerald-700/60"
            />
            {isUploadingLogo && <Progress value={logoUploadProgress} className="w-full h-2 mt-2 [&>*]:bg-emerald-500" />}
            {logoPreview && (
                <div className="mt-4 relative w-32 h-32 group bg-slate-700/50 rounded-full flex items-center justify-center"> {/* Preview redondo */}
                    <Image src={logoPreview} alt="Preview do logo" layout="fill" objectFit="cover" className="rounded-full" />
                    {!isUploadingLogo && (
                        <Button type="button" variant="destructive" size="icon" 
                            className="absolute top-0 right-0 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleRemoveLogo} title="Remover logo">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
            {errors.storeLogoUrl && !logoPreview && (<p className="text-sm font-medium text-destructive">{errors.storeLogoUrl.message}</p>)}
            <input type="hidden" {...form.register('storeLogoUrl')} />
        </fieldset>

        {/* Outras Configurações */}
        <fieldset className="space-y-5 pt-6 border-t dark:border-slate-700" disabled={isProcessing}>
            <legend className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Informações da Loja</legend>
            <CustomFormInput<SettingsFormValues> name="storeName" control={control} label="Nome da Loja" />
            
            <div className="space-y-2">
              <Label htmlFor="briefDescriptionForAI">Descreva brevemente sua loja (para IA)</Label>
              <ShadcnInput 
                id="briefDescriptionForAI"
                value={briefDescriptionForAI}
                onChange={(e) => setBriefDescriptionForAI(e.target.value)}
                placeholder="Ex: Um sebo aconchegante com foco em clássicos e raridades."
                className="bg-white dark:bg-slate-700/80 border-slate-300 dark:border-slate-600"
                disabled={isProcessing}
              />
            </div>
             <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="storeDescription" className={errors.storeDescription ? "text-destructive" : ""}>Descrição Completa da Loja</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleGenerateStoreDescription} disabled={isProcessing || !briefDescriptionForAI}
                        className="text-xs py-1 px-2 h-auto text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/50">
                        {isGeneratingDescription ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1.5 h-3 w-3" />}
                        Sugerir com IA
                    </Button>
                </div>
                <CustomFormTextarea<SettingsFormValues> name="storeDescription" control={control} label="" rows={8} placeholder="Conte a história e os diferenciais da sua livraria..." />
            </div>
            <CustomFormInput<SettingsFormValues> name="whatsappNumber" control={control} label="WhatsApp de Contato" />
        </fieldset>

        <div className="flex justify-end pt-6">
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isProcessing}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Salvando...' : (isUploadingLogo ? 'Enviando logo...' : (isGeneratingDescription ? 'Aguarde IA...' : 'Salvar Alterações'))}
          </Button>
        </div>
      </form>
    </div>
  );
}