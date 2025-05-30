// src/lib/validators/auth.ts
import * as z from 'zod';

// Schema e Tipo para o Formulário de Registro
export const registerFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome precisa ter no mínimo 3 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha precisa ter no mínimo 6 caracteres.' }),
  role: z.enum(['USER', 'SELLER'], { required_error: 'Por favor, selecione o tipo de conta.' }),
  storeName: z.string().optional(),
  whatsappNumber: z.string().optional(),
}).refine(data => {
  if (data.role === 'SELLER') {
    return !!data.storeName && data.storeName.length >= 3;
  }
  return true;
}, {
  message: "O nome da loja precisa ter no mínimo 3 caracteres para vendedores.",
  path: ["storeName"],
}).refine(data => {
  if (data.role === 'SELLER') {
    if (!data.whatsappNumber) return false;
    // Regex para validar formatos como: +5511999999999, 5511999999999, (11)99999-9999, 11999999999
    // A limpeza e formatação final para o padrão '55DDDXXXXXXXXX' será feita no backend
    const whatsappRegex = /^(?:\+?55)?\s?(?:\(?[1-9]{2}\)?\s?)?(?:9\d{4}|\d{4,5})-?\d{4}$/;
    return whatsappRegex.test(data.whatsappNumber);
  }
  return true;
}, {
  message: "WhatsApp inválido para vendedores. Inclua DDI e DDD (ex: +55 11 99999-9999).",
  path: ["whatsappNumber"],
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

// Schema e Tipo para o Formulário de Login
export const loginFormSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  // A validação de "senha incorreta" é feita pelo backend. Aqui só garantimos que não está vazia.
  password: z.string().min(1, { message: "A senha é obrigatória." }),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>; // Certifique-se que esta linha está presente e correta

export const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "A nova senha deve ter no mínimo 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "A confirmação da senha deve ter no mínimo 6 caracteres." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem. Tente novamente.",
  path: ["confirmPassword"], // Atribui o erro ao campo de confirmação de senha
});
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido para continuar." }),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;