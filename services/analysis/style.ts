/**
 * @file services/analysis/style.ts
 * @purpose Analyzes document style using write-good library
 * @modified 2024-12-28 - Updated to use text-based suggestions
 */
import writeGood from 'write-good';
import { UnifiedSuggestion, STYLE_SUB_CATEGORY, StyleSubCategory } from '@/types/suggestions';
import { createSuggestion } from '@/lib/editor/suggestion-factory';

// The type definitions for 'write-good' are incorrect, so we use a direct require.
const writeGoodSuggestions = require('write-good');

interface WriteGoodSuggestion {
  index: number;
  offset: number;
  reason: string;
}

const removableWords = [
  'is a weasel word',
  'is a word to avoid',
  'is redundant',
];

function mapReasonToSubCategory(reason: string): StyleSubCategory {
  const lowerCaseReason = reason.toLowerCase();
  if (lowerCaseReason.includes('passive voice')) return STYLE_SUB_CATEGORY.PASSIVE_VOICE;
  if (lowerCaseReason.includes('weasel word')) return STYLE_SUB_CATEGORY.WEASEL_WORDS;
  if (lowerCaseReason.includes('lexical illusion')) return STYLE_SUB_CATEGORY.LEXICAL_ILLUSIONS;
  if (lowerCaseReason.includes('cliche')) return STYLE_SUB_CATEGORY.CLICHE;
  if (lowerCaseReason.includes('so the sentence starts')) return STYLE_SUB_CATEGORY.SO_START;
  // Default to a general style sub-category if no specific match is found.
  return STYLE_SUB_CATEGORY.ADVERB_USAGE; 
}

function mapReasonToRuleId(reason: string): string {
  const subCategory = mapReasonToSubCategory(reason);
  // Create a ruleId from the sub-category, e.g., 'style/passive-voice'
  return `style/${subCategory}`;
}

export class StyleAnalyzer {
  public run(doc: any, documentText: string): UnifiedSuggestion[] {
    if (!doc || !doc.content) {
      return [];
    }

    const suggestions: UnifiedSuggestion[] = [];

    doc.descendants((node: any, pos: number) => {
      if (!node.isText || !node.text) {
        return;
      }

      const text = node.text;
      const results: WriteGoodSuggestion[] = writeGoodSuggestions(text);

      results.forEach((suggestion) => {
        const from = pos + suggestion.index;
        const to = from + suggestion.offset;
        const errorText = text.substring(suggestion.index, suggestion.index + suggestion.offset);
        const subCategory = mapReasonToSubCategory(suggestion.reason);
        const ruleId = mapReasonToRuleId(suggestion.reason);

        // Check if the suggestion is for a word that can be simply removed.
        const isRemovable = removableWords.some(phrase => suggestion.reason.includes(phrase));
        
        const actions = [];
        if (isRemovable) {
          actions.push({
            label: `Remove "${errorText.trim()}"`,
            type: 'fix' as const,
            value: '', // Replacing with nothing effectively removes it.
            handler: () => {}, // Placeholder
          });
        }

        suggestions.push(
          createSuggestion(
            from,
            to,
            errorText,
            documentText,
            'style',
            subCategory,
            ruleId,
            'Style Suggestion',
            suggestion.reason,
            actions,
            'suggestion'
          )
        );
      });
    });

    return suggestions;
  }
} 