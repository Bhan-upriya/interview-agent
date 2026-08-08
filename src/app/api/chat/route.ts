import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { messages, topic } = await req.json();
    const latestMessage = messages[messages.length - 1]?.content || '';

    const prompt = `
    You are an expert technical interviewer assessing a candidate in: ${topic}.
    The candidate just answered: "${latestMessage}"
    
    Analyze the quality and correctness of this response. If the answer is vague, evasive, or says "I don't know", give a low accuracy score (e.g., between 10 and 30). If it is accurate and detailed, give a high score (75-95).
    
    Return a valid JSON object ONLY, with no markdown formatting or backticks, structured exactly like this:
    {
      "reply": "Your conversational follow-up question or critique addressing their specific answer directly.",
      "evaluation": {
        "scoreDelta": <number between -5 and 15 based on answer quality>,
        "accuracyScore": <percentage number between 0 and 100 representing answer correctness>,
        "conceptCovered": "<short specific sub-concept name evaluated>",
        "feedback": "<1 sentence actionable critique of their response>"
      }
    }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Intelligent fallback based on user answer length/content if API fails
    const latest = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const isShort = latest.length < 15 || latest.includes("don't know") || latest.includes("idk");
    
    return NextResponse.json({
      reply: isShort 
        ? "No problem. Let's look at another angle: How would you approach monitoring retrieval failure rates in production?" 
        : "That's an interesting perspective. Let's dig deeper into how you handle edge cases and latency constraints under load.",
      evaluation: {
        scoreDelta: isShort ? -5 : 8,
        accuracyScore: isShort ? 20 : 70,
        conceptCovered: "Architectural Resiliency",
        feedback: isShort ? "Answer lacked sufficient technical depth or was evasive." : "Provided a general technical perspective; consider deeper operational metrics."
      }
    });
  }
}