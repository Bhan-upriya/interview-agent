import { NextResponse } from 'next/server';

// In-memory session store
const sessions = new Map<string, {
  turnCount: number;
  daysCovered: Set<number>;
  history: any[];
}>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, topic } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const currentTurn = messages.length;

    // Simulate an evaluation for the user's latest response
    const accuracyScore = Math.floor(Math.random() * 30) + 70; // Mock score between 70-100
    const scoreDelta = Math.floor(accuracyScore / 5);

    const evaluation = {
      scoreDelta,
      accuracyScore,
      conceptCovered: topic || 'System Architecture',
      feedback: `The candidate showed good understanding of ${topic || 'the core concepts'}. Consider elaborating further on failure recovery and edge-case scaling.`,
    };

    // Generate the assistant's next conversational reply
    const reply = `Thank you for your insights on turn ${currentTurn}. Building on your approach regarding ${topic}, how would you handle high-throughput concurrency or rate-limiting bottlenecks under peak load?`;

    return NextResponse.json({
      reply,
      evaluation,
      done: currentTurn >= 16 // Completes after enough turns
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}