/**
 * @file app/api/analysis/fast/route.ts
 * @purpose This API route is a lightweight endpoint for running fast, local
 * analysis checks like style and basic grammar. It's designed to be called
 * after a short debounce (~800ms) or on sentence-ending punctuation.
 * @modified 2024-12-28 - Added caching for improved performance
 */
import { NextResponse } from 'next/server';
import { UnifiedAnalysisEngine } from '@/services/analysis/engine';
import { getSchema } from '@tiptap/core';
import { serverEditorExtensions } from '@/lib/editor/tiptap-extensions.server';
import { analysisCache } from '@/services/analysis/cache';
import { createHash } from 'crypto';

let analysisEngine: UnifiedAnalysisEngine | null = null;

async function getEngine() {
  if (!analysisEngine) {
    analysisEngine = new UnifiedAnalysisEngine();
    await analysisEngine.initialize();
  }
  return analysisEngine;
}

export async function POST(request: Request) {
  try {
    const { doc: jsonDoc } = await request.json();

    if (!jsonDoc) {
      return NextResponse.json({ error: 'Missing document content' }, { status: 400 });
    }

    // Generate cache key from document content
    const contentHash = createHash('sha256')
      .update(JSON.stringify(jsonDoc))
      .digest('hex');
    const cacheKey = `fast-${contentHash}`;
    
    // Check cache first
    const cachedResult = analysisCache.get(cacheKey);
    if (cachedResult) {
      console.log('[Fast Analysis] Cache hit for key:', cacheKey.substring(0, 16) + '...');
      return NextResponse.json(cachedResult);
    }

    console.log('[Fast Analysis] Cache miss for key:', cacheKey.substring(0, 16) + '...');

    const schema = getSchema(serverEditorExtensions);
    const doc = schema.nodeFromJSON(jsonDoc);

    const engine = await getEngine();
    const suggestions = engine.runFastChecks(doc);

    console.log('[Fast analysis] Returning suggestions:', {
      count: suggestions.length,
      categories: [...new Set(suggestions.map(s => s.category))],
      suggestions: suggestions.map(s => ({
        id: s.id,
        category: s.category,
        matchText: s.matchText,
        message: s.message
      }))
    });

    // Check what happens when we serialize
    const serialized = JSON.stringify({ suggestions });
    const parsed = JSON.parse(serialized);
    
    console.log('[Fast API] After JSON serialization:', {
      firstSuggestion: parsed.suggestions[0] ? {
        hasMatchText: 'matchText' in parsed.suggestions[0],
        hasGetPosition: 'getPosition' in parsed.suggestions[0],
        keys: Object.keys(parsed.suggestions[0]).slice(0, 10)
      } : null
    });

    const result = { suggestions };
    
    // Cache for 5 minutes (fast analysis changes more frequently)
    analysisCache.set(cacheKey, result, 300);
    
    console.log('[Fast Analysis] Cached result with TTL: 300s');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fast analysis API Error:', error);
    return NextResponse.json({ error: 'Failed to perform fast analysis' }, { status: 500 });
  }
} 