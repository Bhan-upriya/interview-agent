import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, topic } = await req.json();

    // 1. If AGENTROUTER_API_KEY is provided in .env.local, use the live API gateway
    if (process.env.AGENTROUTER_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.AGENTROUTER_API_KEY,
        baseURL: process.env.AGENTROUTER_BASE_URL || 'https://agentrouter.org/v1',
      });

      const systemPrompt = `
        You are an expert AI Technical Interviewer assessing a candidate for a Senior AI Engineer role.
        The current domain is: "${topic || 'Enterprise AI Engineering'}".
        
        Guidelines:
        1. If the user says hello, asks a greeting, or gives a brief non-answer (e.g. "i dont know"), respond politely, acknowledge their response, and ask a simplified or foundational question to keep the assessment going.
        2. Evaluate technical depth, trade-offs, and accuracy.
        3. Keep your response under 3 sentences.
        4. Respond STRICTLY in valid JSON with this schema:
        {
          "reply": "Your question or response",
          "scoreDelta": 10,
          "conceptCovered": "Concept Name",
          "feedback": "One sentence feedback on candidate performance",
          "accuracyScore": 75
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
          scoreDelta: parsed.scoreDelta ?? 5,
          conceptCovered: parsed.conceptCovered || 'System Design',
          feedback: parsed.feedback || 'Response evaluated.',
          accuracyScore: parsed.accuracyScore ?? 70,
        },
      });
    }

    // 2. Dynamic multi-turn state engine when running locally without an active API key
    const userTurnCount = messages.filter((m: any) => m.role === 'user').length;
    const lastUserMsg = (messages[messages.length - 1]?.content || '').trim().toLowerCase();

    let reply = '';
    let scoreDelta = 0;
    let accuracyScore = 50;
    let conceptCovered = 'General Assessment';
    let feedback = '';

    // Greetings or off-topic input
    if (['hello', 'hi', 'hey', 'greetings', 'test'].includes(lastUserMsg)) {
      reply = "Hello! Welcome to the technical assessment. Let's start with Retrieval-Augmented Generation (RAG): What chunking strategy do you prefer for structured PDF documents, and why?";
      scoreDelta = 0;
      accuracyScore = 60;
      conceptCovered = 'Interview Readiness';
      feedback = 'Greeting acknowledged. Setting initial technical scenario.';
    } 
    // "I don't know" or uncertain responses
    else if (lastUserMsg.includes('don\'t know') || lastUserMsg.includes('dont know') || lastUserMsg.includes('no idea') || lastUserMsg.length < 4) {
      reply = "No problem at all! Let's break it down to basics: Can you describe the primary difference between standard keyword search (BM25) and semantic vector search?";
      scoreDelta = 2;
      accuracyScore = 40;
      conceptCovered = 'Search & Retrieval Basics';
      feedback = 'Candidate passed on complex topic. Pivot to core foundational concepts.';
    } 
    // Domain-specific keyword branching for progressive turns
    else if (lastUserMsg.includes('chunk') || lastUserMsg.includes('split') || lastUserMsg.includes('overlap')) {
      reply = "Great points on chunking boundaries. Moving deeper into retrieval: How do you choose between cosine similarity, dot product, and Euclidean distance for high-dimensional vector space embeddings?";
      scoreDelta = 18;
      accuracyScore = 90;
      conceptCovered = 'Embedding & Vector Metrics';
      feedback = 'Demonstrated clear understanding of document parsing & chunking trade-offs.';
    } 
    else if (lastUserMsg.includes('vector') || lastUserMsg.includes('embed') || lastUserMsg.includes('cosine') || lastUserMsg.includes('distance')) {
      reply = "Excellent analysis of vector distance metrics. Next, in large-scale production deployments with tens of millions of vectors, how do you manage memory limits—such as using HNSW indexes vs. quantization techniques like PQ?";
      scoreDelta = 20;
      accuracyScore = 92;
      conceptCovered = 'Vector DB Indexing & Scaling';
      feedback = 'Strong grasp of vector space math and indexing mechanics.';
    } 
    else if (lastUserMsg.includes('hnsw') || lastUserMsg.includes('index') || lastUserMsg.includes('quantization') || lastUserMsg.includes('memory')) {
      reply = "Solid technical depth on database scaling. Let us switch to Agent orchestration: How do you implement robust error recovery when an AI Agent calls an external tool API and receives a 500 server error or invalid JSON response?";
      scoreDelta = 22;
      accuracyScore = 95;
      conceptCovered = 'Agent Fault Tolerance';
      feedback = 'Expert knowledge in vector index optimization and production constraints.';
    } 
    // Fallback based on turn sequence
    else {
      if (userTurnCount <= 2) {
        reply = "Thank you for sharing that perspective. To drill down into system architecture: How do you address hallucination risks when grounding LLM responses with retrieved enterprise data?";
        scoreDelta = 12;
        accuracyScore = 78;
        conceptCovered = 'RAG Grounding & Hallucinations';
        feedback = 'General technical answer provided. Prompting for deeper grounding techniques.';
      } else {
        reply = "Understood. Considering model evaluation in production: How do you measure retrieval quality using metrics like Mean Reciprocal Rank (MRR) or Normalized Discounted Cumulative Gain (NDCG)?";
        scoreDelta = 15;
        accuracyScore = 84;
        conceptCovered = 'RAG Evaluation Metrics';
        feedback = 'Sufficient response provided. Advancing to quantitative evaluation methods.';
      }
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
        scoreDelta: 5,
        conceptCovered: 'Resiliency & Fallbacks',
        feedback: 'System issue handled gracefully.',
        accuracyScore: 70,
      },
    });
  }
}