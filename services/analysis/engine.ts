import { LanguageToolService } from '@/services/languagetool';
import { SEOAnalyzer } from '@/services/analysis/seo';
import { ReadabilityAnalyzer } from '@/services/analysis/readability';
import { StyleAnalyzer } from '@/services/analysis/style';
import { SpellChecker } from '@/services/analysis/spellcheck';
import { TypoCorrector } from '@/services/analysis/typos';
import { BasicGrammarChecker } from '@/services/analysis/basic-grammar';
import type { Editor } from '@tiptap/react';

interface InstantCheckResult {
  spelling: any;
  typos: any;
  repeatedWords: any;
  timestamp: number;
}

interface SmartCheckResult {
  paragraphGrammar: any;
  quickSEO: any;
  sentenceClarity: any;
  timestamp: number;
}

interface DeepCheckResult {
  fullGrammar: any;
  seoAnalysis: any;
  readability: any;
  style: any;
  timestamp: number;
}

export class AnalysisEngine {
  private languageTool: LanguageToolService;
  private seoAnalyzer: SEOAnalyzer;
  private readabilityAnalyzer: ReadabilityAnalyzer;
  private styleAnalyzer: StyleAnalyzer;
  private spellChecker: SpellChecker;
  private typoCorrector: TypoCorrector;
  private basicGrammarChecker: BasicGrammarChecker;
  
  constructor() {
    this.languageTool = new LanguageToolService();
    this.seoAnalyzer = new SEOAnalyzer();
    this.readabilityAnalyzer = new ReadabilityAnalyzer();
    this.styleAnalyzer = new StyleAnalyzer();
    this.spellChecker = new SpellChecker();
    this.typoCorrector = new TypoCorrector();
    this.basicGrammarChecker = new BasicGrammarChecker();
  }
  
  // Tier 1: Instant checks (0ms) - Run on every keystroke
  async runInstantChecks(text: string): Promise<InstantCheckResult> {
    console.log('[AnalysisEngine] runInstantChecks called with text length:', text?.length || 0);
    if (!text || text.length < 3) {
      return {
        spelling: [],
        typos: [],
        repeatedWords: [],
        timestamp: Date.now()
      };
    }
    
    // Use LOCAL services only - NO API CALLS
    const [spellingResults, typoResults, grammarResults] = await Promise.all([
      this.spellChecker.check(text),
      this.typoCorrector.check(text),
      this.basicGrammarChecker.check(text)
    ]);
    
    console.log('[AnalysisEngine] Local spelling results:', spellingResults);
    console.log('[AnalysisEngine] Local typo results:', typoResults);
    console.log('[AnalysisEngine] Local grammar results:', grammarResults);
    
    const result = {
      spelling: spellingResults || [],
      typos: typoResults || [],
      repeatedWords: typoResults.filter((t: any) => t.type === 'typo' && t.original.includes(' ')),
      basicGrammar: grammarResults || [],
      timestamp: Date.now(),
    };
    
    console.log('[AnalysisEngine] Instant check result:', result);
    return result;
  }
  
  // Tier 2: Smart checks (500ms) - Current paragraph + quick SEO
  async runSmartChecks({ text, document, currentParagraph }: {
    text: string;
    document: any;
    currentParagraph: string;
  }): Promise<SmartCheckResult> {
    if (!text || text.length < 10) {
      return {
        paragraphGrammar: null,
        quickSEO: null,
        sentenceClarity: null,
        timestamp: Date.now()
      };
    }
    
    // Use LOCAL services only for smart checks - NO API CALLS
    const tasks = await Promise.allSettled([
      this.styleAnalyzer.analyze(currentParagraph), // Style check on current paragraph
      this.quickSEOCheck(document),
      this.checkSentenceClarity(currentParagraph),
    ]);
    
    return {
      paragraphGrammar: this.getResult(tasks[0]), // Now contains style issues
      quickSEO: this.getResult(tasks[1]),
      sentenceClarity: this.getResult(tasks[2]),
      timestamp: Date.now(),
    };
  }
  
