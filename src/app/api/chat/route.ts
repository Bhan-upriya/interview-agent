import { NextResponse } from "next/server";
import type { Domain, ChatRequestBody, ChatResponseBody, EvaluationResult } from "@/types/interview";

// Expanded pre-defined banks of professional questions for each domain (10 questions each)
const QUESTION_BANKS: Record<Domain, string[]> = {
  "Frontend Development": [
    "What happens in the browser between typing a URL and seeing the page render?",
    "How does React's reconciliation algorithm (Fiber) work under the hood?",
    "Can you explain how you would optimize a web application suffering from layout thrashing and slow Core Web Vitals?",
    "What are the trade-offs between Server-Side Rendering (SSR), Client-Side Rendering (CSR), and Incremental Static Regeneration (ISR)?",
    "How do you manage complex global state in a large-scale frontend application without running into performance bottlenecks?",
    "Can you explain how CSS Grid and Flexbox differ in layout calculation, and when you should choose one over the other?",
    "How do service workers work, and how would you implement an offline-first progressive web app (PWA)?",
    "What security vulnerabilities (like XSS or CSRF) affect modern Single Page Applications, and how do you prevent them?",
    "How do you approach writing automated end-to-end (E2E) tests for complex user workflows using tools like Playwright or Cypress?",
    "Explain event bubbling, capturing, and delegation in the DOM. Why is delegation useful for performance?"
  ],
  "Backend Development": [
    "How would you design a scalable REST API for a high-traffic to-do list application?",
    "Can you explain how database indexing works (e.g., B-Trees) and when you should avoid adding an index?",
    "How do you handle database migrations safely in a zero-downtime production environment?",
    "What is the difference between optimistic and pessimistic locking, and when would you use each?",
    "How do you handle performance bottlenecks or debugging in high-load microservices architectures?",
    "What are the core differences between SQL and NoSQL databases, and how do you choose the right data store for a project?",
    "How do JWT (JSON Web Tokens) work, and what are the security trade-offs of storing them in LocalStorage versus HttpOnly cookies?",
    "Explain how database connection pooling works and why it is critical for preventing server crashes under load.",
    "How would you implement rate limiting and request throttling on a public-facing API gateway?",
    "What is event-driven architecture, and what are the trade-offs of using message brokers like RabbitMQ versus Kafka?"
  ],
  "Data Structures & Algorithms": [
    "What is the difference between a stack and a queue, and what are their underlying memory implications?",
    "How would you find the shortest path in a weighted graph with non-negative edge weights? Explain the time complexity.",
    "Can you explain how hash maps handle collisions internally (e.g., chaining vs open addressing) and how worst-case time complexity is managed?",
    "What is dynamic programming, and how do you decide whether to use a top-down memoization or bottom-up tabulation approach?",
    "How would you detect a cycle in a directed graph efficiently using DFS or Kahn's algorithm?",
    "Explain the time and space complexity differences between QuickSort, MergeSort, and HeapSort.",
    "How does a balanced Binary Search Tree (like an AVL tree or Red-Black tree) maintain logarithmic search time during insertions and deletions?",
    "Can you explain the Sliding Window pattern and give an example of when you would use it to optimize an algorithm?",
    "What is a Trie data structure, and why is it exceptionally efficient for prefix-matching and autocomplete features?",
    "How would you find the lowest common ancestor (LCA) of two nodes in a Binary Search Tree versus a general binary tree?"
  ],
  "System Design": [
    "How would you approach designing a global, scalable real-time notification system?",
    "What strategies would you use to handle a sudden 100x surge in traffic for an e-commerce checkout service?",
    "Explain how consistent hashing works and why it is crucial for distributed caching systems like Redis or Memcached.",
    "What are the trade-offs between SQL (relational) and NoSQL databases when designing a system with massive write throughput?",
    "How do you implement rate limiting in a distributed API gateway?",
    "What is the CAP theorem, and how do distributed databases choose between consistency and availability during partition events?",
    "How would you design a URL shortening service like Bitly to handle billions of reads and writes?",
    "Explain the differences between horizontal and vertical scaling, along with the bottlenecks associated with each.",
    "How do content delivery networks (CDNs) work, and what caching strategies would you employ for dynamic versus static assets?",
    "How would you design a distributed log monitoring and analytics aggregation platform like ELK or Splunk?"
  ],
  "DevOps & Cloud": [
    "What is the fundamental architectural difference between a Linux container and a traditional virtual machine?",
    "How do you design a secure, zero-downtime CI/CD pipeline using GitHub Actions or Kubernetes?",
    "Can you explain how infrastructure as code (IaC) tools like Terraform manage state files and handle race conditions in team environments?",
    "How do you troubleshoot a cascading failure in a cloud-native microservices environment?",
    "What strategies do you use for secure secret management across ephemeral cloud environments (e.g., HashiCorp Vault or AWS Secrets Manager)?",
    "How do Kubernetes pods, services, and ingress controllers work together to route traffic inside a cluster?",
    "What is observability in cloud systems, and how do metrics, logs, and distributed traces complement each other?",
    "How do you implement blue-green deployments versus canary releases to minimize deployment risk?",
    "What are the security best practices for hardening cloud storage buckets and preventing public data exposure?",
    "How do you manage auto-scaling policies efficiently in response to unpredictable traffic spikes?"
  ],
  "Machine Learning": [
    "What is the core difference between supervised, unsupervised, and reinforcement learning paradigms?",
    "How do you diagnose and mitigate overfitting in a deep neural network?",
    "Explain the vanishing gradient problem and how architectures like ResNets or activation functions like ReLU resolve it.",
    "What evaluation metrics would you choose for an imbalanced classification dataset (e.g., fraud detection), and why?",
    "How do you handle missing or noisy data during the preprocessing pipeline before training a model?",
    "What is the bias-variance tradeoff, and how do techniques like bagging and boosting address it?",
    "How do attention mechanisms and Transformers work compared to traditional recurrent neural networks (RNNs/LSTMs)?",
    "Explain the concept of regularization (L1 vs L2) and how it affects model weights during training.",
    "How would you approach deploying a large language model or computer vision model to production with low inference latency?",
    "What is cross-validation, and why is standard k-fold cross-validation critical for robust model evaluation?"
  ]
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { domain, question, answer, history } = body;

    if (!domain || !question || !answer) {
      return NextResponse.json(
        { error: "Missing required fields: domain, question, or answer." },
        { status: 400 }
      );
    }

    const apiKey = process.env.AGENTROUTER_API_KEY || process.env.GEMINI_API_KEY;
    const baseUrl = process.env.AGENTROUTER_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

    if (!apiKey) {
      throw new Error("API key environment variable is missing.");
    }

    const previousQuestions = history
      ?.filter((m) => m.role === "interviewer")
      .map((m) => m.content) || [];

    const domainBank = QUESTION_BANKS[domain] || QUESTION_BANKS["Backend Development"];

    const prompt = `
You are an expert technical interviewer conducting a professional interview for the domain: "${domain}".

MASTER QUESTION POOL FOR THIS DOMAIN:
${JSON.stringify(domainBank, null, 2)}

PREVIOUSLY ASKED QUESTIONS (DO NOT repeat any of these):
${JSON.stringify(previousQuestions, null, 2)}

The candidate was just asked:
"${question}"

The candidate responded with:
"${answer}"

Instructions:
1. Evaluate the candidate's answer objectively. If the answer is incorrect, vague, short, or says "I don't know", give low scores (0 to 30) across correctness, clarity, depth, and communication. Scores should only increase for correct, well-reasoned answers.
2. Select the next question from the MASTER QUESTION POOL above that has NOT been asked yet. If all questions from the pool have been exhausted, invent a relevant new advanced follow-up question within "${domain}".

Return your response strictly as a valid JSON object matching this exact structure without any markdown backticks or extra text:
{
  "categoryScores": {
    "correctness": number,
    "clarity": number,
    "depth": number,
    "communication": number
  },
  "strengths": string[],
  "improvements": string[],
  "feedback": string,
  "nextQuestion": string,
  "isFallback": false
}
`;

    const isAgentRouter = baseUrl.includes("agentrouter.org");
    const endpoint = isAgentRouter
      ? `${baseUrl}/models/gemini-2.5-flash:generateContent`
      : `${baseUrl}/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (isAgentRouter) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.5,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`API error: ${errText}`);
    }

    const data = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("No text returned from model.");
    }

    const evaluation = JSON.parse(rawText) as EvaluationResult;
    return NextResponse.json({ evaluation } satisfies ChatResponseBody);
  } catch (error) {
    console.error("API Route Error:", error);

    // Provide low emergency scores so accuracy drops on failure instead of climbing
    const emergencyEvaluation: EvaluationResult = {
      categoryScores: { correctness: 10, clarity: 10, depth: 10, communication: 10 },
      strengths: [],
      improvements: ["Please provide a more detailed technical explanation."],
      feedback: "We had trouble evaluating that response. Let's move forward.",
      nextQuestion: `Can you explain a different concept regarding ${domain}?`,
      isFallback: true,
    };

    return NextResponse.json({ evaluation: emergencyEvaluation } satisfies ChatResponseBody);
  }
}