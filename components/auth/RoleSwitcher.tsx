// src/components/auth/RoleSwitcher.tsx
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RoleSwitcherProps {
  selectedRole: 'USER' | 'SELLER' | undefined;
  onRoleChange: (role: 'USER' | 'SELLER') => void;
  disabled?: boolean;
}

export function RoleSwitcher({ selectedRole, onRoleChange, disabled }: RoleSwitcherProps) {
  return (
    <div className="flex w-full rounded-md bg-muted p-1">
      <Button
        onClick={() => onRoleChange('USER')}
        variant="ghost" // Alterado para ghost para melhor contraste com o selecionado
        className={cn(
          "flex-1 transition-all duration-200 ease-in-out",
          selectedRole === 'USER' && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        )}
        disabled={disabled}
        type="button" // Garante que não submete o formulário
      >
        Quero Comprar
      </Button>
      <Button
        onClick={() => onRoleChange('SELLER')}
        variant="ghost" // Alterado para ghost
        className={cn(
          "flex-1 transition-all duration-200 ease-in-out",
          selectedRole === 'SELLER' && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        )}
        disabled={disabled}
        type="button" // Garante que não submete o formulário
      >
        Quero Vender
      </Button>
    </div>
  );
}