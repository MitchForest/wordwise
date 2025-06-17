import { Editor } from '@tiptap/react';
import type { UnifiedSuggestion } from '@/types/suggestions';

/**
 * Improved position mapping utilities for reliable text position conversion
 */

export interface PositionRange {
  from: number;
  to: number;
}

/**
 * Convert plain text positions to ProseMirror positions with multiple fallback strategies
 */
export function findSuggestionPosition(
  editor: Editor,
  suggestion: UnifiedSuggestion
): PositionRange | null {
  // Strategy 1: Direct position mapping
  const directResult = tryDirectMapping(editor, suggestion);
  if (directResult && isValidRange(editor, directResult)) {
    return directResult;
  }

  // Strategy 2: Search-based mapping using the error text
  const searchResult = trySearchMapping(editor, suggestion);
  if (searchResult && isValidRange(editor, searchResult)) {
    return searchResult;
  }

  // Strategy 3: Context-based mapping using surrounding text
  const contextResult = tryContextMapping(editor, suggestion);
  if (contextResult && isValidRange(editor, contextResult)) {
    return contextResult;
  }

  return null;
}

/**
 * Direct position mapping using the existing position mapper
 */
function tryDirectMapping(
  editor: Editor,
  suggestion: UnifiedSuggestion
): PositionRange | null {
  if (!suggestion.position?.start) return null;

  const { textMapping } = extractTextWithMapping(editor);
  const from = plainTextToProseMirrorPosition(textMapping, suggestion.position.start);
  const to = plainTextToProseMirrorPosition(
    textMapping,
    suggestion.position.end || suggestion.position.start + 1
  );

  if (from === -1 || to === -1) return null;
  return { from, to };
}

/**
 * Search-based position mapping using the suggestion text
 */
function trySearchMapping(
  editor: Editor,
  suggestion: UnifiedSuggestion
): PositionRange | null {
  if (!suggestion.context?.text) return null;

  const searchText = suggestion.context.text;
  const editorText = editor.state.doc.textContent;
  
  // Find all occurrences of the text
  const occurrences: PositionRange[] = [];
  let index = 0;
  
  while ((index = editorText.indexOf(searchText, index)) !== -1) {
    // Convert plain text position to ProseMirror position
    const from = plainTextIndexToProseMirror(editor, index);
    const to = plainTextIndexToProseMirror(editor, index + searchText.length);
    
    if (from !== -1 && to !== -1) {
      occurrences.push({ from, to });
    }
    index += searchText.length;
  }

  // If we have the offset from the suggestion, use it to pick the right occurrence
  if (suggestion.position?.start && occurrences.length > 0) {
    // Find the closest match to the expected position
    return occurrences.reduce((closest, current) => {
      const currentDiff = Math.abs(current.from - suggestion.position!.start);
      const closestDiff = Math.abs(closest.from - suggestion.position!.start);
      return currentDiff < closestDiff ? current : closest;
    });
  }

  // Return the first occurrence if no position hint
  return occurrences[0] || null;
}

/**
 * Context-based mapping using surrounding text
 */
function tryContextMapping(
  editor: Editor,
  suggestion: UnifiedSuggestion
): PositionRange | null {
  if (!suggestion.context?.text || !suggestion.context?.length) return null;

  const errorText = suggestion.context.text;
  const errorLength = suggestion.context.length || errorText.length;
  
  // Try to find the text with some context
  const beforeContext = suggestion.context.before || '';
  const afterContext = suggestion.context.after || '';
  const fullContext = beforeContext + errorText + afterContext;
  
  const editorText = editor.state.doc.textContent;
  const contextIndex = editorText.indexOf(fullContext);
  
  if (contextIndex !== -1) {
    const errorStart = contextIndex + beforeContext.length;
    const from = plainTextIndexToProseMirror(editor, errorStart);
    const to = plainTextIndexToProseMirror(editor, errorStart + errorLength);
    
    if (from !== -1 && to !== -1) {
      return { from, to };
    }
  }

  return null;
}

/**
 * Convert a plain text index to ProseMirror position
 */
function plainTextIndexToProseMirror(editor: Editor, plainIndex: number): number {
  let currentIndex = 0;
  let proseMirrorPos = 0;

  editor.state.doc.descendants((node, pos) => {
    if (currentIndex >= plainIndex) return false;

    if (node.isText) {
      const nodeLength = node.text?.length || 0;
      if (currentIndex + nodeLength >= plainIndex) {
        proseMirrorPos = pos + (plainIndex - currentIndex);
        return false;
      }
      currentIndex += nodeLength;
    } else if (node.isBlock && currentIndex > 0) {
      // Count block breaks as single characters
      currentIndex += 1;
    }

    return true;
  });

  return proseMirrorPos;
}

/**
 * Validate that a position range is valid within the document
 */
function isValidRange(editor: Editor, range: PositionRange): boolean {
  const { from, to } = range;
  const docSize = editor.state.doc.content.size;
  
  return (
    from >= 0 &&
    to >= 0 &&
    from <= docSize &&
    to <= docSize &&
    from <= to
  );
}

/**
 * Extract text with position mapping (existing function, improved)
 */
export function extractTextWithMapping(editor: Editor) {
  const textMapping: Array<{ plain: number; proseMirror: number }> = [];
  let plainTextOffset = 0;
  let text = '';

  editor.state.doc.descendants((node, pos) => {
    if (node.isText) {
      const nodeText = node.text || '';
      // Record mapping for each character
      for (let i = 0; i < nodeText.length; i++) {
        textMapping.push({
          plain: plainTextOffset + i,
          proseMirror: pos + i,
        });
      }
      text += nodeText;
      plainTextOffset += nodeText.length;
    } else if (node.isBlock && pos > 0) {
      // Add newline for block nodes
      textMapping.push({
        plain: plainTextOffset,
        proseMirror: pos,
      });
      text += '\n';
      plainTextOffset += 1;
    }
    return true;
  });

  return { text, textMapping };
}

/**
 * Convert plain text position to ProseMirror position using mapping
 */
export function plainTextToProseMirrorPosition(
  mapping: Array<{ plain: number; proseMirror: number }>,
  plainPos: number
): number {
  // Binary search for efficiency
  let left = 0;
  let right = mapping.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const entry = mapping[mid];

    if (entry.plain === plainPos) {
      return entry.proseMirror;
    } else if (entry.plain < plainPos) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // If exact match not found, return the closest position
  if (right >= 0 && right < mapping.length) {
    const entry = mapping[right];
    const offset = plainPos - entry.plain;
    return entry.proseMirror + offset;
  }

  return -1;
}

/**
 * Apply a fix at the given position with proper error handling
 */
export async function applyFixAtPosition(
  editor: Editor,
  suggestion: UnifiedSuggestion,
  fix: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const position = findSuggestionPosition(editor, suggestion);
    if (!position) {
      return { 
        success: false, 
        error: 'Could not locate the text to fix. It may have been modified.' 
      };
    }

    // Store current selection to restore later
    const currentSelection = editor.state.selection;

    // Apply the fix
    editor
      .chain()
      .focus()
      .setTextSelection(position)
      .deleteRange(position)
      .insertContent(fix)
      .run();

    // Optionally restore selection
    if (currentSelection) {
      // Adjust selection if it was after the fixed text
      const selectionFrom = currentSelection.from;
      const diff = fix.length - (position.to - position.from);
      
      if (selectionFrom > position.to) {
        editor.commands.setTextSelection({
          from: selectionFrom + diff,
          to: currentSelection.to + diff,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to apply fix:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}