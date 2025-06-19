import type { JSONContent } from '@tiptap/core'
import { createDocumentSuggestion, createSuggestion } from '@/lib/editor/suggestion-factory'
import { UnifiedSuggestion, SEO_SUB_CATEGORY, SEOSubCategory } from '@/types/suggestions'

// Canonical Rule IDs for SEO checks. This ensures stable suggestion IDs.
const SEO_RULE = {
  TITLE_TOO_SHORT: 'seo/title-too-short',
  TITLE_TOO_LONG: 'seo/title-too-long',
  TITLE_MISSING_KEYWORD: 'seo/title-missing-keyword',
  META_MISSING: 'seo/meta-missing',
  META_TOO_SHORT: 'seo/meta-too-short',
  META_TOO_LONG: 'seo/meta-too-long',
  META_MISSING_KEYWORD: 'seo/meta-missing-keyword',
  META_NO_CTA: 'seo/meta-no-cta',
  KEYWORD_DENSITY_LOW: 'seo/keyword-density-low',
  KEYWORD_DENSITY_HIGH: 'seo/keyword-density-high',
  NO_KEYWORD_IN_FIRST_PARAGRAPH: 'seo/no-keyword-in-first-paragraph',
  CONTENT_TOO_SHORT: 'seo/content-too-short',
  NO_H1: 'seo/no-h1',
  MULTIPLE_H1S: 'seo/multiple-h1s',
  INVALID_HEADING_SEQUENCE: 'seo/invalid-heading-sequence',
  HEADING_MISSING_KEYWORD: 'seo/heading-missing-keyword',
} as const;

interface HeadingWithPosition {
  level: number;
  text: string;
  position: { from: number; to: number };
}

/**
 * @purpose Extracts all heading nodes from Tiptap JSON content with positions.
 * @param content Tiptap JSON content.
 * @returns An array of headings with their level, text content, and position.
 */
function extractHeadingsWithPositions(content: JSONContent): HeadingWithPosition[] {
  const headings: HeadingWithPosition[] = []
  if (!content || !content.content) {
    return headings
  }

  // Track position as we traverse
  let currentPos = 0

  function traverse(node: JSONContent) {
    if (node.type === 'heading' && node.attrs) {
      const headingStart = currentPos
      let text = ''
      
      if (node.content) {
        // Concatenate text from all child text nodes
        node.content.forEach((child) => {
          if (child.type === 'text') {
            text += child.text || ''
          }
        })
      }
      
      const headingEnd = headingStart + text.length
      
      headings.push({
        level: node.attrs.level,
        text,
        position: { from: headingStart, to: headingEnd }
      })
    }
    
    // Update position based on node content
    if (node.type === 'text' && node.text) {
      currentPos += node.text.length
    } else if (node.content) {
      // Traverse child nodes
      node.content.forEach(traverse)
    } else if (node.type === 'paragraph' || node.type === 'heading') {
      // Add 1 for block node boundaries
      currentPos += 1
    }
  }

  // Start traversal
  if (content.content) {
    content.content.forEach((node, index) => {
      if (index > 0) {
        // Add 1 for node boundaries between top-level nodes
        currentPos += 1
      }
      traverse(node)
    })
  }

  return headings
}

/**
 * @purpose Analyzes document for SEO best practices.
 * @class SEOAnalyzer
 * @date 2024-07-29 - Initial implementation based on user docs.
 * @modified 2024-12-28 - Added position tracking for heading-related issues
 */
export class SEOAnalyzer {
  private suggestions: UnifiedSuggestion[] = []

  /**
   * @purpose Main analysis function.
   * @param document An object containing all necessary document parts.
   * @returns An object with the final SEO score and an array of suggestions.
   */
  public analyze(document: {
    title: string
    metaDescription: string
    content: JSONContent
    plainText: string
    targetKeyword?: string
  }): { score: number; suggestions: UnifiedSuggestion[] } {
    this.suggestions = []
    const { title, metaDescription, content, plainText, targetKeyword } = document

    // Run all checks and collect their weighted scores
    const titleScore = this.checkTitle(title, targetKeyword)
    const metaScore = this.checkMetaDescription(metaDescription, targetKeyword)
    const headings = extractHeadingsWithPositions(content)
    const headingScore = this.analyzeHeadings(headings, plainText, targetKeyword)
    const wordCount = plainText.split(/\s+/).filter(Boolean).length
    const contentScore = this.analyzeContent(plainText, wordCount, headings.length)
    const keywordScore = this.checkKeywordDensity(plainText, wordCount, targetKeyword)

    // Calculate final weighted score
    const totalScore = Math.round(
      titleScore * 0.25 +
        metaScore * 0.15 +
        keywordScore * 0.25 +
        headingScore * 0.2 +
        contentScore * 0.15,
    )

    return {
      score: Math.max(0, Math.min(100, totalScore)),
      suggestions: this.suggestions,
    }
  }

