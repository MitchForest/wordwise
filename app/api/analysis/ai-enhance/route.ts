/**
 * @file app/api/analysis/ai-enhance/route.ts
 * @purpose Server-side route for AI-powered suggestion enhancement
 * @created 2024-07-26
 */
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { UnifiedSuggestion } from '@/types/suggestions';
import { DocumentContext } from '@/services/ai/document-context';

// Input validation schema
const enhanceRequestSchema = z.object({
  suggestions: z.array(z.any()), // Using any for now to avoid deep UnifiedSuggestion validation
  documentContext: z.any(), // Same for DocumentContext
});

// Schema for AI responses
const enhancementSchema = z.object({
    suggestions: z.array(z.object({
    id: z.string(),
    enhancedFix: z.string().optional(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    shouldReplace: z.boolean(),
    alternativeFixes: z.array(z.string()).optional()
  }))
});

function buildEnhancementPrompt(
    suggestions: UnifiedSuggestion[],
    context: DocumentContext
  ): string {
    return `You are an expert writing assistant. Analyze and enhance these writing suggestions.

Document Context:
- Title: ${context.title || 'Untitled'}
- Topic: ${context.detectedTopic || 'General'}
- Tone: ${context.detectedTone || 'Neutral'}
- Target Keyword: ${context.targetKeyword || 'None specified'}
- Meta Description: ${context.metaDescription || 'Not set'}
- First paragraph: ${context.firstParagraph}

For each suggestion:
1. If it has fixes, evaluate if they're contextually appropriate
2. If fixes could be better, provide an enhanced fix
3. If no fixes exist, generate the best fix
4. Rate your confidence (0-1) in the enhancement
5. Explain your reasoning briefly (max 20 words)

CRITICAL STYLE RULES:
- For passive voice: ALWAYS restructure to active voice (e.g., "was written by" → "wrote")
- For weasel words: REMOVE them entirely or replace with specific facts
- For wordiness: Simplify and make concise
- For complex sentences: Break into shorter, clearer sentences

Examples:
- Passive: "The report was completed by the team" → "The team completed the report"
- Weasel: "Some experts believe" → "Dr. Smith's research shows" OR remove entirely
- Wordy: "due to the fact that" → "because"

For SEO suggestions specifically:
- If missing target keyword, suggest one based on the content
- Ensure keyword appears naturally in title, meta description, and H1
- Provide specific text improvements, not just advice
- Consider search intent and user value

Suggestions to enhance:
${suggestions.map(s => `
ID: ${s.id}
Category: ${s.category}
Error text: "${s.matchText || s.context.text}"
Issue: ${s.message}
Current fixes: ${s.actions.filter(a => a.type === 'fix').map(a => `"${a.value}"`).join(', ') || 'none'}
Context: "${s.context.before || ''}[${s.matchText || s.context.text}]${s.context.after || ''}"
${s.category === 'seo' ? `SEO Type: ${s.id.includes('title') ? 'Title' : s.id.includes('meta') ? 'Meta Description' : 'Content'}` : ''}
`).join('\n')}

Focus on:
- Contextual accuracy (especially for spelling suggestions)
- Clarity and conciseness
- Maintaining document tone (${context.detectedTone})
- Fixing the actual issue described
- Providing actionable alternatives when possible
- For SEO: specific keyword-optimized rewrites
- For style: MUST fix the underlying issue (passive→active, remove weasels, etc.)`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = enhanceRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { suggestions, documentContext } = validation.data;
    const model = openai('gpt-4o');
    const prompt = buildEnhancementPrompt(suggestions, documentContext);

    const { object } = await generateObject({
      model,
      schema: enhancementSchema,
      prompt,
      temperature: 0.3,
    });

    return NextResponse.json(object);

  } catch (error) {
    console.error('[API AI-ENHANCE] Error:', error);
    // Determine status code based on error type
    let statusCode = 500;
    if (error instanceof Error) {
        if (error.message.includes('authentication')) statusCode = 401;
        if (error.message.includes('rate limit')) statusCode = 429;
    }
    return NextResponse.json({ error: 'Failed to enhance suggestions' }, { status: statusCode });
  }
}
