import type { JSONContent } from '@tiptap/core'
import { createSuggestion } from '@/lib/editor/suggestion-factory'
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

/**
 * @purpose Extracts all heading nodes from Tiptap JSON content.
 * @param content Tiptap JSON content.
 * @returns An array of headings with their level and text content.
 */
function extractHeadings(content: JSONContent): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = []
  if (!content || !content.content) {
    return headings
  }

  function traverse(node: JSONContent) {
    if (node.type === 'heading' && node.attrs) {
      let text = ''
      if (node.content) {
        // Concatenate text from all child text nodes.
        node.content.forEach((child) => {
          if (child.type === 'text') {
            text += child.text || ''
          }
        })
      }
      headings.push({
        level: node.attrs.level,
        text,
      })
    }
    if (node.content) {
      node.content.forEach(traverse)
    }
  }

  traverse(content)
  return headings
}

/**
 * @purpose Analyzes document for SEO best practices.
 * @class SEOAnalyzer
 * @date 2024-07-29 - Initial implementation based on user docs.
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
    const headings = extractHeadings(content)
    const headingScore = this.analyzeHeadings(headings, targetKeyword)
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
    // SEO suggestions are document-wide. We use a fixed string for the `originalText`
    // part of the hash to ensure the ID is stable for the entire document.
    this.suggestions.push(
      createSuggestion(0, 1, '_document_', '', 'seo', subCategory, ruleId, 'SEO Suggestion', message, [], 'suggestion'),
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
        // This is more of a style/best-practice suggestion, less of a hard error.
        // We'll create a new sub-category for this if it becomes necessary. For now, we omit a specific suggestion.
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

  private analyzeHeadings(headings: { level: number; text: string }[], targetKeyword?: string): number {
    let score = 100
    const h1s = headings.filter((h) => h.level === 1)

    if (h1s.length === 0) {
      this.addSuggestion(
        'The document is missing an H1 tag. Every page should have exactly one H1.',
        SEO_SUB_CATEGORY.NO_H1,
        SEO_RULE.NO_H1,
      )
      score -= 40
    } else if (h1s.length > 1) {
      this.addSuggestion(
        `There are ${h1s.length} H1 tags. You should only use one H1 per page.`,
        SEO_SUB_CATEGORY.MULTIPLE_H1S,
        SEO_RULE.MULTIPLE_H1S,
      )
      score -= 30
    }

    let lastLevel = 0
    for (const heading of headings) {
      if (heading.level > lastLevel + 1) {
        this.addSuggestion(
          `Heading structure is illogical. A H${heading.level} appears after a H${lastLevel}.`,
          SEO_SUB_CATEGORY.INVALID_HEADING_SEQUENCE,
          SEO_RULE.INVALID_HEADING_SEQUENCE,
        )
        score -= 15
        break // Only report the first hierarchy issue.
      }
      lastLevel = heading.level
    }

    if (targetKeyword) {
      const keywordInHeading = headings.some((h) => h.text.toLowerCase().includes(targetKeyword.toLowerCase()))
      if (!keywordInHeading) {
        this.addSuggestion(
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
        `Content is too short (${wordCount} words). Aim for at least 300 words for better ranking potential.`,
        SEO_SUB_CATEGORY.CONTENT_TOO_SHORT,
        SEO_RULE.CONTENT_TOO_SHORT,
      )
      score -= 40
    }

    const paragraphs = plainText.split('\n\n').filter((p) => p.trim().length > 0)
    const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 150)
    if (longParagraphs.length > 0) {
      // This is a stylistic suggestion, currently no sub-category for it.
      // this.addSuggestion(`Break up long paragraphs. At least ${longParagraphs.length} paragraph(s) are over 150 words.`)
      score -= 10
    }

    if (wordCount > 300 && numHeadings < 2) {
      // This is a stylistic suggestion, currently no sub-category for it.
      // this.addSuggestion('Add more subheadings to break up the text and improve readability.')
      score -= 10
    }
    return Math.max(0, score)
  }

  private checkKeywordDensity(plainText: string, wordCount: number, targetKeyword?: string): number {
    if (!targetKeyword || wordCount === 0) return 100
    let score = 100

    const keywordRegex = new RegExp(`\\b${targetKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi')
    const matches = plainText.match(keywordRegex) || []
    const density = (matches.length / wordCount) * 100

    if (density === 0) {
      this.addSuggestion(
        'Target keyword was not found in the content.',
        SEO_SUB_CATEGORY.KEYWORD_DENSITY_LOW,
        SEO_RULE.KEYWORD_DENSITY_LOW,
      )
      return 0
    } else if (density < 0.5) {
      this.addSuggestion(
        `Keyword density is too low (${density.toFixed(1)}%). Aim for 0.5% to 2%.`,
        SEO_SUB_CATEGORY.KEYWORD_DENSITY_LOW,
        SEO_RULE.KEYWORD_DENSITY_LOW,
      )
      score -= 40
    } else if (density > 2.5) {
      this.addSuggestion(
        `Keyword density is too high (${density.toFixed(1)}%), which can be seen as keyword stuffing. Aim for under 2.5%.`,
        SEO_SUB_CATEGORY.KEYWORD_DENSITY_HIGH,
        SEO_RULE.KEYWORD_DENSITY_HIGH,
      )
      score -= 50
    }

    const firstParagraph = plainText.split('\n\n')[0]
    if (!firstParagraph.toLowerCase().includes(targetKeyword.toLowerCase())) {
      this.addSuggestion(
        'Target keyword does not appear in the first paragraph.',
        SEO_SUB_CATEGORY.NO_KEYWORD_IN_FIRST_PARAGRAPH,
        SEO_RULE.NO_KEYWORD_IN_FIRST_PARAGRAPH,
      )
      score -= 20
    }

    return Math.max(0, score)
  }
} 