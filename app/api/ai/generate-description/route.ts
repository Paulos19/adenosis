// src/app/api/ai/generate-description/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Ajuste o caminho se necessário

const MODEL_NAME = "gemini-2.0-flash"; // Ou outro modelo como "gemini-1.5-flash" para mais velocidade/custo
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Chave da API Gemini não configurada.");
  // Não lance erro aqui para não quebrar o build, mas a API não funcionará.
  // A verificação será feita na função POST.
}

export async function POST(req: Request) {
  if (!API_KEY) {
    return new NextResponse(
      JSON.stringify({ error: "Serviço de IA não configurado corretamente pelo administrador." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "SELLER" && session.user.role !== "ADMIN")) {
      return new NextResponse(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
    }

    const body = await req.json();
    const { title, author } = body;

    if (!title) {
      return new NextResponse(
        JSON.stringify({ error: "O título do livro é obrigatório para gerar a descrição." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.8, // Aumenta a criatividade, mas pode ser menos factual. Ajuste conforme necessário.
      topK: 1,
      topP: 0.95,
      maxOutputTokens: 300, // Limita o tamanho da descrição
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
    
    // Prompt mais elaborado para guiar a IA
    const promptParts = [
        "Você é um assistente especializado em criar descrições de livros para um marketplace online chamado 'Adenosis | Livraria'.",
        "Sua tarefa é gerar uma descrição de venda concisa, atraente e otimizada para SEO (se possível, usando palavras-chave relevantes naturalmente) para o seguinte livro:",
        `- Título: "${title}"`,
        author ? `- Autor(es): "${author}"` : "- Autor(es): (Não especificado)",
        "A descrição deve:",
        "  - Ser escrita em português brasileiro.",
        "  - Ter entre 50 e 150 palavras.",
        "  - Destacar os pontos chave ou o tema principal do livro de forma a despertar o interesse de potenciais compradores.",
        "  - Manter um tom amigável e convidativo, mas profissional.",
        "  - Não inclua hashtags ou frases como 'Compre agora!'. Apenas a descrição do livro.",
        "  - Se o autor for conhecido, você pode mencioná-lo brevemente no contexto da obra.",
        "Por favor, gere a descrição:",
    ];


    const result = await model.generateContent({
        contents: [{ role: "user", parts: promptParts.map(text => ({text})) }],
        generationConfig,
        safetySettings,
    });

    if (result.response && result.response.candidates && result.response.candidates.length > 0) {
        const candidate = result.response.candidates[0];
        // Verifica se o conteúdo foi bloqueado
        if (candidate.finishReason === "SAFETY") {
            console.warn("Conteúdo bloqueado por razões de segurança para o título:", title);
            return new NextResponse(
                JSON.stringify({ error: "A sugestão de descrição foi bloqueada por filtros de segurança. Tente ajustar o título ou autor." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const generatedText = candidate.content.parts.map(part => part.text).join("");
            return NextResponse.json({ description: generatedText.trim() });
        }
    }
    
    // Se não houver candidatos ou partes válidas
    console.error("Resposta da API Gemini não continha texto gerado para o título:", title, JSON.stringify(result.response, null, 2));
    return new NextResponse(
        JSON.stringify({ error: "Não foi possível gerar a descrição no momento. Tente novamente." }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Erro na API /ai/generate-description:", error);
    let message = "Erro ao gerar descrição com IA.";
    if (error instanceof Error) {
        message = error.message.includes("API key not valid") ? "Chave da API Gemini inválida ou não configurada." : message;
    }
    return new NextResponse(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}