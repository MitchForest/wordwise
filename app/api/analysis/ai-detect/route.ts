/**
 * @file app/api/analysis/ai-detect/route.ts
 * @purpose Use AI to find writing issues not caught by local analysis
 * @created 2024-12-28
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { checkUserAIUsage, trackAIUsage } from '@/services/ai/usage-limiter';

// TYPES: Define ProseMirror node structure
type ProseMirrorNode = {
  type?: string;
  text?: string;
  content?: ProseMirrorNode[];
};

// SCHEMA: Define structure for AI-detected suggestions
const additionalSuggestionsSchema = z.object({
  suggestions: z.array(z.object({
    category: z.enum(['spelling', 'grammar', 'style', 'seo', 'tone']),
    matchText: z.string(),
    message: z.string(),
    fix: z.string(),
    confidence: z.number().min(0).max(1),
    contextBefore: z.string().max(40),
    contextAfter: z.string().max(40)
  }))
});

export async function POST(request: Request) {
  try {
    // CHECK AUTH: Ensure user is authenticated
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // CHECK USAGE: Enforce daily limits
    const canUseAI = await checkUserAIUsage(session.user.id);
    if (!canUseAI) {
      return NextResponse.json({ 
        error: 'Daily AI limit reached',
        additionalSuggestions: []
      }, { status: 429 });
    }
    
    const { doc, metadata, existingSuggestionIds } = await request.json();
    
    if (!doc || !doc.content) {
      return NextResponse.json({ additionalSuggestions: [] });
    }
    
    // EXTRACT: Get document text
    const extractText = (node: ProseMirrorNode): string => {
      if (node.type === 'text') return node.text || '';
      if (node.content) {
        return node.content.map(extractText).join(' ');
      }
      return '';
    };
    
    const fullText = extractText(doc);
    
    // Skip if document is too short
    if (fullText.length < 50) {
      return NextResponse.json({ additionalSuggestions: [] });
    }
    
    // BUILD PROMPT: Focus on high-value improvements
    const prompt = `You are an expert editor. Analyze this document for writing issues not already identified.

Document:
Title: ${metadata.title || 'Untitled'}
Target Keyword: ${metadata.targetKeyword || 'None'}
Meta Description: ${metadata.metaDescription || 'None'}
Content: ${fullText.substring(0, 2000)}${fullText.length > 2000 ? '...' : ''}

Already identified: ${existingSuggestionIds.length} issues found by automated checkers.

Find up to 5 HIGH-VALUE improvements that automated tools would miss:
1. Contextual spelling errors (homophones, commonly confused words)
2. Complex grammar issues requiring context
3. Style improvements for clarity and flow
4. SEO opportunities (natural keyword placement, readability)
5. Tone consistency issues

For each issue:
- Provide the exact text that needs fixing (matchText)
- Include 20-40 chars of context before and after
- Suggest a specific fix
- Rate confidence (0.7+ only for high-value issues)

Focus on issues that significantly improve the document. Ignore minor nitpicks.`;

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: additionalSuggestionsSchema,
      prompt,
      temperature: 0.3,
    });
    
    // CONVERT: Transform to UnifiedSuggestion format
    const additionalSuggestions = object.suggestions.map((s, index) => ({
      id: `ai-detect-${Date.now()}-${index}`,
      category: s.category,
      message: s.message,
      matchText: s.matchText,
      context: {
        text: s.matchText,
        before: s.contextBefore,
        after: s.contextAfter
      },
      actions: [{
        type: 'fix' as const,
        label: 'Apply AI fix',
        value: s.fix
      }],
      source: 'ai-detect' as const,
      aiEnhanced: true,
      aiFix: s.fix,
      aiConfidence: s.confidence,
      aiReasoning: 'Detected by AI deep analysis'
    }));
    
    // TRACK: Record AI usage
    await trackAIUsage(session.user.id, additionalSuggestions.length);
    
    console.log('[AI Detect] Found additional suggestions:', {
      count: additionalSuggestions.length,
      categories: additionalSuggestions.map(s => s.category)
    });
    
    return NextResponse.json({ additionalSuggestions });
  } catch (error) {
    console.error('[AI Detect] Error:', error);
    // Return empty array on error to not break the UI
    return NextResponse.json({ additionalSuggestions: [] });
  }
} 