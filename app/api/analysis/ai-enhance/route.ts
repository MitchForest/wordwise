/**
 * @file app/api/analysis/ai-enhance/route.ts
 * @purpose API endpoint for AI-enhanced suggestions using GPT-4o
 * @created 2024-12-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AIEnhancementService } from '@/services/ai/enhancement-service';
import { DocumentContextExtractor } from '@/services/ai/document-context';
import { checkUserAIUsage, trackAIUsage } from '@/services/ai/usage-limiter';
import { getSchema } from '@tiptap/core';
import { serverEditorExtensions } from '@/lib/editor/tiptap-extensions.server';
import { AIEnhancementRequest } from '@/services/ai/types';

const enhancementService = new AIEnhancementService();
const contextExtractor = new DocumentContextExtractor();

export async function POST(request: NextRequest) {
  try {
    // AUTHENTICATE: Check if user is logged in
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // RATE LIMIT: Check usage limits (1000 enhancements per day)
    const canUseAI = await checkUserAIUsage(session.user.id);
    if (!canUseAI) {
      return NextResponse.json({ 
        error: 'Daily AI enhancement limit reached',
        enhanced: [] // Return empty enhancements
      }, { status: 429 });
    }
    
    // PARSE: Get request data
    const body: AIEnhancementRequest = await request.json();
    const { suggestions, doc: jsonDoc, metadata } = body;
    
    if (!suggestions || !jsonDoc) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    // Skip if no suggestions to enhance
    if (suggestions.length === 0) {
      return NextResponse.json({ enhanced: [] });
    }
    
    // CONVERT: JSON to ProseMirror doc
    const schema = getSchema(serverEditorExtensions);
    const doc = schema.nodeFromJSON(jsonDoc);
    
    // EXTRACT: Get document context
    const context = contextExtractor.extract(doc, suggestions);
    context.title = metadata?.title || context.title;
    context.targetKeyword = metadata?.targetKeyword;
    
    console.log('[AI Enhancement API] Processing:', {
      userId: session.user.id,
      suggestionCount: suggestions.length,
      documentTitle: context.title,
      detectedTone: context.detectedTone,
      detectedTopic: context.detectedTopic
    });
    
    // ENHANCE: Call AI service
    const enhanced = await enhancementService.enhanceAllSuggestions(
      suggestions,
      context
    );
    
    // TRACK: Record usage
    await trackAIUsage(session.user.id, enhanced.length);
    
    console.log('[AI Enhancement API] Enhanced suggestions:', {
      total: enhanced.length,
      withAIFixes: enhanced.filter(s => s.aiFix).length,
      highConfidence: enhanced.filter(s => (s.aiConfidence || 0) > 0.8).length
    });
    
    return NextResponse.json({ enhanced });
  } catch (error) {
    console.error('[AI Enhancement API] Error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json({ 
          error: 'AI service configuration error',
          enhanced: []
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'AI enhancement failed',
      enhanced: []
    }, { status: 500 });
  }
} 