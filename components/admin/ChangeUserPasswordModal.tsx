// src/components/admin/ChangeUserPasswordModal.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Loader2, KeyRound } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CustomFormInput } from '@/components/custom-form/CustomFormInput'; // Seu componente

// Schema Zod para o formulário de nova senha (incluindo confirmação)
const newPasswordFormSchema = z.object({
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
  confirmNewPassword: z.string().min(6, "Confirme a nova senha."),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmNewPassword"], // Erro no campo de confirmação
});
type NewPasswordFormValues = z.infer<typeof newPasswordFormSchema>;

interface ChangeUserPasswordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName?: string | null;
  onPasswordChanged?: () => void; // Callback opcional
}

export function ChangeUserPasswordModal({
  isOpen,
  onOpenChange,
  userId,
  userName,
  onPasswordChanged,
}: ChangeUserPasswordModalProps) {
  const form = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordFormSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });
  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = form;

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      reset(); // Reseta o formulário ao fechar
    }
    onOpenChange(open);
  };

  const onSubmit = async (values: NewPasswordFormValues) => {
    if (!userId) {
      toast.error("ID do usuário não fornecido.");
      return;
    }
    const changeToast = toast.loading(`Alterando senha para ${userName || userId}...`);
    try {
      await axios.patch(`/api/admin/users/${userId}/change-password`, {
        newPassword: values.newPassword,
      });
      toast.success(`Senha de ${userName || userId} alterada com sucesso!`, { id: changeToast });
      if (onPasswordChanged) onPasswordChanged();
      handleModalOpenChange(false); // Fecha o modal
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string; details?: any }>;
      const errorMsg = axiosError.response?.data?.error || 
                       (axiosError.response?.data?.details && typeof axiosError.response.data.details === 'object' 
                         ? Object.values(axiosError.response.data.details).flat().join(' ')
                         : "Falha ao alterar a senha.");
      toast.error(errorMsg, { id: changeToast });
      console.error("Erro ao alterar senha:", error);
    }
  };

  if (!userId) return null; // Não renderiza se não houver userId

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-gray-200 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-emerald-400 text-xl">
            Alterar Senha do Usuário: <span className="text-white font-semibold">{userName || userId}</span>
          </DialogTitle>
          <DialogDescription className="text-slate-400 pt-1">
            Digite a nova senha para o usuário. O usuário deverá ser notificado sobre esta alteração (se configurado).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
          <CustomFormInput<NewPasswordFormValues>
            name="newPassword"
            control={control}
            label="Nova Senha"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
          />
          <CustomFormInput<NewPasswordFormValues>
            name="confirmNewPassword"
            control={control}
            label="Confirmar Nova Senha"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
          />
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-slate-700 hover:bg-slate-800">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Salvando...' : 'Alterar Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}