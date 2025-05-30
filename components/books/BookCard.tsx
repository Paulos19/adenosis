// src/components/books/BookCard.tsx
import Image from "next/image";
import Link from "next/link";
import { Book, Category, SellerProfile } from "@prisma/client"; // Importe os tipos
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Send } from "lucide-react"; // Send para WhatsApp

// Definindo um tipo para o livro com relações incluídas que esperamos da API
export type BookWithDetails = Book & {
  category: Category | null;
  seller: Pick<SellerProfile, 'id' | 'storeName' | 'whatsappNumber'> | null; // Adicionado whatsappNumber
};

interface BookCardProps {
  book: BookWithDetails;
}

export function BookCard({ book }: BookCardProps) {
  const formatCondition = (condition: string) => {
    return condition.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  // Link direto para o WhatsApp do vendedor
  const whatsappLink = book.seller?.whatsappNumber 
    ? `https://wa.me/${book.seller.whatsappNumber}?text=${encodeURIComponent(`Olá, tenho interesse no livro "${book.title}" que vi na Adenosis Livraria!`)}`
    : "#";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-shadow duration-300">
      <Link href={`/books/${book.id}`} className="block">
        <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 group-hover:opacity-80 transition-opacity">
          <Image
            src={book.coverImageUrl || "/placeholder-book.png"}
            alt={`Capa do livro ${book.title}`}
            width={300} // Ajuste conforme necessário para o layout
            height={400}
            className="object-cover w-full h-full"
          />
        </div>
      </Link>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          <Link href={`/books/${book.id}`}>
            <span aria-hidden="true" className="absolute inset-0" />
            {book.title}
          </Link>
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{book.author}</p>
        <div className="mt-2">
          {book.category && (
            <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
              {book.category.name}
            </Badge>
          )}
          <Badge variant="outline" className="ml-2 text-xs dark:border-gray-600 dark:text-gray-300">
            {formatCondition(book.condition)}
          </Badge>
        </div>
        
        <div className="mt-auto pt-4"> {/* Empurra preço e botão para baixo */}
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
            R$ {book.price.toFixed(2).replace(".", ",")}
          </p>
          {book.seller?.storeName && (
            <Link href={`/seller/${book.seller.id}`} className="text-xs text-muted-foreground hover:underline">
              Vendido por: {book.seller.storeName}
            </Link>
          )}
          {/* Botão de contato via WhatsApp */}
          <Button 
            asChild 
            className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white"
            disabled={!book.seller?.whatsappNumber} // Desabilita se não houver número
          >
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Send className="mr-2 h-4 w-4" /> Contatar Vendedor
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}