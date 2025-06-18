declare module 'text-readability' {
  export function fleschReadingEase(text: string): number;
  export function fleschKincaidGrade(text: string): number;
  export function gunningFog(text: string): number;
  export function colemanLiauIndex(text: string): number;
  export function automatedReadabilityIndex(text: string): number;
  export function linsearWriteFormula(text: string): number;
  export function daleChallReadabilityScore(text: string): number;
  export function difficultWords(text: string): number;
  export function syllableCount(text: string): number;
  export function lexiconCount(text: string): number;
  export function sentenceCount(text: string): number;
}

declare module 'write-good' {
  interface Suggestion {
    index: number;
    offset: number;
    reason: string;
  }
  
  function writeGood(text: string, options?: any): Suggestion[];
  export = writeGood;
}

declare module 'string-similarity' {
  export function compareTwoStrings(first: string, second: string): number;
  export function findBestMatch(mainString: string, targetStrings: string[]): {
    ratings: Array<{ target: string; rating: number }>;
    bestMatch: { target: string; rating: number };
    bestMatchIndex: number;
  };
}

declare module 'nspell' {
  export interface Dictionary {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): void;
  }
  
  function nspell(dictionary: any): Dictionary;
  export default nspell;
}

declare module 'dictionary-en';

declare module 'text-statistics'; 