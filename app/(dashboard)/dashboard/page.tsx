// src/app/(dashboard)/dashboard/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho se necessário
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Shadcn Card
import { BookUp, PackageCheck, Hourglass } from "lucide-react"; // Ícones para os cards
import { BooksByCategoryChart } from "@/components/dashboard/charts/BooksByCategoryChart";

// Função para buscar dados do vendedor
async function getSellerData(userId: string) {
  const sellerProfile = await db.sellerProfile.findUnique({
    where: { userId },
    include: {
      _count: { // Para contar os livros associados
        select: { books: true },
      },
      // user: { select: { name: true } } // Se quiser pegar o nome do usuário
    },
  });
  return sellerProfile;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Proteção adicional (embora o middleware já deva fazer isso)
  if (!session || !session.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
    redirect("/login?callbackUrl=/dashboard"); // Ou para uma página de acesso negado
  }

  const sellerData = await getSellerData(session.user.id);

  if (!sellerData) {
    return (
        <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Perfil de Vendedor não encontrado!</h1>
            <p className="mt-2">Por favor, contate o suporte se você acredita que isso é um erro.</p>
        </div>
    );
  }

  const booksAddedCount = sellerData._count?.books ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
        Visão Geral da Loja: <span className="text-emerald-600 dark:text-emerald-400">{sellerData.storeName}</span>
      </h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livros Adicionados</CardTitle>
            <BookUp className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{booksAddedCount}</div>
            <p className="text-xs text-muted-foreground">Total de livros na sua loja</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livros Vendidos (Confirmados)</CardTitle>
            <PackageCheck className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground">Ainda a implementar</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livros Reservados</CardTitle>
            <Hourglass className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground">Ainda a implementar</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        {/* <h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Análise de Vendas</h2> */}
        {/* O título já está dentro do componente do gráfico, mas você pode ter um título de seção aqui também */}
        <Card className="dark:bg-gray-800 shadow-lg">
          <CardContent className="p-4 md:p-6 h-[400px] md:h-[450px]"> {/* Defina uma altura para o container do gráfico */}
            <BooksByCategoryChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}