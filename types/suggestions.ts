export interface SuggestionAction {
  label: string;
  type: 'fix' | 'highlight' | 'explain' | 'ignore' | 'navigate';
  primary?: boolean;
  value?: string; // The actual fix value for 'fix' type actions
  handler: () => void | Promise<void>;
}

export interface UnifiedSuggestion {
  id: string;
  category: 'grammar' | 'readability' | 'seo' | 'style';
  severity: 'error' | 'warning' | 'info' | 'suggestion';
  title: string;
  message: string;
  
  // Position in document (for highlighting)
  position?: {
    start: number;
    end: number;
  };
  
  // Context for the suggestion (text around the error)
  context?: {
    text: string; // The actual error text
    length?: number; // Length of the error
    before?: string; // Text before the error
    after?: string; // Text after the error
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
  
  // For AI enhancement in Phase 3
  aiActions?: Array<{
    label: string;
    type: 'rewrite' | 'simplify' | 'expand' | 'generate';
    requiresAI: true;
  }>;
}

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