  private addSuggestion(message: string, subCategory: SEOSubCategory, ruleId: string) {
    // SEO suggestions are document-wide. By passing `undefined` for the position,
    // we ensure they will be sorted to the bottom of the suggestions list.
    this.suggestions.push(
      createDocumentSuggestion('seo', subCategory, ruleId, 'SEO Suggestion', message, [], 'suggestion'),
    )
  }

  private addPositionedSuggestion(
    from: number,
    to: number,
    originalText: string,
    documentText: string,
    message: string,
    subCategory: SEOSubCategory,
    ruleId: string
  ) {
    this.suggestions.push(
      createSuggestion(
        from,
        to,
        originalText,
        documentText,
        'seo',
        subCategory,
        ruleId,
        'SEO Suggestion',
        message,
        [],
        'suggestion'
      )
    )
  }

  private checkTitle(title: string, targetKeyword?: string): number {
    let score = 100
    if (title.length < 30) {
      this.addSuggestion(
        `Title is too short. Aim for 30-60 characters (currently ${title.length}).`,
        SEO_SUB_CATEGORY.TITLE_TOO_SHORT,
        SEO_RULE.TITLE_TOO_SHORT,
      )
      score -= 30
    } else if (title.length > 60) {
      this.addSuggestion(
        `Title is too long. Aim for 30-60 characters (currently ${title.length}).`,
        SEO_SUB_CATEGORY.TITLE_TOO_LONG,
        SEO_RULE.TITLE_TOO_LONG,
      )
      score -= 20
    }

    if (targetKeyword) {
      if (!title.toLowerCase().includes(targetKeyword.toLowerCase())) {
        this.addSuggestion(
          'Target keyword is missing from the title.',
          SEO_SUB_CATEGORY.TITLE_MISSING_KEYWORD,
          SEO_RULE.TITLE_MISSING_KEYWORD,
        )
        score -= 40
      } else if (title.toLowerCase().indexOf(targetKeyword.toLowerCase()) > title.length / 2) {
        score -= 10
      }
    }
    return Math.max(0, score)
  }

  private checkMetaDescription(description: string, targetKeyword?: string): number {
    let score = 100
    if (!description) {
      this.addSuggestion(
        'Meta description is missing. This is critical for search appearance.',
        SEO_SUB_CATEGORY.META_MISSING,
        SEO_RULE.META_MISSING,
      )
      return 0
    }

    if (description.length < 120) {
      this.addSuggestion(
        `Meta description is too short. Aim for 120-160 characters (currently ${description.length}).`,
        SEO_SUB_CATEGORY.META_TOO_SHORT,
        SEO_RULE.META_TOO_SHORT,
      )
      score -= 25
    } else if (description.length > 160) {
      this.addSuggestion(
        `Meta description is too long and will be cut off by Google (currently ${description.length}).`,
        SEO_SUB_CATEGORY.META_TOO_LONG,
        SEO_RULE.META_TOO_LONG,
      )
      score -= 20
    }

    if (targetKeyword && !description.toLowerCase().includes(targetKeyword.toLowerCase())) {
      this.addSuggestion(
        'Target keyword is missing from the meta description.',
        SEO_SUB_CATEGORY.META_MISSING_KEYWORD,
        SEO_RULE.META_MISSING_KEYWORD,
      )
      score -= 30
    }

    const ctaWords = /learn|discover|find out|read|explore|get/i
    if (!ctaWords.test(description)) {
      this.addSuggestion(
        'Consider adding a call-to-action (e.g., "Learn more") to your meta description.',
        SEO_SUB_CATEGORY.META_NO_CTA,
        SEO_RULE.META_NO_CTA,
      )
      score -= 10
    }

    return Math.max(0, score)
  }

