// src/app/api/ai/suggest-categories/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Ajuste o caminho

// CORREÇÃO: Alterado o nome do modelo para um compatível
const MODEL_NAME = "gemini-2.0-flash";
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Chave da API Gemini não configurada no backend para sugestão de categorias.");
}

export async function POST(req: Request) {
  if (!API_KEY) {
    return new NextResponse(JSON.stringify({ error: "Serviço de IA não configurado." }), { status: 500 });
  }

  try {
    const session = await getServerSession(authOptions);
    // Verificação de permissão corrigida para checar ADMIN_EMAIL
    if (!session || !session.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 403 });
    }

    const body = await req.json();
    const { baseCategoryName, existingCategories } = body;

    if (!baseCategoryName || typeof baseCategoryName !== 'string' || baseCategoryName.trim().length < 2) {
      return new NextResponse(JSON.stringify({ error: "Nome da categoria base é obrigatório e deve ter pelo menos 2 caracteres." }), { status: 400 });
    }
    if (existingCategories && !Array.isArray(existingCategories)) {
        return new NextResponse(JSON.stringify({ error: "Categorias existentes devem ser um array." }), { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.7,
      topK: 1,
      topP: 0.95,
      maxOutputTokens: 200,
    };
    
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const existingCategoriesString = existingCategories && existingCategories.length > 0 
        ? `Evite sugerir as seguintes categorias que já existem: ${existingCategories.join(', ')}.` 
        : "Não há restrições de categorias existentes no momento.";

    const promptParts = [
      "Você é um assistente bibliotecário especialista em categorização de livros.",
      `Com base na categoria de livro fornecida pelo usuário: "${baseCategoryName}", sugira 5 categorias de livros relacionadas, mais específicas ou alternativas.`,
      "As sugestões devem ser concisas (1 a 3 palavras cada).",
      existingCategoriesString,
      "Retorne as sugestões como um array JSON de strings. Por exemplo, se a base for 'Aventura', retorne algo como: [\"Exploração\", \"Sobrevivência\", \"Caça ao Tesouro\", \"Viagem no Tempo\", \"Aventura Juvenil\"].",
      "Se a categoria base for muito específica, sugira categorias mais amplas ou sinônimos.",
      "Gere apenas o array JSON como resposta.",
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
            return new NextResponse(JSON.stringify({ error: "Sugestões bloqueadas por filtros de segurança." }), { status: 400 });
        }
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const rawText = candidate.content.parts.map(part => part.text).join("").trim();
            try {
                const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```|(\[[\s\S]*?\])/);
                if (jsonMatch) {
                    const jsonString = jsonMatch[1] || jsonMatch[2];
                    if (jsonString) {
                        const suggestions = JSON.parse(jsonString);
                        if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
                            return NextResponse.json({ suggestions });
                        }
                    }
                }
                console.warn("Resposta do Gemini para categorias não foi um JSON array válido:", rawText);
                const fallbackSuggestions = rawText.split(/,|\n/).map(s => s.trim()).filter(Boolean).slice(0,5);
                if(fallbackSuggestions.length > 0) return NextResponse.json({ suggestions: fallbackSuggestions });
                throw new Error("Formato de sugestões inválido da IA.");
            } catch (parseError) {
                console.error("Erro ao parsear sugestões do Gemini:", parseError, "Raw text:", rawText);
                return new NextResponse(JSON.stringify({ error: "Erro ao processar sugestões da IA." }), { status: 500 });
            }
        }
    }
    
    console.error("Resposta da API Gemini não continha sugestões válidas para:", baseCategoryName);
    return new NextResponse(JSON.stringify({ error: "Não foi possível gerar sugestões de categoria." }), { status: 500 });

  } catch (error) {
    console.error("[ADMIN_SUGGEST_CATEGORIES_API_ERROR]", error);
    return new NextResponse(JSON.stringify({ error: "Erro ao conectar com o serviço de IA." }), { status: 500 });
  }
}
