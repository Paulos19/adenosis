import { Metadata } from 'next';
import { db } from '@/lib/prisma'; // Seu cliente Prisma
import { StatCard } from '@/components/admin/dashboard/StatCard'; // Nosso novo componente
import { Users, Library, MessageSquareText, ShoppingBag, Store, Palette } from 'lucide-react'; // Ícones
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';


// Função para buscar as estatísticas do admin
async function getAdminDashboardStats() {
  try {
    const [
      totalUsers,
      totalSellers,
      totalBooks,
      totalPublishedBooks,
      totalCategories,
      totalReservations,
      totalCompletedReservations,
      totalRatings
    ] = await db.$transaction([
      db.user.count(),
      db.sellerProfile.count(),
      db.book.count(),
      db.book.count({ where: { status: 'PUBLISHED' } }),
      db.category.count(),
      db.reservation.count(),
      db.reservation.count({ where: { status: 'COMPLETED' } }),
      db.sellerRating.count(),
    ]);

    return {
      totalUsers,
      totalSellers,
      totalBooks,
      totalPublishedBooks,
      totalCategories,
      totalReservations,
      totalCompletedReservations,
      totalRatings,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas do admin:", error);
    // Retorna valores zerados em caso de erro para não quebrar a página
    return {
      totalUsers: 0,
      totalSellers: 0,
      totalBooks: 0,
      totalPublishedBooks: 0,
      totalCategories: 0,
      totalReservations: 0,
      totalCompletedReservations: 0,
      totalRatings: 0,
    };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  // Placeholders para links rápidos
  const quickAccessLinks = [
    { href: "/admin/dashboard/users", label: "Gerenciar Usuários", icon: Users },
    { href: "/admin/dashboard/books", label: "Gerenciar Livros", icon: Library },
    { href: "/admin/dashboard/categories", label: "Gerenciar Categorias", icon: Palette },
    { href: "/admin/dashboard/orders", label: "Ver Pedidos/Reservas", icon: ShoppingBag },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100">
          Visão Geral <span className="text-emerald-400">Admin</span>
        </h1>
        {/* Você pode adicionar um botão aqui, ex: "Configurações Gerais do Site" */}
      </div>
      
      {/* Grid de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard 
          title="Total de Usuários" 
          value={stats.totalUsers} 
          icon={Users}
          description="Todos os usuários cadastrados"
          iconClassName="text-sky-400"
        />
        <StatCard 
          title="Total de Lojas (Vendedores)" 
          value={stats.totalSellers} 
          icon={Store}
          description="Livrarias ativas na plataforma"
          iconClassName="text-blue-400"
        />
        <StatCard 
          title="Total de Livros Cadastrados" 
          value={stats.totalBooks} 
          icon={Library}
          description={`${stats.totalPublishedBooks} publicados`}
          iconClassName="text-lime-400"
        />
        <StatCard 
          title="Categorias Criadas" 
          value={stats.totalCategories} 
          icon={Palette}
          description="Gêneros e seções de livros"
          iconClassName="text-purple-400"
        />
        <StatCard 
          title="Reservas/Pedidos Totais" 
          value={stats.totalReservations} 
          icon={ShoppingBag}
          description={`${stats.totalCompletedReservations} concluídos`}
          iconClassName="text-orange-400"
        />
        <StatCard 
          title="Avaliações Recebidas" 
          value={stats.totalRatings} 
          icon={MessageSquareText}
          description="Feedback dos clientes para vendedores"
          iconClassName="text-pink-400"
        />
        {/* Adicione mais StatCards conforme necessário */}
      </div>

      {/* Seção de Acesso Rápido */}
      <div className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-100 mb-6">Acesso Rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickAccessLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="block group">
                <Card className="bg-slate-800/70 border-slate-700 text-gray-200 hover:border-emerald-500/60 hover:bg-slate-700/50 transition-all duration-200">
                  <CardHeader>
                    <Icon className="h-8 w-8 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <CardTitle className="text-lg font-semibold text-gray-50 group-hover:text-emerald-300 transition-colors">
                      {link.label}
                    </CardTitle>
                  </CardHeader>
                  {/* <CardContent><p className="text-xs text-slate-400">Clique para gerenciar.</p></CardContent> */}
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Placeholder para Atividades Recentes ou Gráficos Admin */}
      <div className="mt-10 p-6 bg-slate-800/70 rounded-lg shadow border border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-3">Atividades Recentes / Outros Gráficos</h2>
        <p className="text-slate-400">Em breve: logs de atividades importantes, gráficos de crescimento, etc.</p>
      </div>
    </div>
  );
}