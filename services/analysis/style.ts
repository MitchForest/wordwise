import writeGood from 'write-good';
import { UnifiedSuggestion } from '@/types/suggestions';

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

export class StyleAnalyzer {
  public run(doc: any): UnifiedSuggestion[] {
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

        suggestions.push({
          id: `style-${from}-${suggestion.reason.replace(/\s/g, '-')}`,
          category: 'style',
          severity: 'suggestion',
          title: 'Style Suggestion',
          message: suggestion.reason,
          position: { start: from, end: to },
          context: { text: errorText },
          actions,
        });
      });
    });

    return suggestions;
  }
} 