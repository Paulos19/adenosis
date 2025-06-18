// src/middleware.ts
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Proteção específica para /admin/dashboard (CORRIGIDO)
    if (pathname.startsWith("/admin/dashboard")) {
      if (!token || token.email !== process.env.ADMIN_EMAIL) {
        console.warn(`[Middleware] Tentativa de acesso não autorizado a /admin/dashboard por: ${token?.email || 'usuário não logado'}`);
        return NextResponse.redirect(new URL("/login?error=UnauthorizedAdmin", req.url)); 
      }
    }

    // Proteção para /dashboard (vendedor)
    if (pathname.startsWith("/dashboard")) {
      // Admin também pode ter acesso ao dashboard do vendedor
      if (!token || (token.role !== "SELLER" && token.email !== process.env.ADMIN_EMAIL)) {
        return NextResponse.redirect(new URL("/login?error=UnauthorizedSeller", req.url));
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;

        if (!process.env.ADMIN_EMAIL) {
          console.error("[Middleware] ADMIN_EMAIL não está configurado no .env. Ninguém terá acesso de admin supremo.");
          if (pathname.startsWith("/admin/dashboard")) return false; // Bloqueia rotas /admin/dashboard
        }

        // Admin routes: checa se o email do token corresponde ao ADMIN_EMAIL (CORRIGIDO)
        if (pathname.startsWith("/admin/dashboard")) {
          return !!token && token.email === process.env.ADMIN_EMAIL;
        }

        // Seller dashboard routes: permite SELLER ou o ADMIN_EMAIL
        if (pathname.startsWith("/dashboard")) {
          return !!token && (token.role === "SELLER" || token.email === process.env.ADMIN_EMAIL);
        }

        // Rotas que requerem apenas autenticação (qualquer role logado)
        const protectedUserRoutes = ["/settings", "/wishlist"];
        if (protectedUserRoutes.some(route => pathname.startsWith(route))) {
          return !!token; 
        }
        
        // API routes
        if (pathname.startsWith("/api/books") && (req.method === "POST" || req.method === "PUT" || req.method === "DELETE")) {
            return !!token && (token.role === "SELLER" || token.email === process.env.ADMIN_EMAIL);
        }
        if (pathname.startsWith("/api/seller/profile") && req.method === "PUT") {
            return !!token && (token.role === "SELLER" || token.email === process.env.ADMIN_EMAIL);
        }
        if (pathname === "/api/categories" && req.method === "POST") {
            return !!token && token.email === process.env.ADMIN_EMAIL;
        }
        
        // Proteger todas as APIs /api/admin
        if (pathname.startsWith("/api/admin")) { 
            return !!token && token.email === process.env.ADMIN_EMAIL;
        }

        // Protege rotas de reserva para usuários logados, a API refina a lógica
        if (pathname.startsWith("/api/reservations") || pathname.startsWith("/api/dashboard/reservations")) {
            return !!token; 
        }
        if (pathname.startsWith("/api/ai")) { // Exemplo: proteger rotas de IA para usuários logados
            return !!token; 
        }

        return true; 
      },
    },
    pages: {
        signIn: '/login',
        error: '/login', 
    }
  }
);

export const config = {
  matcher: [
    "/admin/dashboard/:path*", // ATUALIZADO para o novo caminho do admin
    "/dashboard/:path*",
    "/settings/:path*",
    "/wishlist/:path*",
    // API Routes
    "/api/admin/:path*", // ATUALIZADO - Protege as APIs de admin
    "/api/books/:path*",
    "/api/seller/profile",
    "/api/reservations/:path*",
    "/api/dashboard/reservations/:path*",
    "/api/categories", 
    "/api/ai/:path*", 
  ],
};