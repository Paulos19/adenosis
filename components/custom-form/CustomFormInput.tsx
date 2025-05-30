// src/components/custom-form/CustomFormInput.tsx
'use client';

import { useController, Control, FieldPath, FieldValues } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Apenas Input é importado, não InputProps
import React from 'react'; // Import React para React.InputHTMLAttributes

// TFieldValues pode ser seu RegisterFormValues ou um tipo genérico
// Estendemos React.InputHTMLAttributes<HTMLInputElement> para incluir todas as props de um input padrão
interface CustomFormInputProps<TFieldValues extends FieldValues>
  extends React.InputHTMLAttributes<HTMLInputElement> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  // 'type', 'placeholder', 'disabled', 'className' já estão incluídos em React.InputHTMLAttributes
}

export function CustomFormInput<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  type = "text", // Podemos manter o default para type
  className,
  disabled, // disabled também virá de React.InputHTMLAttributes
  ...rest // 'placeholder' e outras props de input padrão virão via ...rest
}: CustomFormInputProps<TFieldValues>) {
  const { field, fieldState: { error } } = useController({ name, control });

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={error ? "text-destructive" : ""}>
        {label}
      </Label>
      <Input
        id={name}
        {...field} // Espalha props do RHF (onChange, onBlur, value, name, ref)
        {...rest} // Espalha outras props de input como placeholder, etc.
        type={type}
        disabled={disabled || control._formState.isSubmitting}
        className={`${error ? "border-destructive focus-visible:ring-destructive" : ""} ${className || ''}`}
      />
      {error && (
        <p className="text-sm font-medium text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}