/**
 * @file app/api/analysis/deep/route.ts
 * @purpose This API route handles the deep, computationally expensive analysis,
 * including SEO checks and readability metrics. It's designed to be called
 * infrequently on a long debounce (~2000ms).
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
    const { doc: jsonDoc, documentMetadata, enableSEOChecks = true } = await request.json();

    if (!jsonDoc || !documentMetadata) {
      return NextResponse.json({ error: 'Missing document content or metadata' }, { status: 400 });
    }

    // --- Caching Logic ---
    const contentHash = createHash('sha256').update(JSON.stringify({ jsonDoc, documentMetadata, enableSEOChecks })).digest('hex');
    const cachedResult = await analysisCache.getAsync(contentHash);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }
    // --- End Caching Logic ---

    const schema = getSchema(serverEditorExtensions);
    const doc = schema.nodeFromJSON(jsonDoc);

    const engine = await getEngine();
    const { metrics, suggestions } = await engine.runDeepChecks(doc, documentMetadata);

    // Filter out SEO suggestions if not enabled
    const filteredSuggestions = enableSEOChecks 
      ? suggestions 
      : suggestions.filter(s => s.category !== 'seo');

    const result = { 
      suggestions: filteredSuggestions, 
      metrics 
    };

    // --- Caching Logic ---
    analysisCache.set(contentHash, result, 3600); // Cache for 1 hour
    // --- End Caching Logic ---

    return NextResponse.json(result);
  } catch (error) {
    console.error('Deep analysis API Error:', error);
    return NextResponse.json({ error: 'Failed to perform deep analysis' }, { status: 500 });
  }
} 