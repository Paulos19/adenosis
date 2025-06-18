// src/app/(admin_group_name)/dashboard/books/[bookId]/edit/page.tsx
import { Suspense } from 'react';
import { AdminBookEditForm } from '@/components/admin/books/AdminBookEditForm'; // Importe o formulário
import { AdminBooksPageSkeleton } from '@/components/admin/skeletons/AdminBooksPageSkeleton'; // Pode usar um skeleton mais específico do formulário
import { Metadata } from 'next';

// Opcional: gerar metadados para a página de edição
export const metadata: Metadata = {
  title: 'Editar Livro (Admin) | Adenosis Livraria',
};

interface AdminEditBookPageContainerProps {
  params: {
    bookId: string;
  };
}

export default function AdminEditBookPageContainer({ params }: AdminEditBookPageContainerProps) {
  return (
    // O Layout do Admin (`src/app/(admin_group_name)/layout.tsx`) já envolve esta página.
    // O Suspense aqui é para o carregamento dos dados dentro do AdminBookEditForm.
    <Suspense fallback={<AdminBooksPageSkeleton />}> {/* Ou um AdminBookFormSkeleton mais específico */}
        <AdminBookEditForm bookId={params.bookId} />
    </Suspense>
  );
}