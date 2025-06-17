'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import type { UnifiedSuggestion } from '@/types/suggestions';

interface SuggestionsPanelProps {
  suggestions: UnifiedSuggestion[];
  isAnalyzing: boolean;
  onApplySuggestion: (suggestion: UnifiedSuggestion, action: UnifiedSuggestion['actions'][0]) => void;
  scores: {
    grammar: number;
    readability: number;
    seo: number;
    overall: number;
  };
}

export function SuggestionsPanel({ 
  suggestions, 
  isAnalyzing,
  onApplySuggestion,
  scores
}: SuggestionsPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['grammar', 'readability', 'seo', 'style'])
  );
  const [hiddenSuggestions, setHiddenSuggestions] = useState<Set<string>>(new Set());

  // Group suggestions by category
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, UnifiedSuggestion[]> = {
      grammar: [],
      readability: [],
      seo: [],
      style: [],
    };

    suggestions
      .filter(s => !hiddenSuggestions.has(s.id))
      .forEach(suggestion => {
        groups[suggestion.category]?.push(suggestion);
      });

    return groups;
  }, [suggestions, hiddenSuggestions]);

  // Category metadata
  const categoryMeta = {
    grammar: {
      icon: '✏️',
      title: 'Grammar & Spelling',
      color: 'red',
      description: 'Fix errors and improve clarity',
    },
    readability: {
      icon: '📖',
      title: 'Readability',
      color: 'yellow',
      description: 'Make your content easier to read',
    },
    seo: {
      icon: '🎯',
      title: 'SEO Optimization',
      color: 'green',
      description: 'Improve search visibility',
    },
    style: {
      icon: '✨',
      title: 'Writing Style',
      color: 'purple',
      description: 'Enhance tone and flow',
    },
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleIgnoreSuggestion = (suggestionId: string) => {
    setHiddenSuggestions(prev => new Set([...prev, suggestionId]));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Overall Score Header */}
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Writing Score</h3>
          <div className="w-16 h-16">
            <CircularProgressbar
              value={scores.overall}
              text={`${scores.overall}`}
              styles={{
                path: { 
                  stroke: scores.overall > 80 ? '#10b981' : 
                         scores.overall > 60 ? '#f59e0b' : '#ef4444' 
                },
                text: { fontSize: '24px', fontWeight: 'bold' },
              }}
            />
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="font-medium">{scores.grammar}</div>
            <div className="text-gray-500 text-xs">Grammar</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{scores.readability}</div>
            <div className="text-gray-500 text-xs">Readability</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{scores.seo}</div>
            <div className="text-gray-500 text-xs">SEO</div>
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto">
        {isAnalyzing && (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-pulse">Analyzing your content...</div>
          </div>
        )}

        {Object.entries(groupedSuggestions).map(([category, categorySuggestions]) => {
          const meta = categoryMeta[category as keyof typeof categoryMeta];
          const isExpanded = expandedCategories.has(category);
          const hasIssues = categorySuggestions.length > 0;

          return (
            <div key={category} className="border-b">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">{meta.title}</h4>
                      <p className="text-xs text-gray-500">{meta.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasIssues && (
                      <Badge variant={categorySuggestions.some(s => s.severity === 'error') ? 'destructive' : 'secondary'}>
                        {categorySuggestions.length}
                      </Badge>
                    )}
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>
              </button>

              {/* Category Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {categorySuggestions.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="text-sm">No issues found!</p>
                        </div>
                      ) : (
                        <>
                          {/* Batch Actions */}
                          {categorySuggestions.filter(s => s.actions.some(a => a.type === 'fix')).length > 0 && (
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  categorySuggestions.forEach(suggestion => {
                                    const fixAction = suggestion.actions.find(a => a.type === 'fix');
                                    if (fixAction) {
                                      onApplySuggestion(suggestion, fixAction);
                                    }
                                  });
                                }}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Fix All ({categorySuggestions.filter(s => s.actions.some(a => a.type === 'fix')).length})
                              </Button>
                            </div>
                          )}

                          {/* Individual Suggestions */}
                          {categorySuggestions.map((suggestion) => (
                            <SuggestionCard
                              key={suggestion.id}
                              suggestion={suggestion}
                              onApplyAction={(action) => onApplySuggestion(suggestion, action)}
                              onIgnore={() => handleIgnoreSuggestion(suggestion.id)}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Hidden Suggestions Info */}
      {hiddenSuggestions.size > 0 && (
        <div className="p-3 bg-gray-50 border-t text-sm text-gray-600 flex items-center justify-between">
          <span>{hiddenSuggestions.size} suggestions hidden</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setHiddenSuggestions(new Set())}
          >
            Show all
          </Button>
        </div>
      )}
    </div>
  );
}

// Individual Suggestion Card Component
function SuggestionCard({ 
  suggestion, 
  onApplyAction, 
  onIgnore 
}: {
  suggestion: UnifiedSuggestion;
  onApplyAction: (action: UnifiedSuggestion['actions'][0]) => void;
  onIgnore: () => void;
}) {
  const getSeverityIcon = (severity: UnifiedSuggestion['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getSeverityIcon(suggestion.severity)}</div>
        
        <div className="flex-1">
          <h5 className="font-medium text-sm text-gray-900">{suggestion.title}</h5>
          <p className="text-sm text-gray-600 mt-1">{suggestion.message}</p>
          
          {/* Metrics */}
          {suggestion.metrics && (
            <div className="mt-2 text-xs text-gray-500">
              {suggestion.metrics.label}: {suggestion.metrics.current}
              {suggestion.metrics.target && ` (target: ${suggestion.metrics.target})`}
              {suggestion.metrics.unit && ` ${suggestion.metrics.unit}`}
            </div>
          )}
          
          {/* Actions */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {suggestion.actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.primary ? 'default' : 'outline'}
                onClick={() => onApplyAction(action)}
                className="text-xs"
              >
                {action.type === 'fix' && <CheckCircle className="h-3 w-3 mr-1" />}
                {action.type === 'highlight' && <Eye className="h-3 w-3 mr-1" />}
                {action.label}
              </Button>
            ))}
            
            {/* AI Actions (disabled in Phase 2, enabled in Phase 3) */}
            {suggestion.aiActions && (
              <div className="flex gap-2 opacity-50" title="AI features coming soon">
                {suggestion.aiActions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    disabled
                    className="text-xs"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onIgnore}
              className="text-xs"
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Ignore
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 