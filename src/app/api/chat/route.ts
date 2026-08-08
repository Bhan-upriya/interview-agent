import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { messages, topic } = await req.json();
    const latestMessage = messages[messages.length - 1]?.content || '';

    // Prompt the model to act as a technical interviewer and return strict JSON
    const prompt = `
    You are an expert technical interviewer assessing a candidate in: ${topic}.
    The candidate just answered: "${latestMessage}"
    
    Evaluate this response objectively. Return a valid JSON object ONLY, with no markdown formatting or backticks, structured exactly like this:
    {
      "reply": "Your conversational follow-up question or critique addressing their specific answer directly.",
      "evaluation": {
        "scoreDelta": <number between -10 and 15 based on answer quality>,
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
    // Clean up any accidental markdown blocks
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('API Error:', error);
    // Fallback response if API key or model fails
    return NextResponse.json({
      reply: "That's an interesting point. Let's dig deeper into how you handle edge cases and monitoring under load.",
      evaluation: {
        scoreDelta: 5,
        accuracyScore: 65,
        conceptCovered: "System Architecture",
        feedback: "Provided a general perspective; consider incorporating specific failure mitigation strategies."
      }
    });
  }
}