  private analyzeHeadings(headings: HeadingWithPosition[], plainText: string, targetKeyword?: string): number {
    let score = 100
    const h1s = headings.filter((h) => h.level === 1)

    if (h1s.length === 0) {
      // For missing H1, suggest adding it at the beginning of the document
      this.addPositionedSuggestion(
        0,
        0,
        '',
        plainText,
        'The document is missing an H1 tag. Every page should have exactly one H1.',
        SEO_SUB_CATEGORY.NO_H1,
        SEO_RULE.NO_H1,
      )
      score -= 40
    } else if (h1s.length > 1) {
      // For multiple H1s, highlight each one
      h1s.forEach((h1, index) => {
        this.addPositionedSuggestion(
          h1.position.from,
          h1.position.to,
          h1.text,
          plainText,
          `H1 #${index + 1} of ${h1s.length}. You should only use one H1 per page.`,
          SEO_SUB_CATEGORY.MULTIPLE_H1S,
          SEO_RULE.MULTIPLE_H1S,
        )
      })
      score -= 30
    }

    let lastLevel = 0
    for (const heading of headings) {
      if (heading.level > lastLevel + 1) {
        this.addPositionedSuggestion(
          heading.position.from,
          heading.position.to,
          heading.text,
          plainText,
          `Heading structure is illogical. A H${heading.level} appears after a H${lastLevel}.`,
          SEO_SUB_CATEGORY.INVALID_HEADING_SEQUENCE,
          SEO_RULE.INVALID_HEADING_SEQUENCE,
        )
        score -= 15
        break 
      }
      lastLevel = heading.level
    }

    if (targetKeyword && headings.length > 0) {
      const headingsWithoutKeyword = headings.filter(
        (h) => !h.text.toLowerCase().includes(targetKeyword.toLowerCase())
      )
      
      // If no heading contains the keyword, highlight the first heading as a suggestion
      if (headingsWithoutKeyword.length === headings.length) {
        const firstHeading = headings[0]
        this.addPositionedSuggestion(
          firstHeading.position.from,
          firstHeading.position.to,
          firstHeading.text,
          plainText,
          'Include your target keyword in at least one subheading (H2, H3, etc.).',
          SEO_SUB_CATEGORY.HEADING_MISSING_KEYWORD,
          SEO_RULE.HEADING_MISSING_KEYWORD,
        )
        score -= 20
      }
    }

    return Math.max(0, score)
  }

  private analyzeContent(plainText: string, wordCount: number, numHeadings: number): number {
    let score = 100
    if (wordCount < 300) {
      this.addSuggestion(
        `Content is too short. Aim for at least 300 words (currently ${wordCount}).`,
        SEO_SUB_CATEGORY.CONTENT_TOO_SHORT,
        SEO_RULE.CONTENT_TOO_SHORT,
      )
      score -= 30
    }

    if (numHeadings > 0 && wordCount / numHeadings > 250) {
      this.addSuggestion(
        'Consider breaking up long sections of text with more subheadings.',
        SEO_SUB_CATEGORY.INVALID_HEADING_SEQUENCE,
        SEO_RULE.INVALID_HEADING_SEQUENCE,
      )
      score -= 10
    }
    return Math.max(0, score)
  }

  private checkKeywordDensity(plainText: string, wordCount: number, targetKeyword?: string): number {
    if (!targetKeyword || wordCount === 0) {
      return 100
    }

    const keywordRegex = new RegExp(`\\b${targetKeyword.toLowerCase()}\\b`, 'g')
    const matches = plainText.toLowerCase().match(keywordRegex)
    const count = matches ? matches.length : 0
    const density = (count / wordCount) * 100

    let score = 100
    if (density < 0.5) {
      this.addSuggestion(
        `Target keyword density is low (${density.toFixed(2)}%). Aim for 0.5% to 2%.`,
        SEO_SUB_CATEGORY.KEYWORD_DENSITY_LOW,
        SEO_RULE.KEYWORD_DENSITY_LOW,
      )
      score -= 25
    } else if (density > 2.5) {
      this.addSuggestion(
        `Keyword density is high (${density.toFixed(2)}%). This can be seen as "keyword stuffing".`,
        SEO_SUB_CATEGORY.KEYWORD_DENSITY_HIGH,
        SEO_RULE.KEYWORD_DENSITY_HIGH,
      )
      score -= 30
    }

    // Find first paragraph
    const firstParagraphEnd = plainText.indexOf('\n\n') > -1 ? plainText.indexOf('\n\n') : plainText.length
    const firstParagraph = plainText.substring(0, firstParagraphEnd)
    
    if (!firstParagraph.toLowerCase().includes(targetKeyword.toLowerCase())) {
      // Position the suggestion at the first paragraph
      this.addPositionedSuggestion(
        0,
        firstParagraphEnd,
        firstParagraph,
        plainText,
        'Include the target keyword within the first paragraph.',
        SEO_SUB_CATEGORY.NO_KEYWORD_IN_FIRST_PARAGRAPH,
        SEO_RULE.NO_KEYWORD_IN_FIRST_PARAGRAPH,
      )
      score -= 15
    }

    return Math.max(0, score)
  }
} 
