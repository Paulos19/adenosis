// src/components/custom-form/CustomFormTextarea.tsx
'use client';

import { useController, Control, FieldPath, FieldValues } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Apenas Textarea é importado
import React from 'react'; // Import React para React.TextareaHTMLAttributes

// Omitimos as props controladas pelo react-hook-form de React.TextareaHTMLAttributes
type CustomTextareaBaseProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>, 
  'name' | 'defaultValue' | 'value' | 'onChange' | 'onBlur' | 'ref'
>;

// Definimos as props para nosso componente customizado, estendendo as props base do textarea
interface CustomFormTextareaProps<TFieldValues extends FieldValues> extends CustomTextareaBaseProps {
  name: FieldPath<TFieldValues>; // Garante que 'name' é uma chave válida de TFieldValues
  control: Control<TFieldValues>;
  label: string;
  // 'disabled', 'placeholder', 'className', 'rows' já estão incluídos em React.TextareaHTMLAttributes
}

export function CustomFormTextarea<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  placeholder, // Vem de React.TextareaHTMLAttributes
  disabled,    // Vem de React.TextareaHTMLAttributes
  className,   // Vem de React.TextareaHTMLAttributes
  rows,        // Vem de React.TextareaHTMLAttributes
  ...rest      // Outras props de TextareaHTMLAttributes
}: CustomFormTextareaProps<TFieldValues>) {
  const { field, fieldState: { error } } = useController({ name, control });

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={error ? "text-destructive" : ""}>
        {label}
      </Label>
      <Textarea
        id={name} // Importante para a acessibilidade com o Label
        {...field} // Espalha props do RHF (value, onChange, onBlur, ref)
        {...rest}  // Espalha outras props de textarea como placeholder, rows, etc.
        placeholder={placeholder}
        rows={rows}
        disabled={disabled || control._formState.isSubmitting} // Desabilita se o form estiver submetendo
        className={`${error ? "border-destructive focus-visible:ring-destructive" : ""} ${className || ''}`}
      />
      {error && (
        <p className="text-sm font-medium text-destructive mt-1">
          {error.message}
        </p>
      )}
    </div>
  );
}