// src/components/providers/NextAuthProvider.tsx
'use client'; // Marca este componente como um Client Component

import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface NextAuthProviderProps {
  children: React.ReactNode;
  // session?: any; // Opcional: você pode passar a sessão inicial se a buscar no RootLayout (Server Component)
}

export default function NextAuthProvider({ children }: NextAuthProviderProps) {
  // O SessionProvider agora está dentro de um Client Component
  return <SessionProvider>{children}</SessionProvider>;
}