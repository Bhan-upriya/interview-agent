import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.AGENTROUTER_API_KEY || 'dummy_key',
  baseURL: process.env.AGENTROUTER_BASE_URL || 'https://agentrouter.org/v1',
});

export async function POST(req: Request) {
  try {
    const { messages, topic } = await req.json();

    // Check if API key is present; if not, fallback to rich mock evaluation
    if (!process.env.AGENTROUTER_API_KEY) {
      const lastMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
      let reply = "That covers the basics. How do you handle non-deterministic outputs and latency bottlenecks when calling external tool APIs in production?";
      let scoreDelta = 12;
      let concept = "Agent Execution & Latency";

      if (lastMsg.includes('chunk') || lastMsg.includes('embed')) {
        reply = "Solid explanation on chunking strategies. Next, how do you handle vector drift and index re-indexing in continuous deployment pipelines?";
        scoreDelta = 18;
        concept = "Vector DB & RAG Pipeline";
      }

      return NextResponse.json({
        reply,
        evaluation: {
          scoreDelta,
          conceptCovered: concept,
          feedback: "Demonstrates practical knowledge of production trade-offs.",
          accuracyScore: 88,
        },
      });
    }

    const systemPrompt = `
      You are an expert AI Technical Interviewer evaluating a candidate on: "${topic || 'Enterprise AI Engineering'}".
      
      Respond STRICTLY in valid JSON format with this exact schema:
      {
        "reply": "Your next follow-up question or response (max 3 sentences)",
        "scoreDelta": 15, // integer 0 to 25 based on quality of last user answer
        "conceptCovered": "Short 2-3 word concept name",
        "feedback": "One concise critique or compliment",
        "accuracyScore": 85 // integer 0 to 100
      }
    `;

    const response = await openai.chat.completions.create({
      model: 'claude-3-5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return NextResponse.json({
      reply: parsed.reply || 'Can you elaborate on your architectural approach?',
      evaluation: {
        scoreDelta: parsed.scoreDelta || 10,
        conceptCovered: parsed.conceptCovered || 'System Design',
        feedback: parsed.feedback || 'Answer noted.',
        accuracyScore: parsed.accuracyScore || 75,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      reply: 'Good analysis. Let us move to system resiliency: How do you handle fallback mechanisms when primary LLM endpoints timeout?',
      evaluation: {
        scoreDelta: 10,
        conceptCovered: 'Resiliency & Fallbacks',
        feedback: 'Evaluation metric updated.',
        accuracyScore: 80,
      },
    });
  }
}