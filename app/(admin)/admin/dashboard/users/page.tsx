// src/app/(seu_grupo_admin)/dashboard/users/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { User as PrismaUser, Role, SellerProfile } from '@prisma/client';
import { UserPlus, Search, Filter, Users as UsersIcon, KeyRound, Trash2, Loader2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, 
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import { Input } from '@/components/ui/input';
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChangeUserPasswordModal } from '@/components/admin/ChangeUserPasswordModal';
import { AdminUsersPageSkeleton } from '@/components/admin/skeletons/AdminUsersPageSkeleton';
import { cn } from '@/lib/utils';

// Tipo para o retorno da API
export type UserWithProfile = PrismaUser & {
  sellerProfile: SellerProfile | null;
};

const USERS_PER_PAGE = 10;

interface PaginationInfo {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

// Função para determinar a variante da Badge de Role
const getRoleBadgeVariant = (role: Role): string => {
    switch (role) {
        case Role.ADMIN: return "bg-red-600/20 text-red-400 border-red-500/50 hover:bg-red-600/30";
        case Role.SELLER: return "bg-sky-600/20 text-sky-400 border-sky-500/50 hover:bg-sky-600/30";
        case Role.USER: return "bg-slate-600/50 text-slate-300 border-slate-500/50 hover:bg-slate-600/60";
        default: return "border-slate-500/50 text-slate-400"; // Fallback
    }
};

// Função auxiliar para verificar se uma string é um valor válido do enum Role
function isValidRole(value: string | null | undefined): value is Role {
    if (!value) return false;
    return Object.values(Role).includes(value as Role);
}

function UsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilterForSelect, setRoleFilterForSelect] = useState<Role | 'ALL'>('ALL');
  
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentRoleFilterForAPI, setCurrentRoleFilterForAPI] = useState<Role | ''>('');
  
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [actionState, setActionState] = useState<{ id: string | null; type: 'delete' | 'changePassword' | null }>({ id: null, type: null });

  const currentPage = parseInt(searchParams.get('page') || '1');

  // Sincroniza estados de filtro com searchParams na montagem e quando searchParams muda
  useEffect(() => {
    const queryFromUrl = searchParams.get('q') || '';
    const roleStringFromUrl = searchParams.get('role');
    
    const validRoleFromUrl: Role | '' = isValidRole(roleStringFromUrl) ? roleStringFromUrl as Role : '';

    setCurrentQuery(queryFromUrl);
    setCurrentRoleFilterForAPI(validRoleFromUrl);
    setRoleFilterForSelect(validRoleFromUrl === '' ? 'ALL' : validRoleFromUrl);
    setSearchTerm(queryFromUrl);
  }, [searchParams]);

  // Busca usuários quando currentPage, currentQuery ou currentRoleFilterForAPI mudam
  const fetchUsers = useCallback(async () => {
    const initialLoad = users.length === 0;
    if (initialLoad) setIsLoading(true); // Loading principal apenas na primeira carga
    else setIsLoading(false); // Para re-buscas, não queremos o skeleton da página inteira

    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', USERS_PER_PAGE.toString());
      if (currentQuery) params.append('q', currentQuery);
      if (currentRoleFilterForAPI) params.append('role', currentRoleFilterForAPI);
      
      const response = await axios.get(`/api/admin/users?${params.toString()}`);
      setUsers(response.data.data || []);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Não foi possível carregar a lista de usuários.");
      setUsers([]); 
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentQuery, currentRoleFilterForAPI]); // Removido users.length daqui

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/admin/dashboard/users?${params.toString()}`);
  };

  const handleFilterSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (roleFilterForSelect && roleFilterForSelect !== 'ALL') {
        params.set('role', roleFilterForSelect);
    }
    params.set('page', '1'); 
    router.push(`/admin/dashboard/users?${params.toString()}`);
  };
  
  const handleRoleFilterChange = (value: string) => { 
    const newRoleForSelect = value as Role | 'ALL';
    // Não precisamos mais do setRoleFilterForSelect aqui, pois o useEffect[searchParams] irá sincronizar
    // A navegação irá atualizar os searchParams, que por sua vez atualizarão os estados
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim()); // Mantém o termo de busca atual
    if (newRoleForSelect && newRoleForSelect !== 'ALL') {
        params.set('role', newRoleForSelect);
    }
    params.set('page', '1');
    router.push(`/admin/dashboard/users?${params.toString()}`);
  };

  const handleDeleteUser = async (userId: string, userName: string | null) => {
    setActionState({ id: userId, type: 'delete' });
    const deleteToast = toast.loading(`Excluindo usuário ${userName || userId}...`);
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      toast.success(`Usuário ${userName || userId} excluído com sucesso!`, { id: deleteToast });
      if (users.length === 1 && currentPage > 1) { // Se era o último item de uma página > 1
        handlePageChange(currentPage - 1);
      } else {
        fetchUsers(); 
      }
    } catch (error) { /* ... (tratamento de erro) ... */ }
    finally { setActionState({ id: null, type: null }); }
  };

  const openChangePasswordModal = (user: UserWithProfile) => {
    // Verifique com a variável de ambiente do frontend, se configurada
    if (user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL_FOR_FRONTEND) {
        toast.error("A senha do Admin Supremo não pode ser alterada por esta interface.");
        return;
    }
    setEditingUser(user);
    setIsChangePasswordModalOpen(true);
  };

  const renderPaginationItems = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    const items = []; 
    const totalPages = pagination.totalPages; 
    const currentPg = pagination.currentPage; 
    const pageSpread = 1;
    const basePath = `/admin/dashboard/users`;
    const currentParamsObj = Object.fromEntries(searchParams.entries());
    
    const createPageLink = (page: number) => {
        const newParams = new URLSearchParams({...currentParamsObj}); // Clonar
        newParams.set('page', page.toString());
        return `${basePath}?${newParams.toString()}`;
    }

    items.push(<PaginationItem key="prev"><PaginationPrevious href={currentPg > 1 ? createPageLink(currentPg - 1) : '#'}  className={cn(currentPg === 1 && "pointer-events-none opacity-60", "hover:bg-slate-700 hover:text-emerald-400")}/></PaginationItem>);
    let ellipsisStartShown = false;
    let ellipsisEndShown = false;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPg - pageSpread && i <= currentPg + pageSpread)) {
        items.push(<PaginationItem key={i}><PaginationLink href={createPageLink(i)} isActive={i === currentPg} className={cn(i === currentPg ? "bg-emerald-600 text-white hover:bg-emerald-700" : "hover:bg-slate-700 hover:text-emerald-400")}>{i}</PaginationLink></PaginationItem>);
        if (i < currentPg) ellipsisStartShown = false; // Reset flags if a number is shown
        if (i > currentPg) ellipsisEndShown = false;
      } else {
        if (i < currentPg && !ellipsisStartShown) {
          items.push(<PaginationEllipsis key="ellipsis-start" className="text-slate-400"/>);
          ellipsisStartShown = true;
        } else if (i > currentPg && !ellipsisEndShown) {
          items.push(<PaginationEllipsis key="ellipsis-end" className="text-slate-400"/>);
          ellipsisEndShown = true;
        }
      }
    }
    items.push(<PaginationItem key="next"><PaginationNext href={currentPg < totalPages ? createPageLink(currentPg + 1) : '#'} className={cn(currentPg === totalPages && "pointer-events-none opacity-60", "hover:bg-slate-700 hover:text-emerald-400")}/></PaginationItem>);
    return items;
  };

  if (isLoading && users.length === 0) {
    return <AdminUsersPageSkeleton />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-100">Gerenciar Usuários</h1>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <UserPlus className="mr-2 h-5 w-5" /> Adicionar Novo Usuário
          </Button>
        </div>

        <form onSubmit={handleFilterSubmit} className="p-4 bg-slate-800/70 rounded-lg border border-slate-700 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-grow">
              <label htmlFor="search-users" className="block text-sm font-medium text-slate-300 mb-1">Buscar Usuário</label>
              <Input id="search-users" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nome, email, nome da loja..." className="bg-slate-700 border-slate-600 placeholder-slate-500 text-gray-200 focus:ring-emerald-500 focus:border-emerald-500"/>
          </div>
          <div className="w-full sm:w-auto min-w-[180px]">
              <label htmlFor="role-filter" className="block text-sm font-medium text-slate-300 mb-1">Filtrar por Role</label>
              <Select value={roleFilterForSelect} onValueChange={handleRoleFilterChange}>
                  <SelectTrigger id="role-filter" className="bg-slate-700 border-slate-600 text-gray-200 focus:ring-emerald-500 focus:border-emerald-500"><SelectValue placeholder="Todos os Roles" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-gray-200">
                      <SelectItem value="ALL" className="hover:!bg-slate-700 focus:!bg-slate-700">Todos os Roles</SelectItem>
                      {Object.values(Role).map(role => (<SelectItem key={role} value={role} className="hover:!bg-slate-700 focus:!bg-slate-700">{role}</SelectItem>))}
                  </SelectContent>
              </Select>
          </div>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"><Filter className="h-4 w-4 mr-2" /> Aplicar Filtros</Button>
        </form>

        {isLoading && users.length > 0 && (
            <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" /></div>
        )}

        {!isLoading && users.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 rounded-lg border border-slate-700">
            <UsersIcon className="mx-auto h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-100">Nenhum usuário encontrado.</h3>
            <p className="mt-2 text-md text-slate-400">Ajuste os filtros ou adicione novos usuários.</p>
          </div>
        ) : !isLoading && users.length > 0 && (
          <div className="bg-slate-800/70 shadow-md rounded-lg border border-slate-700 overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="dark:border-slate-700 hover:bg-slate-700/50">
                  <TableHead className="p-3 w-[60px] hidden sm:table-cell">Avatar</TableHead>
                  <TableHead className="p-3">Nome & Email</TableHead>
                  <TableHead className="p-3 hidden md:table-cell">Loja</TableHead>
                  <TableHead className="p-3">Role</TableHead>
                  <TableHead className="p-3 hidden lg:table-cell">Desde</TableHead>
                  <TableHead className="text-right p-3 min-w-[100px]">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isCurrentActionDelete = actionState.id === user.id && actionState.type === 'delete';
                  const isCurrentActionChangePassword = actionState.id === user.id && actionState.type === 'changePassword';
                  const isThisUserTheAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL_FOR_FRONTEND; 

                  return (
                  <TableRow key={user.id} className="dark:border-slate-600">
                    <TableCell className="p-2 align-middle hidden sm:table-cell">
                      <Image src={user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=0D8ABC&color=fff&size=40`} alt={user.name || "Avatar"} width={40} height={40} className="rounded-full object-cover"/>
                    </TableCell>
                    <TableCell className="p-3 align-middle">
                      <div className="font-medium text-gray-100">{user.name || "N/A"}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </TableCell>
                    <TableCell className="p-3 align-middle hidden md:table-cell">
                      {user.sellerProfile ? (<Link href={`/seller/${user.sellerProfile.id}`} className="text-emerald-400 hover:underline">{user.sellerProfile.storeName}</Link>) : ( <span className="text-slate-500">-</span> )}
                    </TableCell>
                    <TableCell className="p-3 align-middle"><Badge variant="outline" className={cn("text-xs font-semibold", getRoleBadgeVariant(user.role))}>{user.role}</Badge></TableCell>
                    <TableCell className="p-3 align-middle hidden lg:table-cell text-xs text-slate-400">{format(new Date(user.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell className="text-right p-3 align-middle">
                      <div className="flex justify-end space-x-1 sm:space-x-2">
                        <Button variant="outline" size="icon" className="border-slate-600 hover:bg-slate-700 h-8 w-8" title={`Trocar senha de ${user.name || user.email}`} onClick={() => openChangePasswordModal(user)} disabled={isThisUserTheAdmin || (actionState.id === user.id)}>
                          {(actionState.id === user.id && actionState.type === 'changePassword') ? <Loader2 className="h-4 w-4 animate-spin text-yellow-400" /> : <KeyRound className="h-4 w-4 text-yellow-400" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="border-red-700/50 hover:bg-red-500/10 h-8 w-8" title={`Excluir usuário ${user.name || user.email}`} disabled={isThisUserTheAdmin || (actionState.id === user.id)}>
                              {(actionState.id === user.id && actionState.type === 'delete') ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4 text-red-400" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-900 border-slate-800 text-gray-200">
                            <AlertDialogHeader><AlertDialogTitle className="text-red-400">Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">Tem certeza que deseja excluir o usuário <strong>{user.name || user.email}</strong>? Esta ação é irreversível.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-700 hover:bg-slate-800">Cancelar</AlertDialogCancel>
                              <Button variant="destructive" onClick={() => handleDeleteUser(user.id, user.name)} disabled={actionState.id === user.id && actionState.type === 'delete'}>
                                {(actionState.id === user.id && actionState.type === 'delete') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sim, Excluir
                              </Button>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && !isLoading && ( <div className="mt-8 flex justify-center"> <Pagination> <PaginationContent className="bg-slate-800/50 border border-slate-700 rounded-md px-2 py-1"> {renderPaginationItems()} </PaginationContent> </Pagination> </div> )}
      </div>
      
      {editingUser && (
        <ChangeUserPasswordModal
          isOpen={isChangePasswordModalOpen}
          onOpenChange={setIsChangePasswordModalOpen}
          userId={editingUser.id}
          userName={editingUser.name || editingUser.email}
          onPasswordChanged={() => { /* Opcional: Toast ou ação extra */ }}
        />
      )}
    </>
  );
}

export default function AdminUsersPageContainer() {
  return (
    <Suspense fallback={<AdminUsersPageSkeleton />}>
        <UsersPageContent />
    </Suspense>
  );
}