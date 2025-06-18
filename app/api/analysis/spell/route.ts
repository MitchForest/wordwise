/**
 * @file app/api/analysis/spell/route.ts
 * @purpose This API route is a lightweight endpoint for performing a real-time
 * spell check on a single word. It is designed to be called frequently
 * (e.g., on every spacebar press) to provide instant feedback to the user.
 */
import { NextResponse } from 'next/server';
import { UnifiedAnalysisEngine } from '@/services/analysis/engine';

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
    const { word, doc } = await request.json();

    if (!word || !doc) {
      return NextResponse.json({ error: 'Missing word or document context' }, { status: 400 });
    }

    const engine = await getEngine();
    const suggestions = engine.runRealtimeSpellCheck(word, doc);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Real-time spell check API Error:', error);
    return NextResponse.json({ error: 'Failed to perform spell check' }, { status: 500 });
  }
} 