// src/hooks/useFirebaseUpload.ts
'use client'; // Este hook será usado em componentes cliente

import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase'; // Nossa configuração do Firebase Storage
import toast from 'react-hot-toast';

interface UploadResult {
  url: string | null;
  error: Error | null;
  filePath: string | null; // Para poder deletar se necessário
}

interface UploadProgress {
  progress: number;
  isLoading: boolean;
}

export function useFirebaseUpload(uploadPath: string = 'images') {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<UploadResult> => {
    if (!file) {
      return { url: null, error: new Error('Nenhum arquivo selecionado.'), filePath: null };
    }

    setIsLoading(true);
    setUploadProgress(0);
    setUploadedFileUrl(null);
    setUploadedFilePath(null);

    // Cria um nome de arquivo único (ex: timestamp_nomeoriginal.ext)
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${uploadPath}/${fileName}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Erro no upload:", error);
          setIsLoading(false);
          setUploadProgress(0);
          toast.error(`Falha no upload: ${error.message}`);
          resolve({ url: null, error, filePath: null }); // Resolve com erro para o chamador tratar
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadedFileUrl(downloadURL);
            setUploadedFilePath(filePath);
            setIsLoading(false);
            toast.success('Upload concluído com sucesso!');
            resolve({ url: downloadURL, error: null, filePath });
          } catch (error: any) {
            console.error("Erro ao obter URL de download:", error);
            setIsLoading(false);
            toast.error(`Falha ao obter URL: ${error.message}`);
            resolve({ url: null, error, filePath: null });
          }
        }
      );
    });
  };

  const deleteFile = async (filePathToDelete: string): Promise<boolean> => {
    if (!filePathToDelete) {
      console.warn("Nenhum caminho de arquivo fornecido para exclusão.");
      return false;
    }
    const fileRef = ref(storage, filePathToDelete);
    try {
      await deleteObject(fileRef);
      toast.success("Arquivo anterior removido.");
      if (uploadedFilePath === filePathToDelete) { // Limpa o estado se o arquivo atual for deletado
        setUploadedFileUrl(null);
        setUploadedFilePath(null);
      }
      return true;
    } catch (error: any) {
      toast.error(`Erro ao deletar arquivo: ${error.message}`);
      console.error("Erro ao deletar arquivo:", error);
      return false;
    }
  };


  return {
    uploadFile,
    deleteFile,
    uploadedFileUrl,
    uploadedFilePath,
    uploadProgress,
    isLoading,
    // Funções para resetar o estado se necessário
    resetUploadState: () => {
        setUploadProgress(0);
        setIsLoading(false);
        setUploadedFileUrl(null);
        setUploadedFilePath(null);
    }
  };
}