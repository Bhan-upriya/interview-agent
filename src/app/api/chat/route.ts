import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { domain, action, messages } = await req.json();

    if (action === 'start') {
      // Return initial domain-specific question
      let question = `Welcome to your AI technical assessment on ${domain}. Let's start with a core concept: What are the primary architectural challenges or design patterns when building robust systems for ${domain}?`;
      
      if (domain === 'Agent Orchestration') {
        question = "Welcome to your AI Technical Assessment! We will focus on: Agent Orchestration. Let's start with Retrieval-Augmented Generation: How do you choose the right chunking strategy and embedding model for structured technical documents?";
      } else if (domain === 'Vector Search') {
        question = "Welcome to your AI Technical Assessment on Vector Search. How do you choose between Cosine similarity, Dot Product, and L2 Euclidean distance when scaling vector indices for high-dimensional technical embeddings?";
      }

      return NextResponse.json({ question });
    }

    // Handle subsequent conversational turns
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    // Simple dynamic response simulation (or plug in your OpenAI/Gemini SDK call here)
    const reply = `That is a solid perspective on ${domain}. Building on your point regarding "${lastUserMessage.slice(0, 30)}...", how would you handle edge cases, latency constraints, or failure modes in production?`;

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}