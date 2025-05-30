// Em: src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

// Importamos nosso Enum Role do schema do Prisma para manter a consistência
import { Role } from "@prisma/client";

/**
 * Aumenta o tipo do token JWT para incluir 'id' e 'role'.
 * Esses dados são adicionados no callback 'jwt' em route.ts.
 */
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role; // Usando o Enum Role importado do Prisma
  }
}

/**
 * Aumenta o tipo da Sessão para que 'session.user' também inclua 'id' e 'role'.
 * Esses dados são transferidos do token para a sessão no callback 'session' em route.ts.
 */
declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role: Role; // Usando o Enum Role importado do Prisma
  }

  interface Session extends DefaultSession {
    user: User; // Sobrescreve o tipo 'user' padrão para usar nosso 'User' aumentado
  }
}