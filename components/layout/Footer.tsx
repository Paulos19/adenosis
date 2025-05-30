// src/components/layout/Footer.tsx
import Link from 'next/link';
import Image from 'next/image'; // Importe o componente Image
import { Facebook, Instagram, Twitter, Linkedin, Heart } from 'lucide-react'; // Ícones sociais mantidos

const footerNavs = [
  { href: '/about', name: 'Sobre Nós' },
  { href: '/contact', name: 'Contato' },
  { href: '/terms', name: 'Termos de Serviço' },
  { href: '/privacy', name: 'Política de Privacidade' },
];

const socialLinks = [
  { href: '#', icon: Facebook, name: 'Facebook' },
  { href: '#', icon: Instagram, name: 'Instagram' },
  { href: '#', icon: Twitter, name: 'Twitter' },
  { href: '#', icon: Linkedin, name: 'LinkedIn' },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-gray-400 border-t border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8"> {/* Aumentado gap para melhor espaçamento */}
          {/* Seção Logo e Descrição */}
          <div className="space-y-4 md:col-span-1"> {/* Garante que esta coluna não seja muito larga */}
            <Link href="/" className="inline-block"> {/* Tornar o Link inline-block para o tamanho da imagem */}
              {/* Substituído Palette e o span de texto pela Imagem da logo */}
              <Image
                src="/logo.png" // Caminho para sua logo na pasta public
                alt="Adenosis Livraria Logo"
                width={180} // Defina a largura desejada para sua logo no footer
                height={50} // Defina a altura correspondente para manter a proporção
                className="h-auto" // Permite que a altura seja automática baseada na largura e proporção da imagem
              />
            </Link>
            <p className="text-sm leading-relaxed">
              Seu marketplace de livros onde histórias encontram novos leitores. Conectando apaixonados por leitura.
            </p>
          </div>

          {/* Seção Links Rápidos */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Links Úteis</h3>
            <ul className="space-y-3"> {/* Aumentado space-y */}
              {footerNavs.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="hover:text-emerald-400 transition-colors duration-200 text-sm">
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/faq" className="hover:text-emerald-400 transition-colors duration-200 text-sm">
                    FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Seção Contato e Social */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Siga-nos</h3>
            <div className="flex space-x-4 mb-6"> {/* Aumentado mb */}
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200"
                >
                  <social.icon className="h-6 w-6" />
                </a>
              ))}
            </div>
            <p className="text-sm">
              <span className="block mb-1">Entre em contato:</span>
              <a href="mailto:contato@adenosis.com" className="hover:text-emerald-400 underline break-all">
                contato@adenosis.com
              </a>
            </p>
          </div>
        </div>

        <div className="mt-12 md:mt-16 pt-8 border-t border-slate-800 text-center text-sm">
          <p>© {new Date().getFullYear()} Adenosis Livraria. Todos os direitos reservados.</p>
          <p className="mt-1">
            Feito com <Heart className="inline h-4 w-4 text-red-500 mx-0.5" /> pela comunidade para a comunidade.
          </p>
        </div>
      </div>
    </footer>
  );
}