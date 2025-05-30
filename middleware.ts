// src/middleware.ts
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  // `withAuth` eleva a tipagem de `req` para `NextRequestWithAuth`
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Se não há token e a rota não é pública, withAuth já redireciona para login.
    // Este bloco é para lógicas adicionais APÓS a autenticação básica.

    // Exemplo de proteção específica para /dashboard
    if (pathname.startsWith("/dashboard") && token?.role !== "SELLER" && token?.role !== "ADMIN") {
      // Se não for SELLER ou ADMIN, redireciona para uma página de acesso negado ou home
      // Poderíamos ter uma página /acesso-negado
      return NextResponse.redirect(new URL("/", req.url)); 
    }

    // Exemplo de proteção para /settings (qualquer usuário autenticado pode acessar)
    if (pathname.startsWith("/settings") && !token) {
      // Este caso já é coberto por withAuth, mas exemplifica
      return NextResponse.redirect(new URL("/login?callbackUrl=" + pathname, req.url));
    }
    
    // Exemplo de proteção de API para criação de livros (apenas SELLER ou ADMIN)
    if (pathname.startsWith("/api/books") && req.method === "POST") {
      if (token?.role !== "SELLER" && token?.role !== "ADMIN") {
        return new NextResponse(JSON.stringify({ error: "Acesso não autorizado" }), { status: 403, headers: { 'Content-Type': 'application/json' }});
      }
    }
    
    // Se chegou até aqui, permite a requisição
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Este callback é executado ANTES da função middleware acima.
        // Define se o usuário está "autorizado" a ponto da função middleware ser chamada.
        // Se retornar false, o usuário é redirecionado para a página de login.
        // Se retornar true, a função middleware acima é executada.

        const { pathname } = req.nextUrl;

        // Rotas que requerem apenas autenticação (qualquer role)
        const protectedUserRoutes = ["/settings", "/wishlist"];
        // Rotas que requerem role de Vendedor ou Admin
        const protectedSellerRoutes = ["/dashboard"];

        // API routes (exemplos, refine conforme sua necessidade)
        const protectedApiRoutesForSellers = ["/api/books", "/api/dashboard"]; // Simplificado, POST/PUT/DELETE seriam verificados no middleware principal ou na API

        if (protectedUserRoutes.some(route => pathname.startsWith(route))) {
          return !!token; // Precisa estar logado
        }

        if (protectedSellerRoutes.some(route => pathname.startsWith(route))) {
          return token?.role === "SELLER" || token?.role === "ADMIN"; // Precisa ser SELLER ou ADMIN
        }
        
        if (protectedApiRoutesForSellers.some(route => pathname.startsWith(route))) {
            // Para APIs, a verificação de método HTTP (POST, PUT, DELETE) é melhor feita
            // na função middleware principal ou na própria rota da API.
            // Aqui, apenas garantimos que para acessar essas rotas, o usuário deve ter uma role de vendedor/admin
            // (ou apenas estar logado, dependendo da API).
            return token?.role === "SELLER" || token?.role === "ADMIN";
        }


        // Se a rota não estiver explicitamente listada acima no matcher,
        // mas for uma rota que por padrão o withAuth protegeria (por estar no matcher),
        // permitir se o token existir.
        // Para rotas públicas não listadas no matcher, este middleware não é executado.
        return true; // Para outras rotas cobertas pelo matcher, permite se autenticado (o token já foi verificado por withAuth)
                     // Se não houver token, withAuth já redireciona.
      },
    },
  }
);

// Configuração do Matcher: define quais rotas serão processadas por este middleware.
export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas exceto aquelas que começam com:
     * - api/auth (rotas de autenticação do NextAuth)
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícone de favoritos)
     * - / (página inicial, se você quiser que seja pública)
     * - /login (página de login)
     * - /register (página de registro)
     * Adicione aqui outras rotas públicas.
     */
    // "/((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)", // Regex mais complexo
    
    // Abordagem mais simples e explícita:
    "/dashboard/:path*",
    "/settings/:path*",
    "/wishlist/:path*",
    // "/admin/:path*", // Se você tiver uma área de admin

    // API Routes que você quer proteger com base em role/auth
    "/api/books/:path*", // Para POST, PUT, DELETE em /api/books e /api/books/[id]
    "/api/dashboard/:path*",
    // Outras rotas de API como /api/wishlist se necessário
  ],
};