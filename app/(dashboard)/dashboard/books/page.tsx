// src/app/(dashboard)/books/page.tsx
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import Image from "next/image"; // Importe o componente Image do Next.js
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho se necessário
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit3, BookOpen as BookIconFallback } from "lucide-react"; // Renomeado BookOpen para evitar conflito
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Shadcn Card
import { Book } from "@prisma/client"; // Tipo Book do Prisma

import { DeleteBookButton } from '@/components/dashboard/DeleteBookButton'; // Nosso novo componente

// Função para buscar os livros do vendedor
async function getSellerBooks(userId: string): Promise<Book[]> {
  const sellerProfile = await db.sellerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!sellerProfile) {
    console.warn(`Perfil de vendedor não encontrado para o usuário: ${userId}`);
    return [];
  }

  const books = await db.book.findMany({
    where: { sellerId: sellerProfile.id },
    orderBy: { createdAt: "desc" },
    // include: { category: true }, // Descomente se quiser mostrar o nome da categoria na tabela
  });
  return books;
}

export default async function MyBooksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    redirect("/login?callbackUrl=/dashboard/books");
  }

  const books = await getSellerBooks(session.user.id);

  const formatCondition = (condition: string) => {
    return condition.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Meus Livros Cadastrados</h1>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600">
          <Link href="/dashboard/books/new">
            <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Novo Livro
          </Link>
        </Button>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700">
          <BookIconFallback className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nenhum livro cadastrado ainda.</h3>
          <p className="mt-2 text-md text-gray-500 dark:text-gray-400">Que tal adicionar seu primeiro livro à loja?</p>
          <div className="mt-6">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/dashboard/books/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Primeiro Livro
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <Card className="dark:bg-gray-800 shadow-lg">
          {/* Não é necessário CardHeader ou CardTitle aqui se a tabela for o conteúdo principal */}
          <CardContent className="p-0"> {/* Remover padding padrão para a tabela ocupar todo o espaço */}
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                  <TableHead className="w-[60px] sm:w-[80px] p-3">Capa</TableHead>
                  <TableHead className="p-3">Título</TableHead>
                  <TableHead className="p-3 hidden lg:table-cell">Autor</TableHead>
                  <TableHead className="p-3 hidden md:table-cell">Preço</TableHead>
                  <TableHead className="p-3 hidden sm:table-cell">Condição</TableHead>
                  <TableHead className="p-3 hidden xl:table-cell">Estoque</TableHead>
                  <TableHead className="text-right p-3">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id} className="dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <TableCell className="p-2 sm:p-3">
                      <Image
                        src={book.coverImageUrl || "/placeholder-book.png"} // Adicione uma imagem placeholder em public/
                        alt={`Capa do livro ${book.title}`}
                        width={50}
                        height={75} // Proporção mais comum para capas de livro
                        className="rounded object-cover aspect-[2/3]" // aspect-ratio para manter proporção
                      />
                    </TableCell>
                    <TableCell className="font-medium p-3 align-middle">{book.title}</TableCell>
                    <TableCell className="p-3 align-middle hidden lg:table-cell">{book.author}</TableCell>
                    <TableCell className="p-3 align-middle hidden md:table-cell">
                      R$ {book.price.toFixed(2).replace(".", ",")}
                    </TableCell>
                    <TableCell className="p-3 align-middle hidden sm:table-cell">
                      <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatCondition(book.condition)}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-3 align-middle hidden xl:table-cell">{book.stock}</TableCell>
                    <TableCell className="text-right p-3 align-middle">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          asChild 
                          className="border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          title={`Editar "${book.title}"`}
                        >
                          <Link href={`/dashboard/books/${book.id}/edit`}>
                            <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Link>
                        </Button>
                        <DeleteBookButton 
                          bookId={book.id} 
                          bookTitle={book.title} 
                          // onDeleted={() => router.refresh()} // router.refresh() já está no componente DeleteBookButton
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}