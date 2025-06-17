'use client';

import { Progress } from '@/components/ui/progress';
import { ChevronRight, Search, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalysisPanelProps {
  content: string;
  title: string;
  metaDescription: string;
}

interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
}

export function AnalysisPanel({ content, title, metaDescription }: AnalysisPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Calculate mock scores
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;

  const seoScore = Math.min(100, 
    (title.length > 0 ? 20 : 0) +
    (metaDescription.length > 0 ? 20 : 0) +
    (wordCount > 300 ? 30 : wordCount / 10) +
    (title.length < 60 ? 15 : 0) +
    (metaDescription.length > 50 && metaDescription.length < 160 ? 15 : 0)
  );

  const readabilityScore = Math.min(100,
    (avgWordsPerSentence < 20 ? 40 : 20) +
    (wordCount > 100 ? 30 : wordCount / 3.33) +
    30 // Base score
  );

  const grammarScore = 95; // Mock score

  const overallScore = Math.round((seoScore + readabilityScore + grammarScore) / 3);

  const breakdowns: Record<string, ScoreBreakdown> = {
    seo: {
      category: 'SEO',
      score: seoScore,
      maxScore: 100,
      issues: [
        ...(title.length === 0 ? ['Missing page title'] : []),
        ...(title.length > 60 ? ['Title too long (60 char max)'] : []),
        ...(metaDescription.length === 0 ? ['Missing meta description'] : []),
        ...(wordCount < 300 ? ['Content too short (300+ words recommended)'] : []),
      ],
      suggestions: [
        'Add focus keywords to your title',
        'Include related keywords naturally',
        'Add internal and external links',
        'Optimize images with alt text',
      ],
    },
    readability: {
      category: 'Readability',
      score: readabilityScore,
      maxScore: 100,
      issues: [
        ...(avgWordsPerSentence > 20 ? ['Sentences are too long'] : []),
        ...(wordCount < 100 ? ['Content is very short'] : []),
      ],
      suggestions: [
        'Break long sentences into shorter ones',
        'Use subheadings to organize content',
        'Add bullet points for lists',
        'Use simple, clear language',
      ],
    },
    grammar: {
      category: 'Grammar',
      score: grammarScore,
      maxScore: 100,
      issues: [],
      suggestions: [
        'Run spell check',
        'Check for passive voice',
        'Ensure consistent tense',
      ],
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Overall Score */}
      <div className="p-6 border-b border-neutral-200 bg-white">
        <div className="text-center">
          <div className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
            {overallScore}
          </div>
          <p className="text-gray-600 mt-1">Overall Score</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          {Object.entries(breakdowns).map(([key, breakdown]) => (
            <div key={key} className="text-center">
              <div className={`text-2xl font-semibold ${getScoreColor(breakdown.score)}`}>
                {breakdown.score}
              </div>
              <p className="text-xs text-gray-600">{breakdown.category}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Breakdowns */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(breakdowns).map(([key, breakdown]) => (
          <div key={key} className="border-b border-neutral-200">
            <button
              onClick={() => setExpandedSection(expandedSection === key ? null : key)}
              className="w-full p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {key === 'seo' && <Search className="h-5 w-5 text-gray-600" />}
                  {key === 'readability' && <BookOpen className="h-5 w-5 text-gray-600" />}
                  {key === 'grammar' && <CheckCircle className="h-5 w-5 text-gray-600" />}
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">{breakdown.category}</h3>
                    <p className="text-sm text-gray-500">
                      {breakdown.issues.length} issues found
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`font-semibold ${getScoreColor(breakdown.score)}`}>
                      {breakdown.score}/{breakdown.maxScore}
                    </div>
                  </div>
                  <ChevronRight 
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      expandedSection === key ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>
              
              <div className="mt-3">
                <div className={`rounded-full overflow-hidden ${
                  breakdown.score >= 80 ? 'bg-green-100' : 
                  breakdown.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <Progress 
                    value={breakdown.score} 
                    className={`h-2 ${
                      breakdown.score >= 80 ? '[&>*]:bg-green-500' : 
                      breakdown.score >= 60 ? '[&>*]:bg-yellow-500' : '[&>*]:bg-red-500'
                    }`}
                  />
                </div>
              </div>
            </button>

            <AnimatePresence>
              {expandedSection === key && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4">
                    {breakdown.issues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm text-gray-900 mb-2">Issues</h4>
                        <ul className="space-y-1">
                          {breakdown.issues.map((issue, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-red-600">
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 mb-2">Suggestions</h4>
                      <ul className="space-y-1">
                        {breakdown.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-blue-500">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Stats Footer */}
      <div className="p-4 bg-gray-50 border-t border-neutral-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Words:</span>
            <span className="ml-2 font-medium">{wordCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Sentences:</span>
            <span className="ml-2 font-medium">{sentenceCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Avg words/sentence:</span>
            <span className="ml-2 font-medium">{avgWordsPerSentence}</span>
          </div>
          <div>
            <span className="text-gray-500">Reading time:</span>
            <span className="ml-2 font-medium">{Math.ceil(wordCount / 200)} min</span>
          </div>
        </div>
      </div>
    </div>
  );
} 