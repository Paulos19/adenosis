// src/components/home/FAQSection.tsx
import { ChevronDown } from 'lucide-react'; // Usaremos ChevronDown para o ícone do <details>

const faqItemsData = [
  {
    question: "Como funciona a Adenosis Livraria?",
    answer: "A Adenosis é um marketplace local que conecta vendedores de livros (novos e usados) com compradores da sua região. As negociações e entregas são combinadas diretamente entre as partes."
  },
  {
    question: "Como posso vender meus livros?",
    answer: "É simples! Crie uma conta de vendedor, cadastre seus livros com detalhes e fotos, e aguarde o contato dos interessados. Você combina o pagamento e a entrega diretamente com o comprador."
  },
  {
    question: "É seguro comprar e vender aqui?",
    answer: "Nós facilitamos a conexão, mas recomendamos que compradores e vendedores tomem as precauções comuns em transações locais: encontrar em locais públicos, verificar o produto, etc."
  },
  {
    question: "Quais são as taxas para vender?",
    answer: "Atualmente, a Adenosis Livraria não cobra taxas para listar ou vender seus livros. Aproveite!"
  }
];

export function FAQSection() {
  return (
    <section className="container mx-auto py-12 md:py-20 px-4">
      <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-10 md:mb-12">
        Perguntas Frequentes (FAQ)
      </h2>
      <div className="max-w-3xl mx-auto space-y-4">
        {faqItemsData.map((item, index) => (
          <details 
            key={index} 
            className="p-4 bg-white dark:bg-gray-700/50 rounded-lg shadow-sm group border border-gray-200 dark:border-gray-600"
          >
            <summary className="flex justify-between items-center font-semibold cursor-pointer list-none text-gray-700 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              <span>{item.question}</span>
              <ChevronDown className="h-5 w-5 transform transition-transform duration-200 group-open:rotate-180 text-gray-500 dark:text-gray-400" />
            </summary>
            <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}