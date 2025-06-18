Essential SEO Checks for Blog Writers
1. Title Optimization (Critical)
```typescript
interface TitleChecks {
  score: number;
  issues: string[];
}

export function checkTitle(title: string, targetKeyword?: string): TitleChecks {
  const issues: string[] = [];
  let score = 100;
  
  // Length check (50-60 chars optimal)
  if (title.length < 30) {
    issues.push("Title too short (min 30 characters)");
    score -= 20;
  } else if (title.length > 60) {
    issues.push("Title too long (max 60 characters)");
    score -= 15;
  }
  
  // Keyword placement
  if (targetKeyword) {
    const keywordPos = title.toLowerCase().indexOf(targetKeyword.toLowerCase());
    if (keywordPos === -1) {
      issues.push("Target keyword missing from title");
      score -= 30;
    } else if (keywordPos > 30) {
      issues.push("Target keyword should appear earlier in title");
      score -= 10;
    }
  }
  
  // Power words/numbers (good for CTR)
  const hasNumber = /\d+/.test(title);
  const powerWords = /ultimate|essential|complete|guide|how to|tips|best/i;
  if (!hasNumber && !powerWords.test(title)) {
    issues.push("Consider adding numbers or power words");
    score -= 10;
  }
  
  return { score: Math.max(0, score), issues };
}
```
2. Meta Description (Important)
```typescript
export function checkMetaDescription(
  description: string, 
  targetKeyword?: string
): MetaChecks {
  const issues: string[] = [];
  let score = 100;
  
  // Length (150-160 optimal)
  if (!description || description.length === 0) {
    issues.push("Meta description missing");
    score = 0;
  } else if (description.length < 120) {
    issues.push("Meta description too short");
    score -= 20;
  } else if (description.length > 160) {
    issues.push("Meta description too long (will be cut off)");
    score -= 15;
  }
  
  // Keyword presence
  if (targetKeyword && description) {
    if (!description.toLowerCase().includes(targetKeyword.toLowerCase())) {
      issues.push("Target keyword missing from meta description");
      score -= 25;
    }
  }
  
  // Call to action
  const ctaWords = /learn|discover|find out|read|explore/i;
  if (description && !ctaWords.test(description)) {
    issues.push("Consider adding a call-to-action");
    score -= 10;
  }
  
  return { score: Math.max(0, score), issues };
}
```
3. Keyword Density (Must Have)
```typescript
interface KeywordDensity {
  density: number;
  count: number;
  score: number;
  issues: string[];
}

export function checkKeywordDensity(
  content: string, 
  targetKeyword: string
): KeywordDensity {
  if (!targetKeyword) return { density: 0, count: 0, score: 100, issues: [] };
  
  const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const keywordRegex = new RegExp(`\\b${targetKeyword.toLowerCase()}\\b`, 'g');
  const matches = content.toLowerCase().match(keywordRegex) || [];
  
  const density = (matches.length / words.length) * 100;
  const issues: string[] = [];
  let score = 100;
  
  // Optimal density: 0.5% - 2%
  if (density === 0) {
    issues.push("Target keyword not found in content");
    score = 0;
  } else if (density < 0.5) {
    issues.push("Keyword density too low (aim for 0.5-2%)");
    score -= 30;
  } else if (density > 2.5) {
    issues.push("Keyword stuffing detected! (keep under 2.5%)");
    score -= 40;
  }
  
  // First paragraph check
  const firstPara = content.split('\n\n')[0];
  if (!firstPara.toLowerCase().includes(targetKeyword.toLowerCase())) {
    issues.push("Add target keyword to first paragraph");
    score -= 20;
  }
  
  return {
    density: Math.round(density * 100) / 100,
    count: matches.length,
    score: Math.max(0, score),
    issues
  };
}
```
4. Heading Structure (High Impact)
```typescript
interface HeadingAnalysis {
  score: number;
  issues: string[];
  h1Count: number;
  totalHeadings: number;
  keywordInHeadings: number;
}

export function analyzeHeadings(
  headings: { level: number; text: string }[],
  targetKeyword?: string
): HeadingAnalysis {
  const issues: string[] = [];
  let score = 100;
  
  // Check H1
  const h1s = headings.filter(h => h.level === 1);
  if (h1s.length === 0) {
    issues.push("Missing H1 tag");
    score -= 30;
  } else if (h1s.length > 1) {
    issues.push("Multiple H1 tags (use only one)");
    score -= 20;
  }
  
  // Check hierarchy
  let lastLevel = 0;
  for (const heading of headings) {
    if (heading.level > lastLevel + 1) {
      issues.push(`Skipped heading level: H${lastLevel} → H${heading.level}`);
      score -= 10;
      break;
    }
    lastLevel = heading.level;
  }
  
  // Keywords in headings
  let keywordInHeadings = 0;
  if (targetKeyword) {
    keywordInHeadings = headings.filter(h => 
      h.text.toLowerCase().includes(targetKeyword.toLowerCase())
    ).length;
    
    if (keywordInHeadings === 0) {
      issues.push("Target keyword not found in any headings");
      score -= 15;
    }
  }
  
  // Heading frequency (should have subheading every 200-300 words)
  if (headings.length < 3) {
    issues.push("Add more subheadings for better structure");
    score -= 10;
  }
  
  return {
    score: Math.max(0, score),
    issues,
    h1Count: h1s.length,
    totalHeadings: headings.length,
    keywordInHeadings
  };
}
```
5. Content Length & Structure
```typescript
interface ContentAnalysis {
  wordCount: number;
  score: number;
  issues: string[];
  readingTime: number;
}

export function analyzeContent(content: string, contentType?: string): ContentAnalysis {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const issues: string[] = [];
  let score = 100;
  
  // Minimum content length
  const minLength = {
    'how-to': 1500,
    'guide': 2000,
    'list': 1000,
    'general': 1000
  };
  
  const expectedLength = minLength[contentType || 'general'] || 1000;
  
  if (wordCount < expectedLength * 0.7) {
    issues.push(`Content too short (aim for ${expectedLength}+ words)`);
    score -= 30;
  } else if (wordCount < expectedLength) {
    issues.push(`Consider expanding content to ${expectedLength}+ words`);
    score -= 15;
  }
  
  // Check paragraph structure
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  const avgParagraphLength = wordCount / paragraphs.length;
  
  if (avgParagraphLength > 150) {
    issues.push("Paragraphs too long (break into 50-150 words)");
    score -= 10;
  }
  
  return {
    wordCount,
    score: Math.max(0, score),
    issues,
    readingTime: Math.ceil(wordCount / 200) // 200 words per minute
  };
}
```
6. Simple LSI Keywords Check
```typescript
// Basic related keywords that should appear
const LSI_KEYWORDS: Record<string, string[]> = {
  'seo': ['search', 'google', 'ranking', 'keywords', 'optimize'],
  'blog': ['post', 'article', 'content', 'readers', 'writing'],
  'marketing': ['audience', 'strategy', 'campaign', 'brand', 'customers'],
  // Add more based on your niche
};

export function checkRelatedKeywords(
  content: string, 
  targetKeyword: string
): { score: number; missing: string[]; found: string[] } {
  const relatedTerms = LSI_KEYWORDS[targetKeyword.toLowerCase()] || [];
  const contentLower = content.toLowerCase();
  
  const found = relatedTerms.filter(term => contentLower.includes(term));
  const missing = relatedTerms.filter(term => !contentLower.includes(term));
  
  const score = relatedTerms.length > 0 
    ? Math.round((found.length / relatedTerms.length) * 100)
    : 100;
  
  return { score, missing, found };
}
```
7. Unified SEO Score
```typescript
export interface SEOAnalysis {
  overall: number;
  breakdown: {
    title: number;
    meta: number;
    keywords: number;
    headings: number;
    content: number;
  };
  topIssues: string[];
}

export function calculateSEOScore(
  title: string,
  metaDescription: string,
  content: string,
  headings: { level: number; text: string }[],
  targetKeyword?: string
): SEOAnalysis {
  // Run all checks
  const titleCheck = checkTitle(title, targetKeyword);
  const metaCheck = checkMetaDescription(metaDescription, targetKeyword);
  const keywordCheck = targetKeyword 
    ? checkKeywordDensity(content, targetKeyword)
    : { score: 100, issues: [] };
  const headingCheck = analyzeHeadings(headings, targetKeyword);
  const contentCheck = analyzeContent(content);
  
  // Weight the scores
  const breakdown = {
    title: titleCheck.score,
    meta: metaCheck.score,
    keywords: keywordCheck.score,
    headings: headingCheck.score,
    content: contentCheck.score
  };
  
  // Calculate weighted overall score
  const overall = Math.round(
    (breakdown.title * 0.25) +
    (breakdown.meta * 0.15) +
    (breakdown.keywords * 0.25) +
    (breakdown.headings * 0.20) +
    (breakdown.content * 0.15)
  );
  
  // Collect all issues, prioritized
  const allIssues = [
    ...titleCheck.issues,
    ...metaCheck.issues,
    ...keywordCheck.issues,
    ...headingCheck.issues,
    ...contentCheck.issues
  ];
  
  return {
    overall,
    breakdown,
    topIssues: allIssues.slice(0, 5) // Show top 5 issues
  };
}
```
Simple Integration Example
```typescript
// In your BlogEditor component
const seoAnalysis = useMemo(() => {
  if (!document) return null;
  
  const content = editor?.getText() || '';
  const headings = extractHeadings(editor?.getJSON());
  
  return calculateSEOScore(
    document.title,
    document.metaDescription,
    content,
    headings,
    document.targetKeyword
  );
}, [document, editor?.state]);

// Display in UI
<div className="seo-score-widget">
  <div className="overall-score" data-score={seoAnalysis.overall}>
    SEO Score: {seoAnalysis.overall}/100
  </div>
  
  <div className="top-issues">
    <h4>Top Issues:</h4>
    {seoAnalysis.topIssues.map(issue => (
      <div key={issue} className="issue">⚠️ {issue}</div>
    ))}
  </div>
  
  <details className="score-breakdown">
    <summary>Score Breakdown</summary>
    <div>Title: {seoAnalysis.breakdown.title}%</div>
    <div>Meta: {seoAnalysis.breakdown.meta}%</div>
    <div>Keywords: {seoAnalysis.breakdown.keywords}%</div>
    <div>Structure: {seoAnalysis.breakdown.headings}%</div>
    <div>Content: {seoAnalysis.breakdown.content}%</div>
  </details>
</div>
```
Why This Gives You 80% of the Value

Title & Meta = 40% of SEO impact (most visible in search results)
Keyword Optimization = 25% of SEO impact (core ranking factor)
Content Structure = 20% of SEO impact (user experience signals)
Content Length = 15% of SEO impact (comprehensiveness signal) 