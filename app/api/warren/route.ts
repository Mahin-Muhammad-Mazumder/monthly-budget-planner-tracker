import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { generateDeterministicWarrenResponse } from '@/lib/wealth-engine';
import { CurrencyCode, WarrenPayload } from '@/lib/wealth-types';

const WARREN_SYSTEM_INSTRUCTION = `You are "Warren", an institutional capital allocator and quantitative financial advisor built into Apex Wealth Manager for M. Mahin.
Your persona:
- Cold, hyper-rational, unsentimental capital allocator inspired by institutional value investing and quantitative risk management.
- Speak strictly in crisp metrics, ratios, daily burn velocity, margin of safety, and 10-year compounded opportunity cost. Zero fluff, zero small talk, zero emotional platitudes.
- Every response must reference the exact numbers from the live JSON state payload injected into the prompt (e.g., daily_safe_to_spend, variable_daily_burn_status, financial_health_score, unallocated_capital, savings_allocated, top_overspent_categories).
- Structure your analysis with clean markdown headings and bullet points so it reads like an institutional portfolio diagnostic brief.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload: WarrenPayload = body.payload;
    const currency: CurrencyCode = body.currency || 'BDT';
    const customApiKey: string | undefined = body.customApiKey;

    if (!payload) {
      return NextResponse.json(
        { error: 'Missing Warren payload' },
        { status: 400 }
      );
    }

    const currencySymbol = currency === 'BDT' ? '৳ (BDT)' : '$ (USD)';
    const effectiveKey =
      (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!effectiveKey || effectiveKey === 'MY_GEMINI_API_KEY') {
      const fallbackText = generateDeterministicWarrenResponse(
        payload,
        currency
      );
      return NextResponse.json({
        text: fallbackText,
        source: 'deterministic',
      });
    }

    const ai = new GoogleGenAI({
      apiKey: effectiveKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptText = `LIVE SYSTEM CONTEXT PAYLOAD (Currency: ${currencySymbol}):
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

USER DIRECTIVE / QUERY:
${payload.user_message}

Provide your cold, quantitative capital allocation response grounded in the exact figures above.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: WARREN_SYSTEM_INSTRUCTION,
        temperature: 0.3,
      },
    });

    const text =
      response.text || generateDeterministicWarrenResponse(payload, currency);

    return NextResponse.json({
      text,
      source: response.text ? 'gemini' : 'deterministic',
    });
  } catch (error) {
    try {
      const cloned = await req.clone().json().catch(() => null);
      if (cloned?.payload) {
        const fallbackText = generateDeterministicWarrenResponse(
          cloned.payload,
          cloned.currency || 'BDT'
        );
        return NextResponse.json({
          text: fallbackText,
          source: 'deterministic',
        });
      }
    } catch {
      // ignore secondary parse error
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to execute audit',
      },
      { status: 500 }
    );
  }
}
