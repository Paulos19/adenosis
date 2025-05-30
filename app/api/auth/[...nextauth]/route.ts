// Em: src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter"; // ✅ Linha Correta
import { db } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "seuemail@exemplo.com" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Dados de login inválidos.");
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          throw new Error("Usuário não encontrado ou não cadastrado com senha.");
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordCorrect) {
          throw new Error("Senha incorreta.");
        }
        
        // Retornamos o usuário sem a senha
        // A tipagem do authorize requer que o objeto tenha um 'id' como string
        // Nosso schema já garante isso
        return user;
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "SELLER" | "ADMIN";
      }
      return session;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt", // Obrigatório para usar os callbacks de JWT
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login', // Futuramente, criaremos a página em /app/login/page.tsx
    // error: '/auth/error', // Página para exibir erros (ex: falha no login)
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };