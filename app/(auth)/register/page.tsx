// src/app/(auth)/register/page.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { registerFormSchema, type RegisterFormValues } from '@/lib/validators/auth';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link'; // Import Link

import { Button } from '@/components/ui/button';
import { CustomFormInput } from '@/components/custom-form/CustomFormInput';
import { RoleSwitcher } from '@/components/auth/RoleSwitcher';

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'USER',
      storeName: '',
      whatsappNumber: '',
    },
  });

  const { control, handleSubmit, formState: { isSubmitting, errors: formErrors }, watch, setValue, reset } = form;
  const selectedRole = watch('role');

  const handleRoleChange = (newRole: 'USER' | 'SELLER') => {
    setValue('role', newRole, { shouldValidate: true });
    if (newRole === 'USER') {
      setValue('storeName', '', { shouldValidate: false }); // Não precisa validar ao limpar
      setValue('whatsappNumber', '', { shouldValidate: false });
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    const loadingToast = toast.loading('Criando sua conta...');
    const dataToSend = { ...values };

    if (values.role === 'USER') {
      dataToSend.storeName = undefined; // Garante que não será enviado se for USER
      dataToSend.whatsappNumber = undefined;
    }

    try {
      await axios.post('/api/auth/register', dataToSend);
      toast.dismiss(loadingToast);
      toast.success('Conta criada! Verifique seu email para ativar sua conta.', { duration: 8000 });
      reset(); // Limpa o formulário
      // Opcional: redirecionar para uma página "verifique seu email"
      // router.push('/auth/check-email-notice'); 
    } catch (error) {
      toast.dismiss(loadingToast);
      const axiosError = error as AxiosError<{ error?: string; message?: string }>;
      const backendError = axiosError.response?.data?.error || axiosError.response?.data?.message || 'Algo deu errado ao criar a conta.';
      toast.error(backendError);
      console.error("Erro no submit do formulário de registro:", error);
    }
  };

  const fadeVariants = {
    hidden: { opacity: 0, height: 0, y: -10, transition: { duration: 0.3, ease: "easeInOut" } },
    visible: { opacity: 1, height: 'auto', y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, y: 10, transition: { duration: 0.2, ease: "easeInOut" } },
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-gray-800 dark:via-gray-900 dark:to-black">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-white rounded-xl shadow-2xl dark:bg-gray-800/90 backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">Adenosis | Livraria</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Crie sua conta e explore um universo de livros!
          </p>
        </div>

        <RoleSwitcher
          selectedRole={selectedRole}
          onRoleChange={handleRoleChange}
          disabled={isSubmitting}
        />
        
        {formErrors.role && (
          <p className="text-sm font-medium text-destructive text-center py-1">
            {formErrors.role.message}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          <CustomFormInput<RegisterFormValues>
            name="name"
            control={control}
            label="Nome Completo"
            placeholder="Seu nome completo"
            autoComplete="name"
          />
          <CustomFormInput<RegisterFormValues>
            name="email"
            control={control}
            label="Email"
            type="email"
            placeholder="seu.email@exemplo.com"
            autoComplete="email"
          />
          <CustomFormInput<RegisterFormValues>
            name="password"
            control={control}
            label="Senha"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
          />
          
          <AnimatePresence mode="wait">
            {selectedRole === 'SELLER' && (
              <motion.div
                key="seller-fields-custom-animated"
                variants={fadeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                // className="space-y-5" // O space-y já está no componente SellerFields ou nos CustomFormInputs
              >
                {/* Se você criou SellerFields.tsx usando CustomFormInput, use-o aqui.
                    Caso contrário, liste os CustomFormInput diretamente como abaixo: */}
                <div className="space-y-5">
                  <CustomFormInput<RegisterFormValues>
                    name="storeName"
                    control={control}
                    label="Nome da sua Livraria"
                    placeholder="Ex: Livraria Literária"
                  />
                  <CustomFormInput<RegisterFormValues>
                    name="whatsappNumber"
                    control={control}
                    label="Seu WhatsApp (com DDI + DDD)"
                    placeholder="+55 (11) 99999-9999"
                  />
                   {/* Descrição para WhatsApp, se necessário */}
                   {!formErrors.whatsappNumber && ( // Mostrar apenas se não houver erro no campo
                     <p className="text-xs text-muted-foreground px-1">
                       Usado para contato direto dos clientes. Ex: +5511987654321
                     </p>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 !mt-8" disabled={isSubmitting}>
            {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
          </Button>
        </form>
        <p className="px-8 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link 
            href="/login" 
            className="underline underline-offset-4 hover:text-primary font-semibold text-emerald-700 dark:text-emerald-400"
          >
            Fazer Login
          </Link>
        </p>
      </div>
    </div>
  );
}