  // Tier 3: Deep checks (2s) - Full document analysis
  async runDeepChecks({ text, document, content }: {
    text: string;
    document: any;
    content: any;
  }): Promise<DeepCheckResult> {
    if (!text || text.length < 50) {
      return {
        fullGrammar: null,
        seoAnalysis: null,
        readability: null,
        style: null,
        timestamp: Date.now()
      };
    }
    
    const tasks = await Promise.allSettled([
      this.languageTool.check(text), // Full document
      this.seoAnalyzer.analyze({
        title: document.title,
        metaDescription: document.metaDescription,
        content,
        plainText: text,
        targetKeyword: document.targetKeyword,
        keywords: document.keywords,
      }),
      this.readabilityAnalyzer.analyze(text),
      this.styleAnalyzer.analyze(text),
    ]);
    
    return {
      fullGrammar: this.getResult(tasks[0]),
      seoAnalysis: this.getResult(tasks[1]),
      readability: this.getResult(tasks[2]),
      style: this.getResult(tasks[3]),
      timestamp: Date.now(),
    };
  }
  
  private async quickSEOCheck(document: any) {
    const titleLength = document.title?.length || 0;
    const metaLength = document.metaDescription?.length || 0;
    const hasKeyword = document.targetKeyword && document.targetKeyword.length > 0;
    
    return {
      titleLength,
      titleOptimal: titleLength >= 50 && titleLength <= 60,
      titleScore: this.calculateTitleScore(titleLength),
      hasTargetKeyword: hasKeyword,
      keywordInTitle: hasKeyword && document.title?.toLowerCase().includes(document.targetKeyword?.toLowerCase()),
      metaLength,
      metaOptimal: metaLength >= 150 && metaLength <= 160,
      metaScore: this.calculateMetaScore(metaLength),
      quickScore: this.calculateQuickSEOScore(document),
    };
  }
  
  private calculateTitleScore(length: number): number {
    if (length === 0) return 0;
    if (length >= 50 && length <= 60) return 100;
    if (length >= 40 && length <= 70) return 80;
    if (length >= 30 && length <= 80) return 60;
    return 40;
  }
  
  private calculateMetaScore(length: number): number {
    if (length === 0) return 0;
    if (length >= 150 && length <= 160) return 100;
    if (length >= 140 && length <= 170) return 80;
    if (length >= 120 && length <= 180) return 60;
    return 40;
  }
  
  private calculateQuickSEOScore(document: any): number {
    let score = 0;
    let factors = 0;
    
    // Title score
    if (document.title) {
      score += this.calculateTitleScore(document.title.length);
      factors++;
    }
    
    // Meta description score
    if (document.metaDescription) {
      score += this.calculateMetaScore(document.metaDescription.length);
      factors++;
    }
    
    // Keyword presence
    if (document.targetKeyword) {
      factors++;
      if (document.title?.toLowerCase().includes(document.targetKeyword.toLowerCase())) {
        score += 100;
      }
    }
    
    return factors > 0 ? Math.round(score / factors) : 0;
  }
  
  
  private async checkSentenceClarity(text: string) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const issues = [];
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      const words = trimmed.split(/\s+/);
      
      // Check for overly long sentences
      if (words.length > 25) {
        issues.push({
          type: 'long_sentence',
          sentence: trimmed,
          wordCount: words.length,
          suggestion: 'Consider breaking this sentence into shorter ones for better readability.',
          severity: words.length > 35 ? 'high' : 'medium',
        });
      }
      
      // Check for sentences starting with conjunctions
      const startsWithConjunction = /^(and|but|or|yet|so)\s/i.test(trimmed);
      if (startsWithConjunction && trimmed.length > 20) {
        issues.push({
          type: 'conjunction_start',
          sentence: trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : ''),
          suggestion: 'Consider rephrasing to avoid starting with a conjunction.',
          severity: 'low',
        });
      }
      
      // Check for passive voice indicators
      const passiveIndicators = /\b(was|were|been|being|is|are|am)\s+\w+ed\b/i;
      if (passiveIndicators.test(trimmed)) {
        issues.push({
          type: 'passive_voice',
          sentence: trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : ''),
          suggestion: 'Consider using active voice for more engaging writing.',
          severity: 'low',
        });
      }
    }
    
    return issues;
  }
  
  private getResult(task: PromiseSettledResult<any>): any {
    return task.status === 'fulfilled' ? task.value : null;
  }
  
  // Get current paragraph from editor
  static getCurrentParagraph(editor: Editor | null): string {
    if (!editor) return '';
    
    const { from } = editor.state.selection;
    const $pos = editor.state.doc.resolve(from);
    const paragraph = $pos.parent;
    
    return paragraph.textContent || '';
  }
}