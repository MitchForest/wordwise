/**
 * Position mapping utilities to convert between plain text positions and ProseMirror positions
 * 
 * The issue: 
 * - SpellChecker and other analyzers work on plain text (getText()) and return character offsets
 * - ProseMirror uses a different position system that accounts for node boundaries
 * - Direct use of plain text positions in ProseMirror causes incorrect highlighting and text selection
 */

import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface TextNodeMapping {
  plainTextStart: number;  // Position in plain text
  plainTextEnd: number;    // End position in plain text
  pmStart: number;         // Start position in ProseMirror document
  pmEnd: number;           // End position in ProseMirror document
  text: string;            // The actual text content
}

export interface TextExtractionResult {
  text: string;
  mappings: TextNodeMapping[];
}

/**
 * Extract text from editor with position mappings
 * This preserves the relationship between plain text positions and ProseMirror positions
 */
export function extractTextWithMapping(editor: Editor): TextExtractionResult {
  const doc = editor.state.doc;
  let plainTextPos = 0;
  const mappings: TextNodeMapping[] = [];
  let fullText = '';
  
  // Walk through all nodes in the document
  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.isText && node.text) {
      const mapping: TextNodeMapping = {
        plainTextStart: plainTextPos,
        plainTextEnd: plainTextPos + node.text.length,
        pmStart: pos,
        pmEnd: pos + node.text.length,
        text: node.text,
      };
      
      mappings.push(mapping);
      fullText += node.text;
      plainTextPos += node.text.length;
    }
    // Note: We're not adding line breaks between paragraphs to match getText() behavior
  });
  
  // Debug logging when mappings are created
  if (process.env.NODE_ENV === 'development' && mappings.length > 0) {
    console.debug('Position mappings created:', {
      textLength: fullText.length,
      mappingCount: mappings.length,
      firstMapping: mappings[0],
      lastMapping: mappings[mappings.length - 1],
    });
  }
  
  return { text: fullText, mappings };
}

/**
 * Convert a plain text position to a ProseMirror position
 * @param plainTextPos Position in the plain text (from spell checker, etc.)
 * @param mappings The position mappings from extractTextWithMapping
 * @returns The corresponding ProseMirror position, or -1 if not found
 */
export function plainTextToProseMirrorPosition(
  plainTextPos: number,
  mappings: TextNodeMapping[]
): number {
  // Binary search for efficiency with large documents
  let left = 0;
  let right = mappings.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const mapping = mappings[mid];
    
    if (plainTextPos >= mapping.plainTextStart && plainTextPos <= mapping.plainTextEnd) {
      // Found the mapping - calculate the offset within the text node
      const offset = plainTextPos - mapping.plainTextStart;
      return mapping.pmStart + offset;
    }
    
    if (plainTextPos < mapping.plainTextStart) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  // Position not found - this might happen if the text has changed
  console.warn(`Could not map plain text position ${plainTextPos} to ProseMirror position`, {
    plainTextPos,
    mappingsCount: mappings.length,
    mappingsRange: mappings.length > 0 ? {
      start: mappings[0].plainTextStart,
      end: mappings[mappings.length - 1].plainTextEnd,
    } : null,
  });
  return -1;
}

/**
 * Convert a range from plain text positions to ProseMirror positions
 */
export function plainTextRangeToProseMirror(
  start: number,
  end: number,
  mappings: TextNodeMapping[]
): { from: number; to: number } | null {
  const from = plainTextToProseMirrorPosition(start, mappings);
  const to = plainTextToProseMirrorPosition(end, mappings);
  
  if (from === -1 || to === -1) {
    return null;
  }
  
  return { from, to };
}

/**
 * Helper to convert spell check results to use ProseMirror positions
 */
export function convertSpellCheckPositions(
  spellCheckResults: any[],
  mappings: TextNodeMapping[]
): any[] {
  return spellCheckResults.map(result => {
    const pmPos = plainTextToProseMirrorPosition(result.position, mappings);
    if (pmPos === -1) {
      console.warn(`Skipping spell check result at position ${result.position} - could not map to ProseMirror`);
      return null;
    }
    
    return {
      ...result,
      pmPosition: pmPos,
      pmEnd: pmPos + result.length,
    };
  }).filter(Boolean);
}

/**
 * Validates if a ProseMirror position range is valid for the current document
 */
export function isValidProseMirrorRange(
  editor: Editor,
  from: number,
  to: number
): boolean {
  const docSize = editor.state.doc.content.size;
  return from >= 0 && to <= docSize && from < to;
}