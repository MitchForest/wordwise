import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useDebounce } from './useDebounce';
import { AnalysisEngine } from '@/services/analysis/engine';
import { AnalysisCache } from '@/services/analysis/cache';
import type { UnifiedSuggestion, AnalysisResults } from '@/types/suggestions';

interface AnalysisConfig {
  enableInstantChecks: boolean;    // 0ms - spell check, typos
  enableSmartChecks: boolean;      // 500ms - paragraph grammar
  enableDeepChecks: boolean;       // 2000ms - full document
}

interface AnalysisState {
  instant: boolean;
  smart: boolean;
  deep: boolean;
}

export function useOptimizedAnalysis(
  editor: Editor | null, 
  document: any,
  config: AnalysisConfig = {
    enableInstantChecks: true,
    enableSmartChecks: true,
    enableDeepChecks: true,
  }
) {
  // Stable state management
  const [analyses, setAnalyses] = useState<AnalysisResults>({});
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<AnalysisState>({
    instant: false,
    smart: false,
    deep: false,
  });
  
  const [scores, setScores] = useState({
    grammar: 100,
    readability: 100,
    seo: 100,
    overall: 100,
  });
  
  // Text extraction with memoization
  const text = useMemo(() => editor?.getText() || '', [editor?.state]);
  const textHash = useMemo(() => hashText(text), [text]);
  
  // Three-tier debouncing
  const instantText = text; // No debounce for instant checks
  const smartText = useDebounce(text, 500); // 500ms for smart checks
  const deepText = useDebounce(text, 2000); // 2s for deep analysis
  
  // Stable service instances
  const analysisEngine = useRef(new AnalysisEngine());
  const cache = useRef(new AnalysisCache());
  
  // Refs to avoid recreation
  const editorRef = useRef(editor);
  const documentRef = useRef(document);
  
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  
  useEffect(() => {
    documentRef.current = document;
  }, [document]);
  
  // Convert analysis results to unified suggestions
  const convertToUnifiedSuggestions = useCallback((results: any, tier: string): UnifiedSuggestion[] => {
    const suggestions: UnifiedSuggestion[] = [];
    let idCounter = 0;
    
    // Convert spelling errors
    if (results.spelling && Array.isArray(results.spelling)) {
      results.spelling.forEach((error: any) => {
        suggestions.push({
          id: `${tier}-spelling-${idCounter++}`,
          category: 'grammar',
          severity: 'error',
          title: 'Spelling Error',
          message: `"${error.word}" may be misspelled`,
          position: {
            start: error.position,
            end: error.position + error.length,
          },
          actions: error.suggestions.map((suggestion: string, index: number) => ({
            label: suggestion,
            type: 'fix' as const,
            primary: index === 0,
            handler: async () => {
              if (editorRef.current) {
                editorRef.current.chain()
                  .focus()
                  .setTextSelection({ 
                    from: error.position, 
                    to: error.position + error.length 
                  })
                  .insertContent(suggestion)
                  .run();
              }
            },
          })),
        });
      });
    }
    
    // Convert typos
    if (results.typos && Array.isArray(results.typos)) {
      results.typos.forEach((typo: any) => {
        suggestions.push({
          id: `${tier}-typo-${idCounter++}`,
          category: 'grammar',
          severity: 'warning',
          title: 'Possible Typo',
          message: `Did you mean "${typo.suggestion}"?`,
          position: {
            start: typo.position,
            end: typo.position + typo.length,
          },
          actions: [{
            label: typo.suggestion,
            type: 'fix' as const,
            primary: true,
            handler: async () => {
              if (editorRef.current) {
                editorRef.current.chain()
                  .focus()
                  .setTextSelection({ 
                    from: typo.position, 
                    to: typo.position + typo.length 
                  })
                  .insertContent(typo.suggestion)
                  .run();
              }
            },
          }],
        });
      });
    }
    
    // Convert repeated words
    if (results.repeatedWords && Array.isArray(results.repeatedWords)) {
      results.repeatedWords.forEach((repeat: any) => {
        suggestions.push({
          id: `${tier}-repeat-${idCounter++}`,
          category: 'style',
          severity: 'suggestion',
          title: 'Repeated Word',
          message: repeat.message,
          position: {
            start: repeat.position,
            end: repeat.position + repeat.length,
          },
          actions: [{
            label: 'Remove duplicate',
            type: 'fix' as const,
            primary: true,
            handler: async () => {
              if (editorRef.current) {
                editorRef.current.chain()
                  .focus()
                  .setTextSelection({ 
                    from: repeat.position, 
                    to: repeat.position + repeat.length 
                  })
                  .insertContent(repeat.suggestion)
                  .run();
              }
            },
          }],
        });
      });
    }
    
    // Convert sentence clarity issues
    if (results.sentenceClarity && Array.isArray(results.sentenceClarity)) {
      results.sentenceClarity.forEach((issue: any) => {
        suggestions.push({
          id: `${tier}-clarity-${idCounter++}`,
          category: 'readability',
          severity: issue.severity || 'suggestion',
          title: issue.type === 'long_sentence' ? 'Long Sentence' : 
                 issue.type === 'passive_voice' ? 'Passive Voice' : 'Clarity Issue',
          message: issue.suggestion,
          actions: [{
            label: 'Highlight',
            type: 'highlight' as const,
            handler: async () => {
              // Find and highlight the sentence
              const sentenceStart = text.indexOf(issue.sentence);
              if (sentenceStart >= 0 && editorRef.current) {
                editorRef.current.chain()
                  .focus()
                  .setTextSelection({ 
                    from: sentenceStart, 
                    to: sentenceStart + issue.sentence.length 
                  })
                  .run();
              }
            },
          }],
          aiActions: [{
            label: issue.type === 'long_sentence' ? 'Split sentence' : 'Rewrite',
            type: 'rewrite',
            requiresAI: true,
          }],
        });
      });
    }
    
    // Convert SEO issues
    if (results.quickSEO && results.quickSEO.quickScore < 80) {
      const seo = results.quickSEO;
      
      if (!seo.titleOptimal) {
        suggestions.push({
          id: `${tier}-seo-title`,
          category: 'seo',
          severity: 'warning',
          title: 'SEO Title Length',
          message: `Title is ${seo.titleLength} characters. Optimal range is 50-60.`,
          metrics: {
            label: 'Title Score',
            current: seo.titleScore,
            target: 100,
            unit: '/100',
          },
          actions: [{
            label: 'Edit Title',
            type: 'navigate' as const,
            handler: async () => {
              // Focus on title field
              const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
              titleInput?.focus();
            },
          }],
        });
      }
      
      if (!seo.keywordInTitle && seo.hasTargetKeyword) {
        suggestions.push({
          id: `${tier}-seo-keyword`,
          category: 'seo',
          severity: 'warning',
          title: 'Target Keyword Missing',
          message: 'Your target keyword is not in the title',
          actions: [{
            label: 'Add to Title',
            type: 'navigate' as const,
            handler: async () => {
              const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
              titleInput?.focus();
            },
          }],
          aiActions: [{
            label: 'Suggest Title',
            type: 'generate',
            requiresAI: true,
          }],
        });
      }
    }
    
    return suggestions;
  }, [text]);
  
  // Update suggestions from tier
  const updateSuggestions = useCallback((results: any, tier: string) => {
    setSuggestions(prev => {
      // Remove old suggestions from this tier
      const filtered = prev.filter(s => !s.id.startsWith(tier));
      
      // Add new suggestions
      const newSuggestions = convertToUnifiedSuggestions(results, tier);
      
      return [...filtered, ...newSuggestions];
    });
  }, [convertToUnifiedSuggestions]);
  
  // Calculate scores from all analyses
  const calculateScores = useCallback((analyses: any) => {
    let grammarScore = 100;
    let seoScore = 100;
    let readabilityScore = 100;
    
    // Grammar score from errors count
    const errorCount = suggestions.filter(s => s.category === 'grammar').length;
    grammarScore = Math.max(0, 100 - (errorCount * 5));
    
    // SEO score from quick check
    if (analyses.smart?.quickSEO) {
      seoScore = analyses.smart.quickSEO.quickScore;
    }
    
    // Readability from sentence clarity
    if (analyses.smart?.sentenceClarity) {
      const clarityIssues = analyses.smart.sentenceClarity.length;
      readabilityScore = Math.max(0, 100 - (clarityIssues * 10));
    }
    
    // Deep analysis overrides if available
    if (analyses.deep?.seoAnalysis?.score) {
      seoScore = analyses.deep.seoAnalysis.score;
    }
    
    if (analyses.deep?.readability?.score) {
      readabilityScore = analyses.deep.readability.score;
    }
    
    const overall = Math.round((grammarScore + seoScore + readabilityScore) / 3);
    
    return {
      grammar: grammarScore,
      seo: seoScore,
      readability: readabilityScore,
      overall,
    };
  }, [suggestions]);
  
  // Instant checks: spell check, basic typos (0ms delay)
  useEffect(() => {
    if (!config.enableInstantChecks || !instantText || instantText.length < 3) return;
    
    setIsAnalyzing(prev => ({ ...prev, instant: true }));
    
    const runInstantChecks = async () => {
      try {
        const instant = await analysisEngine.current.runInstantChecks(instantText);
        
        setAnalyses(prev => ({ ...prev, instant }));
        updateSuggestions(instant, 'instant');
      } catch (error) {
        console.error('Instant check failed:', error);
      } finally {
        setIsAnalyzing(prev => ({ ...prev, instant: false }));
      }
    };
    
    runInstantChecks();
  }, [instantText, config.enableInstantChecks, updateSuggestions]);
  
  // Smart checks: paragraph grammar, quick SEO (500ms delay)
  useEffect(() => {
    if (!config.enableSmartChecks || !smartText || smartText.length < 10) return;
    
    setIsAnalyzing(prev => ({ ...prev, smart: true }));
    
    const runSmartChecks = async () => {
      try {
        // Check cache first
        const cacheKey = `smart-${textHash}`;
        let smart = cache.current.get(cacheKey);
        
        if (!smart) {
          smart = await analysisEngine.current.runSmartChecks({
            text: smartText,
            document: documentRef.current,
            currentParagraph: AnalysisEngine.getCurrentParagraph(editorRef.current),
          });
          cache.current.set(cacheKey, smart, 300); // 5 min cache
        }
        
        setAnalyses(prev => ({ ...prev, smart }));
        updateSuggestions(smart, 'smart');
      } catch (error) {
        console.error('Smart check failed:', error);
      } finally {
        setIsAnalyzing(prev => ({ ...prev, smart: false }));
      }
    };
    
    runSmartChecks();
  }, [smartText, textHash, config.enableSmartChecks, updateSuggestions]);
  
  // Deep checks: full document analysis (2s delay)
  useEffect(() => {
    if (!config.enableDeepChecks || !deepText || deepText.length < 50) return;
    
    setIsAnalyzing(prev => ({ ...prev, deep: true }));
    
    const runDeepChecks = async () => {
      try {
        const cacheKey = `deep-${textHash}`;
        let deep = cache.current.get(cacheKey);
        
        if (!deep) {
          deep = await analysisEngine.current.runDeepChecks({
            text: deepText,
            document: documentRef.current,
            content: editorRef.current?.getJSON(),
          });
          cache.current.set(cacheKey, deep, 600); // 10 min cache
        }
        
        setAnalyses(prev => ({ ...prev, deep }));
        updateSuggestions(deep, 'deep');
      } catch (error) {
        console.error('Deep check failed:', error);
      } finally {
        setIsAnalyzing(prev => ({ ...prev, deep: false }));
      }
    };
    
    runDeepChecks();
  }, [deepText, textHash, config.enableDeepChecks, updateSuggestions]);
  
  // Update scores when analyses change
  useEffect(() => {
    const newScores = calculateScores(analyses);
    setScores(newScores);
  }, [analyses, calculateScores]);
  
  return {
    analyses,
    suggestions,
    scores,
    isAnalyzing: Object.values(isAnalyzing).some(Boolean),
    analysisState: isAnalyzing,
    forceRefresh: () => cache.current.clear(),
  };
}

// Helper function to generate text hash
function hashText(text: string): string {
  if (!text) return '';
  
  // Simple hash for text comparison
  let hash = 0;
  const str = text.slice(0, 100) + text.length;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}