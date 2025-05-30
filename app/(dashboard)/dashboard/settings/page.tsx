// src/app/(dashboard)/settings/page.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Para refresh

import { Button } from '@/components/ui/button';
import { CustomFormInput } from '@/components/custom-form/CustomFormInput';
import { CustomFormTextarea } from '@/components/custom-form/CustomFormTextarea';
import { Loader2 } from 'lucide-react';
import { SellerProfile } from '@prisma/client'; // Importe o tipo

// Schema Zod para o formulário de configurações (similar ao da API)
const settingsFormSchema = z.object({
  storeName: z.string().min(3, "O nome da loja deve ter pelo menos 3 caracteres.").max(100),
  storeDescription: z.string().max(1000, "Descrição muito longa.").optional().nullable(),
  whatsappNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Número de WhatsApp inválido.").min(10, "Número de WhatsApp muito curto."),
});
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function StoreSettingsPage() {
  const router = useRouter();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<Partial<SettingsFormValues>>({});

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: { // Serão preenchidos com os dados atuais
      storeName: '',
      storeDescription: '',
      whatsappNumber: '',
    },
  });

  const { control, handleSubmit, formState: { isSubmitting, errors }, reset } = form;

  // Buscar dados atuais do perfil da loja
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoadingData(true);
      try {
        const response = await axios.get('/api/seller/profile');
        const profile: SellerProfile = response.data;
        const formData = {
            storeName: profile.storeName,
            storeDescription: profile.storeDescription || '',
            // A API de GET /api/seller/profile retorna o número já formatado (ex: 55119...).
            // O input pode precisar do formato com + ou () para melhor UX,
            // mas a API PUT espera um formato que possa ser limpo.
            // Para simplicidade, vamos exibir o que vem da API.
            whatsappNumber: profile.whatsappNumber,
        };
        reset(formData); // Preenche o formulário com os dados
        setInitialData(formData);
      } catch (error) {
        console.error("Erro ao buscar perfil da loja:", error);
        toast.error("Não foi possível carregar as configurações da sua loja.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchProfileData();
  }, [reset]);

  const onSubmit = async (values: SettingsFormValues) => {
    const loadingToast = toast.loading('Salvando alterações...');
    try {
      await axios.put('/api/seller/profile', values);
      toast.success('Configurações da loja atualizadas com sucesso!', { id: loadingToast });
      setInitialData(values); // Atualiza os dados iniciais para o novo estado salvo
      router.refresh(); // Atualiza dados do servidor se houver (ex: nome da loja no layout)
    } catch (error) {
      toast.dismiss(loadingToast);
      const axiosError = error as AxiosError<{ error?: string; details?: any }>;
      const backendErrorMsg = axiosError.response?.data?.error;
      const backendDetails = axiosError.response?.data?.details;
      let displayError = backendErrorMsg || 'Algo deu errado ao salvar as alterações.';
      if (backendDetails && typeof backendDetails === 'object') {
        const fieldErrors = Object.entries(backendDetails)
          .map(([key, messages]) => `${key}: ${(messages as string[]).join(', ')}`)
          .join('\n');
        if (fieldErrors) displayError = fieldErrors;
      }
      toast.error(displayError);
      console.error("Erro ao atualizar perfil:", error);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="ml-2">Carregando configurações da loja...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Configurações da Loja</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7 p-6 md:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <CustomFormInput<SettingsFormValues>
          name="storeName"
          control={control}
          label="Nome da Loja"
          placeholder="O nome público da sua livraria"
          disabled={isSubmitting}
        />
        <CustomFormTextarea<SettingsFormValues>
          name="storeDescription"
          control={control}
          label="Descrição da Loja (Opcional)"
          placeholder="Conte um pouco sobre sua loja, seus diferenciais, etc."
          rows={5}
          disabled={isSubmitting}
        />
        <CustomFormInput<SettingsFormValues>
          name="whatsappNumber"
          control={control}
          label="Número do WhatsApp para Contato"
          placeholder="+55 (11) 99999-9999 (com DDI + DDD)"
          disabled={isSubmitting}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  );
}