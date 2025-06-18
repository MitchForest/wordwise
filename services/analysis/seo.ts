import type { JSONContent } from '@tiptap/core'
import { createSuggestion } from '@/lib/editor/suggestion-factory'
import type { UnifiedSuggestion } from '@/types/suggestions'

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

  private addSuggestion(message: string) {
    // SEO suggestions are document-wide and don't have a specific text range (from/to).
    // We use a placeholder range [0, 1] and let the UI handle them as non-actionable list items.
    this.suggestions.push(createSuggestion(0, 1, '', 'seo', 'SEO Suggestion', message, [], 'suggestion'))
  }

  private checkTitle(title: string, targetKeyword?: string): number {
    let score = 100
    if (title.length < 30) {
      this.addSuggestion(`Title is too short. Aim for 30-60 characters (currently ${title.length}).`)
      score -= 30
    } else if (title.length > 60) {
      this.addSuggestion(`Title is too long. Aim for 30-60 characters (currently ${title.length}).`)
      score -= 20
    }

    if (targetKeyword) {
      if (!title.toLowerCase().includes(targetKeyword.toLowerCase())) {
        this.addSuggestion('Target keyword is missing from the title.')
        score -= 40
      } else if (title.toLowerCase().indexOf(targetKeyword.toLowerCase()) > title.length / 2) {
        this.addSuggestion('Move the target keyword earlier in the title for better impact.')
        score -= 10
      }
    }
    return Math.max(0, score)
  }

  private checkMetaDescription(description: string, targetKeyword?: string): number {
    let score = 100
    if (!description) {
      this.addSuggestion('Meta description is missing. This is critical for search appearance.')
      return 0
    }

    if (description.length < 120) {
      this.addSuggestion(`Meta description is too short. Aim for 120-160 characters (currently ${description.length}).`)
      score -= 25
    } else if (description.length > 160) {
      this.addSuggestion(`Meta description is too long and will be cut off by Google (currently ${description.length}).`)
      score -= 20
    }

    if (targetKeyword && !description.toLowerCase().includes(targetKeyword.toLowerCase())) {
      this.addSuggestion('Target keyword is missing from the meta description.')
      score -= 30
    }

    const ctaWords = /learn|discover|find out|read|explore|get/i
    if (!ctaWords.test(description)) {
      this.addSuggestion('Consider adding a call-to-action (e.g., "Learn more") to your meta description.')
      score -= 10
    }

    return Math.max(0, score)
  }

  private analyzeHeadings(headings: { level: number; text: string }[], targetKeyword?: string): number {
    let score = 100
    const h1s = headings.filter((h) => h.level === 1)

    if (h1s.length === 0) {
      this.addSuggestion('The document is missing an H1 tag. Every page should have exactly one H1.')
      score -= 40
    } else if (h1s.length > 1) {
      this.addSuggestion(`There are ${h1s.length} H1 tags. You should only use one H1 per page.`)
      score -= 30
    }

    let lastLevel = 0
    for (const heading of headings) {
      if (heading.level > lastLevel + 1) {
        this.addSuggestion(`Heading structure is illogical. A H${heading.level} appears after a H${lastLevel}.`)
        score -= 15
        break // Only report the first hierarchy issue.
      }
      lastLevel = heading.level
    }

    if (targetKeyword) {
      const keywordInHeading = headings.some((h) => h.text.toLowerCase().includes(targetKeyword.toLowerCase()))
      if (!keywordInHeading) {
        this.addSuggestion('Include your target keyword in at least one subheading (H2, H3, etc.).')
        score -= 20
      }
    }

    return Math.max(0, score)
  }

  private analyzeContent(plainText: string, wordCount: number, numHeadings: number): number {
    let score = 100

    if (wordCount < 300) {
      this.addSuggestion(`Content is too short (${wordCount} words). Aim for at least 300 words for better ranking potential.`)
      score -= 40
    }

    const paragraphs = plainText.split('\n\n').filter((p) => p.trim().length > 0)
    const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 150)
    if (longParagraphs.length > 0) {
      this.addSuggestion(`Break up long paragraphs. At least ${longParagraphs.length} paragraph(s) are over 150 words.`)
      score -= 10
    }

    if (wordCount > 300 && numHeadings < 2) {
      this.addSuggestion('Add more subheadings to break up the text and improve readability.')
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
      this.addSuggestion('Target keyword was not found in the content.')
      return 0
    } else if (density < 0.5) {
      this.addSuggestion(`Keyword density is too low (${density.toFixed(1)}%). Aim for 0.5% to 2%.`)
      score -= 40
    } else if (density > 2.5) {
      this.addSuggestion(`Keyword density is too high (${density.toFixed(1)}%), which can be seen as keyword stuffing. Aim for under 2.5%.`)
      score -= 50
    }

    const firstParagraph = plainText.split('\n\n')[0]
    if (!firstParagraph.toLowerCase().includes(targetKeyword.toLowerCase())) {
      this.addSuggestion('Include the target keyword in the first paragraph.')
      score -= 20
    }

    return Math.max(0, score)
  }
} 