import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useDebounce } from './useDebounce';
import { SEOAnalyzer } from '@/services/analysis/seo';
import { ReadabilityAnalyzer } from '@/services/analysis/readability';
import { StyleAnalyzer } from '@/services/analysis/style';
import { useGrammarCheck } from './useGrammarCheck';
import { analysisCache } from '@/services/analysis/cache';
import type { 
  UnifiedSuggestion, 
  AnalysisResults,
  SEOAnalysisResult,
  ReadabilityResult,
  StyleResult,
  GrammarError 
} from '@/types/suggestions';

export function useAnalysis(editor: Editor | null, document: any) {
  const [analyses, setAnalyses] = useState<AnalysisResults>({});
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scores, setScores] = useState({
    grammar: 100,
    readability: 100,
    seo: 100,
    overall: 100,
  });
  
  const text = editor?.getText() || '';
  const debouncedText = useDebounce(text, 1000); // 1 second delay
  
  const { errors: grammarErrors, isChecking } = useGrammarCheck(editor);
  
  const seoAnalyzer = useRef(new SEOAnalyzer());
  const readabilityAnalyzer = useRef(new ReadabilityAnalyzer());
  const styleAnalyzer = useRef(new StyleAnalyzer());

  // Store references to avoid recreating functions
  const editorRef = useRef(editor);
  const documentRef = useRef(document);
  
  // Update refs when props change
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  
  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  const runAnalysis = useCallback(async (
    text: string,
    grammarErrors: GrammarError[],
    document: any,
    editor: Editor | null
  ) => {
    if (!text || text.length < 10) {
      setAnalyses({});
      setSuggestions([]);
      return;
    }

    setIsAnalyzing(true);

    try {
      const results: AnalysisResults = {};
      const allSuggestions: UnifiedSuggestion[] = [];

      // Grammar analysis (from existing hook)
      if (grammarErrors) {
        results.grammar = {
          errors: grammarErrors,
          score: Math.max(0, 100 - (grammarErrors.length * 5)),
        };

        // Convert grammar errors to unified suggestions
        grammarErrors.forEach((error, index) => {
          allSuggestions.push({
            id: `grammar-${index}`,
            category: 'grammar',
            severity: error.severity === 'critical' ? 'error' : error.severity === 'suggestion' ? 'info' : 'warning',
            title: error.shortMessage || 'Grammar issue',
            message: error.message,
            position: {
              start: error.offset,
              end: error.offset + error.length,
            },
            actions: [
              ...(error.replacements || []).slice(0, 3).map((replacement, i) => ({
                label: replacement.value,
                type: 'fix' as const,
                primary: i === 0,
                handler: async () => {
                  // Apply fix to editor
                  if (editor) {
                    const from = error.offset;
                    const to = error.offset + error.length;
                    editor.chain()
                      .focus()
                      .setTextSelection({ from, to })
                      .insertContent(replacement.value)
                      .run();
                  }
                },
              })),
              {
                label: 'Ignore',
                type: 'ignore' as const,
                handler: async () => {
                  // Handle ignore
                },
              },
            ],
          });
        });
      }

      // SEO Analysis with caching
      const seoKey = `seo-${document.id}`;
      let seoResult = analysisCache.get<SEOAnalysisResult>(seoKey);
      
      if (!seoResult && (document.targetKeyword || document.keywords?.length > 0)) {
        seoResult = seoAnalyzer.current.analyze({
          title: document.title || '',
          metaDescription: document.metaDescription || '',
          content: editor?.getJSON() || {},
          plainText: text,
          targetKeyword: document.targetKeyword || '',
          keywords: document.keywords || [],
        });
        analysisCache.set(seoKey, seoResult);
      }
      
      if (seoResult) {
        results.seo = seoResult;

        // Convert SEO issues to suggestions
        seoResult.issues.forEach((issue, index) => {
          allSuggestions.push({
            id: `seo-${index}`,
            category: 'seo',
            severity: seoResult.score < 50 ? 'warning' : 'info',
            title: 'SEO Issue',
            message: issue,
            metrics: {
              label: 'SEO Score',
              current: seoResult.score,
              target: 80,
              unit: '/100',
            },
            actions: [
              {
                label: 'View Details',
                type: 'explain' as const,
                handler: async () => {
                  // Show detailed explanation in an alert (in production, use a modal)
                  const details = `SEO Analysis Details:\n\n` +
                    `Score: ${seoResult.score}/100\n\n` +
                    `Breakdown:\n` +
                    `- Title: ${seoResult.breakdown.title} points\n` +
                    `- Meta Description: ${seoResult.breakdown.meta} points\n` +
                    `- Content: ${seoResult.breakdown.content} points\n` +
                    `- Structure: ${seoResult.breakdown.structure} points\n\n` +
                    `Keyword Analysis:\n` +
                    `- Density: ${seoResult.keywordAnalysis.density.toFixed(2)}%\n` +
                    `- Distribution: ${seoResult.keywordAnalysis.distribution}\n` +
                    `- Related Keywords: ${seoResult.keywordAnalysis.relatedKeywords.join(', ') || 'None found'}`;
                  
                  alert(details);
                },
              },
            ],
            aiActions: [
              {
                label: 'Fix with AI',
                type: 'rewrite',
                requiresAI: true,
              },
            ],
          });
        });
      }

      // Readability Analysis with caching
      const readabilityKey = `readability-${document.id}`;
      let readabilityResult = analysisCache.get<ReadabilityResult>(readabilityKey);
      
      if (!readabilityResult) {
        readabilityResult = readabilityAnalyzer.current.analyze(text);
        analysisCache.set(readabilityKey, readabilityResult);
      }
      
      results.readability = readabilityResult;

      // Convert readability issues to suggestions
      readabilityResult.issues.forEach((issue, index) => {
        allSuggestions.push({
          id: `readability-${index}`,
          category: 'readability',
          severity: readabilityResult.gradeLevel > 12 ? 'warning' : 'suggestion',
          title: 'Readability',
          message: issue,
          metrics: {
            label: 'Grade Level',
            current: Math.round(readabilityResult.gradeLevel),
            target: 8,
          },
          actions: [
            {
              label: 'Highlight Complex',
              type: 'highlight' as const,
              handler: async () => {
                // Highlight complex sentences in the editor
                if (editor && issue.includes('Sentences are too long')) {
                  // Find long sentences (over 20 words)
                  const text = editor.getText();
                  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
                  
                  // Find first long sentence
                  for (const sentence of sentences) {
                    const words = sentence.trim().split(/\s+/);
                    if (words.length > 20) {
                      const pos = text.indexOf(sentence.trim());
                      if (pos >= 0) {
                        editor.chain()
                          .focus()
                          .setTextSelection({ from: pos, to: pos + sentence.length })
                          .run();
                        return; // Exit after highlighting first long sentence
                      }
                    }
                  }
                }
              },
            },
          ],
          aiActions: [
            {
              label: 'Simplify',
              type: 'simplify',
              requiresAI: true,
            },
          ],
        });
      });

      // Style Analysis with caching
      const styleKey = `style-${document.id}`;
      let styleResult = analysisCache.get<StyleResult>(styleKey);
      
      if (!styleResult) {
        styleResult = styleAnalyzer.current.analyze(text);
        analysisCache.set(styleKey, styleResult);
      }
      
      results.style = styleResult;

      // Convert style issues to suggestions
      styleResult.issues.forEach((issue, index) => {
        allSuggestions.push({
          id: `style-${index}`,
          category: 'style',
          severity: 'suggestion',
          title: issue.type.charAt(0).toUpperCase() + issue.type.slice(1),
          message: issue.reason,
          position: {
            start: issue.index,
            end: issue.index + issue.offset,
          },
          actions: [
            {
              label: 'Highlight',
              type: 'highlight' as const,
              handler: async () => {
                // Highlight the style issue in editor
                if (editor && issue.index >= 0 && issue.offset > 0) {
                  editor.chain()
                    .focus()
                    .setTextSelection({ 
                      from: issue.index, 
                      to: issue.index + issue.offset 
                    })
                    .run();
                }
              },
            },
          ],
          aiActions: [
            {
              label: 'Rewrite',
              type: 'rewrite',
              requiresAI: true,
            },
          ],
        });
      });

      // Calculate scores
      const newScores = {
        grammar: results.grammar?.score || 100,
        readability: Math.min(100, Math.max(0, 100 - Math.abs(readabilityResult.gradeLevel - 8) * 10)),
        seo: results.seo?.score || 100,
        overall: 0,
      };
      newScores.overall = Math.round(
        (newScores.grammar + newScores.readability + newScores.seo) / 3
      );

      setAnalyses(results);
      setSuggestions(allSuggestions);
      setScores(newScores);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []); // No dependencies to avoid recreation

  // Run analysis when debounced text or grammar errors change
  useEffect(() => {
    runAnalysis(debouncedText, grammarErrors, documentRef.current, editorRef.current);
  }, [debouncedText, grammarErrors, runAnalysis]);

  return {
    analyses,
    suggestions,
    scores,
    isAnalyzing: isAnalyzing || isChecking,
    runAnalysis: () => runAnalysis(text, grammarErrors, documentRef.current, editorRef.current),
  };
} 