import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.AGENTROUTER_API_KEY,
  baseURL: process.env.AGENTROUTER_BASE_URL || 'https://agentrouter.org/v1',
});

export async function POST(req: Request) {
  try {
    const { messages, topic } = await req.json();

    const systemPrompt = `
      You are an expert AI Technical Interviewer conducting an interview on the topic: "${topic || 'Enterprise AI Engineering'}".
      Your goals:
      1. Assess technical accuracy, depth, and edge-case handling.
      2. Keep responses focused (2-4 sentences max).
      3. If the candidate gives a shallow answer, ask a targeted follow-up or trade-off question.
      4. If the candidate answers thoroughly, pivot smoothly to the next architectural concept.
      5. Maintain a professional, supportive, yet rigorous technical tone.
    `;

    const formattedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      })),
    ];

    const response = await openai.chat.completions.create({
      model: 'claude-3-5-sonnet', // You can change this to 'gpt-4o' or any model supported by your router
      messages: formattedMessages,
      max_tokens: 400,
    });

    const replyText = response.choices[0]?.message?.content || 'No response generated.';

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error('AgentRouter API Error:', error);
    return NextResponse.json(
      { reply: 'An error occurred while communicating with the AI interviewer via AgentRouter.' },
      { status: 500 }
    );
  }
}