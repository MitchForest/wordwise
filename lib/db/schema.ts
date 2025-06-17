import { pgTable, text, timestamp, boolean, uuid, jsonb, integer } from 'drizzle-orm/pg-core'
import type { JSONContent } from '@tiptap/react'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

// Phase 1: Documents table for blog editor
export const documents = pgTable('documents', {
  // Core fields
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  
  // Content fields
  title: text('title').default('Untitled Document').notNull(),
  metaDescription: text('meta_description').default(''),
  content: jsonb('content').$type<JSONContent>(), // Tiptap JSON format
  plainText: text('plain_text').default(''), // For searching
  
  // SEO fields (basic for Phase 1)
  targetKeyword: text('target_keyword').default(''),
  
  // Phase 2: Additional fields
  author: text('author').default('Anonymous').notNull(),
  keywords: jsonb('keywords').$type<string[]>().default([]),
  secondaryKeywords: jsonb('secondary_keywords').$type<string[]>().default([]),
  
  // Analysis cache
  analysisCache: jsonb('analysis_cache').$type<{
    grammar: {
      score: number;
      issues: unknown[];
      checkedAt: string;
      textHash: string;
    };
    seo: {
      score: number;
      breakdown: Record<string, number>;
      issues: string[];
      suggestions: string[];
      checkedAt: string;
    };
    readability: {
      score: number;
      gradeLevel: number;
      readingTime: number;
      metrics: Record<string, number>;
      checkedAt: string;
    };
    style: {
      issues: unknown[];
      suggestions: string[];
      checkedAt: string;
    };
  }>(),
  
  // Score fields for quick access
  seoScore: integer('seo_score').default(0).notNull(),
  readabilityScore: integer('readability_score').default(0).notNull(),
  styleScore: integer('style_score').default(0).notNull(),
  overallScore: integer('overall_score').default(0).notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastSavedAt: timestamp('last_saved_at').defaultNow().notNull(),
  
  // Save state
  autoSaveState: text('auto_save_state').default('saved').$type<'saved' | 'saving' | 'error'>(),
  version: integer('version').default(1).notNull(),
  
  // Flags
  isDeleted: boolean('is_deleted').default(false),
});

// Type exports
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

// Phase 2: User preferences table for custom settings
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  
  // Writing preferences
  targetGradeLevel: integer('target_grade_level').default(8),
  writingTone: text('writing_tone').default('professional'),
  
  // Custom dictionary for spell check
  customDictionary: jsonb('custom_dictionary').$type<string[]>().default([]),
  
  // Ignored suggestions
  ignoredSuggestions: jsonb('ignored_suggestions').$type<string[]>().default([]),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;