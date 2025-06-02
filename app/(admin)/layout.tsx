// src/app/(admin)/layout.tsx
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Painel Admin - Adenosis Livraria',
  description: 'Administração do sistema Adenosis Livraria.',
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden bg-slate-900 text-gray-200">
      <div className="w-full flex-none md:w-64">
        <AdminSidebar />
      </div>
      <main className="flex-grow p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}