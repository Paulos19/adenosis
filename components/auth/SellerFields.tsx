// src/components/auth/SellerFields.tsx
'use client';

import { Control } from 'react-hook-form';
import { type RegisterFormValues } from '@/lib/validators/auth';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface SellerFieldsProps {
  control: Control<RegisterFormValues>;
  isSubmitting?: boolean;
}

export function SellerFields({ control, isSubmitting }: SellerFieldsProps) {
  return (
    <div className="space-y-5"> {/* Adicionado um div wrapper com space-y para consistência */}
      <FormField
        control={control}
        name="storeName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome da sua Livraria</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Livraria Cantinho do Saber" {...field} disabled={isSubmitting} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="whatsappNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Seu WhatsApp</FormLabel>
            <FormControl>
              <Input placeholder="+55 (11) 99999-9999" {...field} disabled={isSubmitting} />
            </FormControl>
            <FormDescription>
              Inclua DDI (+55) e DDD.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}