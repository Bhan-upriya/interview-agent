import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    let reply = "";
    if (lastUserMessage.toLowerCase().includes("chunk")) {
      reply = "Good point on chunk size. However, how do you prevent context fragmentation across chunk boundaries when querying complex structural relationships? Do you use parent-child document retrievers or overlap strategies?";
    } else if (lastUserMessage.toLowerCase().includes("vector") || lastUserMessage.toLowerCase().includes("embed")) {
      reply = "Understood. When scaling to tens of millions of vectors in production, how do you evaluate HNSW vs. IVF indexing tradeoffs regarding memory footprint and recall rate?";
    } else {
      reply = "That covers the surface level. Let's dig into failure modes: How does your agent setup handle tool invocation failures or non-deterministic outputs when interacting with external MCP APIs?";
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { reply: "An error occurred while evaluating your response." },
      { status: 500 }
    );
  }
}