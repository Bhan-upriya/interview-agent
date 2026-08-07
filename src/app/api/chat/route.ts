import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, topic } = await req.json();

    // 1. Live API Gateway via AgentRouter / OpenAI API
    if (process.env.AGENTROUTER_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.AGENTROUTER_API_KEY,
        baseURL: process.env.AGENTROUTER_BASE_URL || 'https://agentrouter.org/v1',
      });

      const systemPrompt = `
        You are an expert AI Technical Interviewer assessing a candidate for a Senior AI Engineer role on: "${topic || 'Enterprise AI Engineering'}".
        
        Guidelines:
        1. If candidate skips, gives incorrect information, or types low-effort answers (e.g. "another question please", "idk", "asdf"), penalize scoreDelta (-10 to -20) and set accuracyScore low (0 to 30).
        2. If candidate gives a strong, detailed technical answer, reward scoreDelta (+10 to +20) and accuracyScore (80 to 100).
        3. Keep your response under 3 sentences.
        4. Respond STRICTLY in valid JSON:
        {
          "reply": "Your question or response",
          "scoreDelta": -10, // negative integer for poor answers, positive for good answers
          "conceptCovered": "Concept Name",
          "feedback": "Concise feedback explaining why points were awarded or deducted",
          "accuracyScore": 20
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
        reply: parsed.reply || 'Let us explore system reliability: How do you handle fallback strategies during LLM provider outages?',
        evaluation: {
          scoreDelta: parsed.scoreDelta ?? 0,
          conceptCovered: parsed.conceptCovered || 'System Design',
          feedback: parsed.feedback || 'Response evaluated.',
          accuracyScore: parsed.accuracyScore ?? 50,
        },
      });
    }

    // 2. Local Fallback Engine with Strict Penalty Rules
    const lastUserMsg = (messages[messages.length - 1]?.content || '').trim().toLowerCase();

    let reply = '';
    let scoreDelta = 0;
    let accuracyScore = 0;
    let conceptCovered = 'General Assessment';
    let feedback = '';

    // Penalty Trigger 1: Skipping, asking for another question, or giving non-answers
    if (
      lastUserMsg.includes('another question') ||
      lastUserMsg.includes('next question') ||
      lastUserMsg.includes('skip') ||
      lastUserMsg.includes('pass') ||
      lastUserMsg.includes('dont know') ||
      lastUserMsg.includes("don't know") ||
      lastUserMsg.includes('no idea')
    ) {
      reply = "Understood. Skipping that topic. Let's pivot: Can you explain how vector similarity search works using Cosine Distance vs Dot Product?";
      scoreDelta = -10;
      accuracyScore = 15;
      conceptCovered = 'Question Skipped';
      feedback = 'Penalty (-10): Candidate declined or skipped the technical question.';
    }
    // Penalty Trigger 2: Short greetings or gibberish input (< 5 characters)
    else if (['hello', 'hi', 'hey', 'test'].includes(lastUserMsg) || lastUserMsg.length < 5) {
      reply = "Please provide a detailed technical answer. Let's restart: How do chunking strategies impact document retrieval in RAG architectures?";
      scoreDelta = -5;
      accuracyScore = 20;
      conceptCovered = 'Incomplete Answer';
      feedback = 'Penalty (-5): Insufficient content provided for technical evaluation.';
    }
    // Reward Trigger 1: Valid chunking / parsing response
    else if (lastUserMsg.includes('chunk') || lastUserMsg.includes('split') || lastUserMsg.includes('overlap')) {
      reply = "Good answer on chunking strategies. Next: How do you choose between Cosine, Dot Product, and L2 Euclidean distance for vector search?";
      scoreDelta = 15;
      accuracyScore = 88;
      conceptCovered = 'Document Chunking';
      feedback = 'Reward (+15): Accurate explanation of document splitting and overlap.';
    }
    // Reward Trigger 2: Valid vector search / index response
    else if (lastUserMsg.includes('vector') || lastUserMsg.includes('cosine') || lastUserMsg.includes('hnsw') || lastUserMsg.includes('embed')) {
      reply = "Excellent analysis of vector indexing. How do you mitigate LLM hallucinations when generating answers from retrieved context?";
      scoreDelta = 20;
      accuracyScore = 95;
      conceptCovered = 'Vector Indexing';
      feedback = 'Reward (+20): Strong technical depth on vector math and indexing.';
    }
    // Default neutral answer
    else {
      reply = "Answer noted. To test architectural depth: How do you handle rate-limiting and timeouts when integrating external AI APIs?";
      scoreDelta = 5;
      accuracyScore = 65;
      conceptCovered = 'System Architecture';
      feedback = 'Moderate (+5): Answer covers baseline concepts but lacks architectural specifics.';
    }

    return NextResponse.json({
      reply,
      evaluation: {
        scoreDelta,
        conceptCovered,
        feedback,
        accuracyScore,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      reply: 'Let us pivot to system reliability: How do you set up fallback mechanisms when primary LLM endpoints timeout?',
      evaluation: {
        scoreDelta: 0,
        conceptCovered: 'Resiliency',
        feedback: 'Evaluation fallback active.',
        accuracyScore: 50,
      },
    });
  }
}