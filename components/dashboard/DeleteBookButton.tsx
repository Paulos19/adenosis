// src/components/dashboard/DeleteBookButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Trash2, Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

interface DeleteBookButtonProps {
  bookId: string;
  bookTitle: string;
  onDeleted?: () => void; // Callback opcional após a exclusão
}

export function DeleteBookButton({ bookId, bookTitle, onDeleted }: DeleteBookButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const deletingToast = toast.loading(`Excluindo "${bookTitle}"...`);
    try {
      await axios.delete(`/api/books/${bookId}`);
      toast.success(`Livro "${bookTitle}" excluído com sucesso!`, { id: deletingToast });
      setIsOpen(false); // Fecha o diálogo
      if (onDeleted) {
        onDeleted(); // Chama o callback (ex: router.refresh())
      } else {
        router.refresh(); // Atualiza a lista de livros se nenhum callback for fornecido
      }
    } catch (error) {
      toast.dismiss(deletingToast);
      const axiosError = error as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error || "Falha ao excluir o livro.");
      console.error("Erro ao excluir livro:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon" title="Excluir" className="hover:bg-red-100 dark:hover:bg-red-700/20 border-red-300 dark:border-red-700">
          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o livro "<strong>{bookTitle}</strong>"? Esta ação não poderá ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}