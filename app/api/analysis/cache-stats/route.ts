/**
 * @file app/api/analysis/cache-stats/route.ts
 * @purpose Monitor cache performance and statistics
 * @created 2024-12-28
 */
import { NextResponse } from 'next/server';
import { analysisCache } from '@/services/analysis/cache';

export async function GET() {
  try {
    const stats = analysisCache.getStats();
    
    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    return NextResponse.json({ error: 'Failed to get cache stats' }, { status: 500 });
  }
} 