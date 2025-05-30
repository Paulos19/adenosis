// src/components/auth/LoginForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { motion } from 'framer-motion'; // Import motion
import { Loader2 } from 'lucide-react'; // Para o botão de loading

import { loginFormSchema, type LoginFormValues } from '@/lib/validators/auth';
import { CustomFormInput } from '@/components/custom-form/CustomFormInput';
import { Button } from '@/components/ui/button';

// Variantes para animação do container principal do formulário
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// Variantes para animação escalonada dos itens do formulário
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Variantes para o container dos itens, para escalonar a animação dos filhos
const itemContainerVariants = {
  hidden: { opacity: 1 }, // O container em si não precisa sumir, só os filhos
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Atraso entre a animação de cada filho
      delayChildren: 0.2,  // Atraso antes de começar a animar os filhos (após o card aparecer)
    },
  },
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { control, handleSubmit, formState: { isSubmitting } } = form;

  const onSubmit = async (values: LoginFormValues) => {
    // O toast de loading será coberto pelo estado do botão
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
      } else if (result?.ok) {
        toast.success('Login realizado com sucesso!');
        router.push(callbackUrl);
        router.refresh();
      } else {
        toast.error('Ocorreu um erro desconhecido durante o login.');
      }
    } catch (error) {
      toast.error('Ocorreu um erro ao tentar fazer login. Tente novamente.');
    }
  };

  return (
    <motion.div 
      className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-white rounded-xl shadow-2xl dark:bg-gray-800/90 backdrop-blur-md overflow-hidden"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemContainerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">Login | Adenosis</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Acesse sua conta para continuar.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <motion.div variants={itemVariants}>
            <CustomFormInput<LoginFormValues>
              name="email"
              control={control}
              label="Email"
              type="email"
              placeholder="seu.email@exemplo.com"
              disabled={isSubmitting}
              autoComplete="email"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <CustomFormInput<LoginFormValues>
              name="password"
              control={control}
              label="Senha"
              type="password"
              placeholder="••••••••"
              disabled={isSubmitting}
              autoComplete="current-password"
            />
          </motion.div>
          
          <motion.div variants={itemVariants} className="text-right text-sm">
            <Link 
              href="/forgot-password" 
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline"
            >
              Esqueceu sua senha?
            </Link>
          </motion.div>
          
          <motion.div variants={itemVariants} className="!mt-8">
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600" 
              disabled={isSubmitting}
              // Efeitos de hover e tap com Framer Motion (opcional, pois o Button já tem)
              // whileHover={{ scale: 1.03 }}
              // whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Entrar'
              )}
            </Button>
          </motion.div>
        </form>

        <motion.p variants={itemVariants} className="px-8 text-center text-sm text-muted-foreground !mt-8">
          Não tem uma conta?{" "}
          <Link href="/register" className="underline underline-offset-4 hover:text-primary font-semibold text-emerald-700 dark:text-emerald-400">
            Criar conta
          </Link>
        </motion.p>
      </motion.div>
    </motion.div>
  );
}