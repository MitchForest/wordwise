/**
 * @file services/ai/usage-limiter.ts
 * @purpose Track and limit daily AI enhancement usage to control costs
 * @created 2024-12-28
 */

import { db } from '@/lib/db';
import { aiUsageLogs } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const DAILY_ENHANCEMENT_LIMIT = 1000; // Generous for now

/**
 * @purpose Check if user has remaining AI usage for today
 * @param userId - The user's ID
 * @returns True if user can use AI enhancements
 */
export async function checkUserAIUsage(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  
  const usage = await db.query.aiUsageLogs.findFirst({
    where: and(
      eq(aiUsageLogs.userId, userId),
      eq(aiUsageLogs.date, today)
    )
  });
  
  if (!usage) return true;
  
  return usage.enhancementsCount < DAILY_ENHANCEMENT_LIMIT;
}

/**
 * @purpose Track AI usage for the user
 * @param userId - The user's ID
 * @param enhancementCount - Number of enhancements used
 * @param tokensUsed - Number of tokens used (for future cost tracking)
 */
export async function trackAIUsage(
  userId: string, 
  enhancementCount: number,
  tokensUsed: number = 0
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const id = `${userId}-${today}`;
  
  await db
    .insert(aiUsageLogs)
    .values({
      id,
      userId,
      date: today,
      enhancementsCount: enhancementCount,
      tokensUsed
    })
    .onConflictDoUpdate({
      target: aiUsageLogs.id,
      set: {
        enhancementsCount: sql`${aiUsageLogs.enhancementsCount} + ${enhancementCount}`,
        tokensUsed: sql`${aiUsageLogs.tokensUsed} + ${tokensUsed}`,
        updatedAt: new Date()
      }
    });
}

/**
 * @purpose Get user's current AI usage statistics
 * @param userId - The user's ID
 * @returns Usage statistics including used, limit, and remaining
 */
export async function getUserAIUsage(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  const usage = await db.query.aiUsageLogs.findFirst({
    where: and(
      eq(aiUsageLogs.userId, userId),
      eq(aiUsageLogs.date, today)
    )
  });
  
  const used = usage?.enhancementsCount || 0;
  
  return {
    used,
    limit: DAILY_ENHANCEMENT_LIMIT,
    remaining: DAILY_ENHANCEMENT_LIMIT - used
  };
}

/**
 * @purpose Reset user's daily usage (for testing or admin purposes)
 * @param userId - The user's ID
 * @modified 2024-12-28 - Added for testing purposes
 */
export async function resetUserAIUsage(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const id = `${userId}-${today}`;
  
  await db
    .delete(aiUsageLogs)
    .where(eq(aiUsageLogs.id, id));
} 