// src/app/api/ai/generate-store-description/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const MODEL_NAME = "gemini-1.5-flash"; // Ou "gemini-1.5-flash"
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Chave da API Gemini não configurada no backend.");
}

export async function POST(req: Request) {
  if (!API_KEY) {
    return new NextResponse(JSON.stringify({ error: "Serviço de IA não configurado." }), { status: 500 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
    }

    const body = await req.json();
    const { briefDescription, storeName } = body; // Adicionado storeName para contexto

    if (!briefDescription) {
      return new NextResponse(JSON.stringify({ error: "A descrição breve é obrigatória." }), { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      maxOutputTokens: 400, // Ajuste conforme necessário para uma descrição de loja
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const promptParts = [
        "Você é um especialista em marketing e copywriting para pequenos negócios, especificamente para livrarias e sebos independentes.",
        `A loja se chama "${storeName || 'esta livraria'}".`,
        `Baseado na seguinte descrição breve fornecida pelo proprietário: "${briefDescription}", crie uma descrição mais completa, calorosa e convidativa para a seção "Sobre Nós" da loja online.`,
        "A descrição deve:",
        "  - Ser escrita em português brasileiro, em um tom amigável e acessível.",
        "  - Ter entre 100 e 250 palavras.",
        "  - Destacar o que torna a loja especial (com base na descrição breve, inferindo seus pontos fortes, como tipo de acervo, atendimento, paixão por livros, etc.).",
        "  - Incentivar os clientes a explorar o acervo da loja.",
        "  - Ser autêntica e refletir o espírito de uma livraria/sebo local.",
        "  - Não use clichês excessivos. Seja criativo e original.",
        "Por favor, gere a descrição:",
    ];

    const result = await model.generateContent({
        contents: [{ role: "user", parts: promptParts.map(text => ({text})) }],
        generationConfig,
        safetySettings,
    });
    
    const response = result.response;
    if (response && response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
         if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
            console.warn("Descrição da loja bloqueada por segurança/recitação:", briefDescription);
            return new NextResponse(JSON.stringify({ error: "A sugestão foi bloqueada por filtros. Tente uma descrição breve diferente." }),{ status: 400 });
        }
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const generatedText = candidate.content.parts.map(part => part.text).join("");
            return NextResponse.json({ description: generatedText.trim() });
        }
    }
    
    console.error("Resposta da API Gemini não continha texto gerado para a descrição da loja:", briefDescription, JSON.stringify(response, null, 2));
    return new NextResponse(JSON.stringify({ error: "Não foi possível gerar a descrição no momento." }), { status: 500 });

  } catch (error) {
    console.error("Erro na API /ai/generate-store-description:", error);
    // ... (tratamento de erro como na API de descrição de livro) ...
    return new NextResponse(JSON.stringify({ error: "Erro ao gerar descrição com IA." }), { status: 500 });
  }
}