// src/components/custom-form/CustomFormSelect.tsx
'use client';

import { useController, Control, FieldPath, FieldValues } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import React from 'react';

interface CustomFormSelectProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string; // Para estilização adicional do container do select
  triggerClassName?: string; // Para estilização adicional do SelectTrigger
  contentClassName?: string; // Para estilização adicional do SelectContent
}

export function CustomFormSelect<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  options,
  disabled,
  isLoading,
  className,
  triggerClassName,
  contentClassName,
}: CustomFormSelectProps<TFieldValues>) {
  const { field, fieldState: { error } } = useController({ name, control });

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor={name} className={error ? "text-destructive" : ""}>
        {label}
      </Label>
      <Select
        onValueChange={field.onChange}
        value={field.value as string | undefined} // Permite undefined para o placeholder
        disabled={disabled || control._formState.isSubmitting || isLoading}
        name={field.name}
      >
        {/* O SelectTrigger não precisa estar dentro de um FormControl da Shadcn aqui */}
        <SelectTrigger
          id={name}
          ref={field.ref}
          onBlur={field.onBlur} // RHF pode precisar disso para 'touched' state
          className={`${error ? "border-destructive focus:ring-destructive" : ""} ${triggerClassName || ''}`}
        >
          <SelectValue placeholder={isLoading ? "Carregando..." : placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {!isLoading && options.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground text-center">Nenhuma opção.</p>
          )}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm font-medium text-destructive mt-1">{error.message}</p>}
    </div>
  );
}