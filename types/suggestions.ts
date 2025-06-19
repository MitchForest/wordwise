export interface SuggestionAction {
  label: string;
  type: 'fix' | 'ai-fix' | 'highlight' | 'explain' | 'ignore' | 'navigate';
  primary?: boolean;
  value?: string; // The actual fix value for 'fix' type actions
  handler?: () => void | Promise<void>;
  severity?: 'error' | 'warning' | 'info' | 'suggestion';
}

export type SuggestionCategory = 'spelling' | 'grammar' | 'style' | 'seo' | 'readability';

// --- Canonical Sub-Categories ---
// This is the single source of truth for all suggestion types.
// It enables the creation of unique, semantic IDs.

export const SPELLING_SUB_CATEGORY = {
  MISSPELLING: 'misspelling',
} as const;
export type SpellingSubCategory = typeof SPELLING_SUB_CATEGORY[keyof typeof SPELLING_SUB_CATEGORY];

export const GRAMMAR_SUB_CATEGORY = {
  REPEATED_WORD: 'repeated-word',
  CAPITALIZATION: 'capitalization',
  PUNCTUATION: 'punctuation',
  SPACING: 'spacing',
  CONTRACTION: 'contraction',
  COMMON_CONFUSION: 'common-confusion',
  ARTICLE_USAGE: 'article-usage',
  SUBJECT_VERB_AGREEMENT: 'subject-verb-agreement',
  COMMON_MISSPELLING: 'common-misspelling'
} as const;
export type GrammarSubCategory = typeof GRAMMAR_SUB_CATEGORY[keyof typeof GRAMMAR_SUB_CATEGORY];

export const STYLE_SUB_CATEGORY = {
  PASSIVE_VOICE: 'passive-voice',
  WEASEL_WORDS: 'weasel-words',
  LEXICAL_ILLUSIONS: 'lexical-illusions',
  CLICHE: 'cliche',
  SO_START: 'so-start',
  ADVERB_USAGE: 'adverb-usage'
} as const;
export type StyleSubCategory = typeof STYLE_SUB_CATEGORY[keyof typeof STYLE_SUB_CATEGORY];

export const SEO_SUB_CATEGORY = {
  // Title
  TITLE_TOO_SHORT: 'title-too-short',
  TITLE_TOO_LONG: 'title-too-long',
  TITLE_MISSING_KEYWORD: 'title-missing-keyword',
  // Meta Description
  META_MISSING: 'meta-missing',
  META_TOO_SHORT: 'meta-too-short',
  META_TOO_LONG: 'meta-too-long',
  META_MISSING_KEYWORD: 'meta-missing-keyword',
  META_NO_CTA: 'meta-no-cta',
  // Content
  KEYWORD_DENSITY_LOW: 'keyword-density-low',
  KEYWORD_DENSITY_HIGH: 'keyword-density-high',
  NO_KEYWORD_IN_FIRST_PARAGRAPH: 'no-keyword-in-first-paragraph',
  CONTENT_TOO_SHORT: 'content-too-short',
  // Headings
  NO_H1: 'no-h1',
  MULTIPLE_H1S: 'multiple-h1s',
  INVALID_HEADING_SEQUENCE: 'invalid-heading-sequence',
  HEADING_MISSING_KEYWORD: 'heading-missing-keyword'
} as const;
export type SEOSubCategory = typeof SEO_SUB_CATEGORY[keyof typeof SEO_SUB_CATEGORY];

export type SubCategory = SpellingSubCategory | GrammarSubCategory | StyleSubCategory | SEOSubCategory;

export type RuleId = string; // e.g., 'spelling:misspelling', 'seo:title-too-long'

export interface UnifiedSuggestion {
  id: string; // Format: [category]:[sub-category]:[hash]
  ruleId: RuleId; // The canonical, hardcoded ID for the rule that was violated.
  category: SuggestionCategory;
  subCategory: SubCategory;
  severity: 'error' | 'warning' | 'info' | 'suggestion';
  title: string;
  message: string;
  
  // The actual text that triggered the suggestion (for position tracking)
  matchText?: string;
  
  // Position in document (for highlighting)
  position?: {
    start: number;
    end: number;
  };
  
  // Related metrics
  metrics?: {
    label: string;
    current: number | string;
    target?: number | string;
    unit?: string;
  };
  
  // Available actions
  actions: SuggestionAction[];
  
  context: SuggestionContext;
  originalText?: string; // The actual error text (for short matches)
  originalFrom?: number; // Original position when created
  originalTo?: number; // Original end position when created

  // AI enhancement fields
  aiEnhanced?: boolean;
  aiConfidence?: number;
  aiReasoning?: string;
  alternativeFixes?: string[];
  aiError?: boolean;
  
  // UI state
  isEnhancing?: boolean;
}

// Define SuggestionContext type
export interface SuggestionContext {
  text: string; // The actual error text
  length?: number; // Length of the error
  before?: string; // Text before the error
  after?: string; // Text after the error
}

// ---- Legacy Analysis Result Types ----
// These types represent the raw output from various analysis libraries.
// They should be transformed into `UnifiedSuggestion` objects by the
// respective analysis services before being sent to the client.

export interface AnalysisResults {
  grammar?: { errors: GrammarError[]; score: number };
  seo?: SEOAnalysisResult;
  readability?: ReadabilityResult;
  style?: StyleResult;
}

export interface GrammarError {
  id: string;
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  category: string;
  severity: 'critical' | 'warning' | 'suggestion';
}

export interface SEOAnalysisResult {
  score: number;
  breakdown: {
    title: number;
    meta: number;
    content: number;
    structure: number;
  };
  issues: string[];
  suggestions: string[];
  keywordAnalysis: {
    density: number;
    distribution: 'good' | 'clustered' | 'sparse';
    relatedKeywords: string[];
  };
}

export interface ReadabilityResult {
  score: number; // 0-100 (Flesch Reading Ease)
  gradeLevel: number;
  readingTime: number; // in minutes
  metrics: {
    fleschScore: number;
    avgSentenceLength: number;
    avgWordLength: number;
    syllableCount: number;
    complexWords: number;
    sentences: number;
    words: number;
  };
  issues: string[];
  suggestions: string[];
}

export interface StyleResult {
  issues: StyleIssue[];
  suggestions: string[];
  metrics: {
    passiveVoiceCount: number;
    adverbCount: number;
    clicheCount: number;
    weaselWordCount: number;
  };
}

export interface StyleIssue {
  index: number;
  offset: number;
  reason: string;
  type: 'passive' | 'lexical-illusion' | 'so-start' | 'adverb' | 'cliche' | 'weasel';
  suggestions?: string[];
}

export interface DocumentContext {
  title: string;
  firstParagraph: string;
  detectedTopic?: string;
  detectedTone?: string;
  targetKeyword?: string;
}
