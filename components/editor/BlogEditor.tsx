/**
 * @file components/editor/BlogEditor.tsx
 * @purpose This is the main editor component. It orchestrates all the Tiptap extensions,
 * the toolbar UI, the header, SEO settings, and the analysis hooks. It is the central
 * hub for the entire writing and editing experience.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSession } from '@/lib/auth/client';
import { useDocumentTitleUpdate, useDocumentUpdates } from '@/components/layout/AppLayout';
import { RightPanel } from '@/components/panels/RightPanel';
import { DocumentHeader } from './DocumentHeader';
import { SEOModal } from './SEOModal';
import type { JSONContent } from '@tiptap/react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { useUnifiedAnalysis } from '@/hooks/useUnifiedAnalysis';
import { useSuggestions } from '@/contexts/SuggestionContext';
import type { UnifiedSuggestion } from '@/types/suggestions';
import { toast } from 'sonner';

// --- Tiptap Core Extensions ---
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Underline } from '@tiptap/extension-underline';
import { Extension } from '@tiptap/core';

// --- Custom Extensions ---
import { Link } from '@/components/tiptap-extension/link-extension';
import { Selection } from '@/components/tiptap-extension/selection-extension';
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension';
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension';
import { EnhancedGrammarDecoration, updateSuggestions } from './extensions/EnhancedGrammarDecoration';
import { EditorStatusBar } from './EditorStatusBar';

// --- UI Primitives ---
import { Spacer } from '@/components/tiptap-ui-primitive/spacer';
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from '@/components/tiptap-ui-primitive/toolbar';

// --- Tiptap UI ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button';
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu';
import { BlockQuoteButton } from '@/components/tiptap-ui/blockquote-button';
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button';
import {
  ColorHighlightPopover,
} from '@/components/tiptap-ui/color-highlight-popover';
import {
  LinkPopover,
} from '@/components/tiptap-ui/link-popover';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button';
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button';
import { SEOButton } from '@/components/tiptap-ui/seo-button';
import { PublishingDialog } from '@/components/publishing/PublishingDialog';

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from '@/lib/tiptap-utils';

// --- Styles ---
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import '@/components/tiptap-templates/simple/simple-editor.scss';

// Suggestion Management
import { SuggestionManager } from '@/lib/editor/suggestion-manager';
import { createSuggestionTrackingPlugin } from '@/lib/editor/extensions/suggestion-tracking';


interface BlogEditorProps {
  documentId: string;
  initialDocument?: {
    title?: string;
    metaDescription?: string;
    author?: string;
    keywords?: string[];
    content?: JSONContent;
    targetKeyword?: string;
  };
}

export function BlogEditor({ documentId, initialDocument }: BlogEditorProps) {
  const { data: session } = useSession();
  const onDocumentTitleChange = useDocumentTitleUpdate();
  const documentUpdates = useDocumentUpdates();
  const {
    suggestions,
    registerEditorActions,
    setHoveredSuggestionId,
    hoveredSuggestionId,
    setFocusedSuggestionId,
  } = useSuggestions();
  const [title, setTitle] = useState(initialDocument?.title || 'Untitled Document');
  const [metaDescription, setMetaDescription] = useState(initialDocument?.metaDescription || '');
  const [author, setAuthor] = useState(initialDocument?.author || session?.user?.name || 'Anonymous');
  const [targetKeyword, setTargetKeyword] = useState(initialDocument?.targetKeyword || '');
  const [keywords, setKeywords] = useState<string[]>(initialDocument?.keywords || []);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isPublishingDialogOpen, setIsPublishingDialogOpen] = useState(false);
  const [isSEOModalOpen, setIsSEOModalOpen] = useState(false);
  const [enableSEOChecks, setEnableSEOChecks] = useState(false);
  
  // Create suggestion manager instance
  const suggestionManager = useRef(new SuggestionManager());

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-full p-8',
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
      },
    },
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: 'image/*',
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error('Upload failed:', error),
      }),
      TrailingNode,
      Link.configure({ openOnClick: false }),
      EnhancedGrammarDecoration.configure({
        hoveredSuggestionId,
        onSuggestionClick: (suggestion) => setFocusedSuggestionId(suggestion.id),
        onHover: (id) => setHoveredSuggestionId(id),
        onLeave: () => setHoveredSuggestionId(null),
      }),
      // Add the suggestion tracking plugin
      Extension.create({
        name: 'suggestionTracking',
        addProseMirrorPlugins() {
          return [createSuggestionTrackingPlugin(suggestionManager.current)];
        }
      })
    ],
    content: initialDocument?.content || '',
  });

  // Register the editor's "apply" action with the context
  useEffect(() => {
    if (editor && registerEditorActions) {
      registerEditorActions({
        apply: (suggestionId: string, value: string) => {
          console.log('[Apply Fix] Starting:', { suggestionId, value });
          
          // Special handling for document-wide suggestions
          if (suggestionId.endsWith('-global')) {
            console.log('[Apply Fix] Document-wide suggestion - no position needed');
            
            // Handle based on suggestion type
            if (suggestionId.includes('seo')) {
              // Open SEO modal for SEO-related suggestions
              setIsSEOModalOpen(true);
              toast.info('Please update your SEO settings');
            } else {
              // Show toast for other document-wide suggestions
              toast.info(value || 'Please review this document-wide suggestion');
            }
            return;
          }
          
          // Get position from SuggestionManager
          const position = suggestionManager.current.getPosition(suggestionId);
          
          if (!position) {
            console.error('[Apply Fix] No position found for suggestion:', suggestionId);
            return;
          }
          
          console.log('[Apply Fix] Applying fix at position:', position, 'with value:', value);
          
          // Get the current text at this position to verify
          try {
            const currentText = editor.state.doc.textBetween(position.from, position.to);
            console.log('[Apply Fix] Current text at position:', currentText);
          } catch (e) {
            console.error('[Apply Fix] Error getting text at position:', e);
          }
          
          editor.chain()
            .focus()
            .setTextSelection({ from: position.from, to: position.to })
            .insertContent(value)
            .run();
            
          console.log('[Apply Fix] Fix applied successfully');
        },
        getDocumentText: () => {
          const text = editor.state.doc.textContent;
          console.log('[BlogEditor] getDocumentText called:', {
            length: text.length,
            preview: text.substring(0, 100) + '...',
            hasEditor: !!editor
          });
          return text;
        },
      });
    }
  }, [editor, registerEditorActions, setIsSEOModalOpen]); // Added setIsSEOModalOpen to deps

  const { saveState, lastSaved, handleContentChange, handleTitleChange, handleMetaChange } = useAutoSave(editor, documentId);

  // Call our new analysis hook
  const { runRealtimeSpellCheck, debouncedFastAnalysis, runSEOAnalysis } = useUnifiedAnalysis(
    editor?.state.doc || null, 
    editor?.isEditable || false, 
    {
      title,
      metaDescription,
      targetKeyword,
      keywords,
    },
    documentId,
    enableSEOChecks
  );

  // Update SuggestionManager when suggestions change
  useEffect(() => {
    if (editor && suggestions) {
      console.log('[BlogEditor] Adding suggestions to SuggestionManager:', {
        suggestionCount: suggestions.length,
        editorDocText: editor.state.doc.textContent,
        editorDocLength: editor.state.doc.textContent.length,
        firstSuggestion: suggestions[0] ? {
          id: suggestions[0].id,
          matchText: suggestions[0].matchText,
          category: suggestions[0].category
        } : null
      });
      
      suggestionManager.current.addSuggestions(suggestions, editor.state.doc);
      // Force re-render of decorations
      editor.view.dispatch(editor.state.tr);
    }
  }, [suggestions, editor]);

  useEffect(() => {
    if (editor) {
      console.log('[BlogEditor] Updating decorations with suggestions:', {
        count: suggestions.length,
        suggestions: suggestions.map((s: UnifiedSuggestion) => ({
          id: s.id,
          matchText: s.matchText,
          category: s.category,
          message: s.message
        }))
      });
      updateSuggestions(editor, suggestions);
    }
  }, [suggestions, editor]);

  // Sync title updates from initial document
  useEffect(() => {
    if (initialDocument?.title) {
      setTitle(initialDocument.title);
    }
  }, [initialDocument?.title]);
  
  // Listen for title updates from sidebar
  useEffect(() => {
    const update = documentUpdates[documentId];
    if (update?.title && update.timestamp > 0) {
      setTitle(update.title);
      // Force immediate re-render
      console.log('Title updated from sidebar:', update.title);
    }
  }, [documentId, documentUpdates]);

  // Set up content change handler
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const content = editor.getJSON();
      const plainText = editor.getText();
      handleContentChange(content, plainText);

      // Real-time spell check logic
      const { from, empty } = editor.state.selection;
      if (empty && from > 1) {
        const textBefore = editor.state.doc.textBetween(0, from, "\n", " ");
        const lastChar = textBefore.slice(-1);
        if (/\s/.test(lastChar)) { // Fired on space
          const lastWord = textBefore.trim().split(/\s+/).pop();
          if (lastWord && lastWord.length > 2) {
            runRealtimeSpellCheck(lastWord, editor.state.doc);
          }
        } else if (/[.!?]/.test(lastChar)) { // Fired on sentence end
          // Trigger fast analysis for the whole document
          debouncedFastAnalysis(editor.state.doc);
        }
      }
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, handleContentChange, runRealtimeSpellCheck, debouncedFastAnalysis]);

  // Handle title changes
  const onTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    handleTitleChange(newTitle);
    if (onDocumentTitleChange) {
      onDocumentTitleChange(documentId, newTitle);
    }
  };

  // Handle meta description changes
  const onMetaChange = (newMeta: string) => {
    setMetaDescription(newMeta);
    handleMetaChange(newMeta);
  };

  // Handle author changes
  const onAuthorChange = (newAuthor: string) => {
    setAuthor(newAuthor);
    // TODO: Save author to document
  };

  // Handle target keyword changes
  const onTargetKeywordChange = (newKeyword: string) => {
    setTargetKeyword(newKeyword);
    // TODO: Save target keyword to document
  };

  // Handle keywords changes
  const onKeywordsChange = (newKeywords: string[]) => {
    setKeywords(newKeywords);
    // TODO: Save keywords to document
  };

  const handlePreview = () => {
    // Implement preview logic
    console.log('Previewing...');
  };

  const handlePublish = () => {
    setIsPublishingDialogOpen(true);
  };

  const handleCheckSEO = () => {
    setEnableSEOChecks(true);
    // Trigger immediate SEO analysis
    if (runSEOAnalysis) {
      runSEOAnalysis();
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main editor column */}
      <motion.div 
        className="flex-1 flex flex-col relative"
        animate={{ 
          marginRight: rightPanelOpen ? 0 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
      >
        <DocumentHeader
          title={title}
          author={author}
          lastUpdated={lastSaved}
          saveState={saveState}
          rightPanelOpen={rightPanelOpen}
          onTitleChange={onTitleChange}
          onAuthorChange={onAuthorChange}
          onPreview={handlePreview}
          onPublish={handlePublish}
          onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        />

        <div className="flex-1 overflow-y-auto flex flex-col">
          <AnimatePresence>
            <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
              <div className="bg-white rounded-t-lg shadow-lg border flex-1 flex flex-col">
                <EditorContext.Provider value={{ editor }}>
                  <Toolbar>
                    <ToolbarGroup>
                      <UndoRedoButton action="undo" />
                      <UndoRedoButton action="redo" />
                      <ToolbarSeparator />
                      <HeadingDropdownMenu />
                      <ToolbarSeparator />
                      <MarkButton type="bold" tooltip="Bold" />
                      <MarkButton type="italic" tooltip="Italic" />
                      <MarkButton type="underline" tooltip="Underline" />
                      <ToolbarSeparator />
                      <LinkPopover />
                      <BlockQuoteButton />
                      <CodeBlockButton />
                      <ImageUploadButton />
                      <ToolbarSeparator />
                      <ListDropdownMenu />
                      <ToolbarSeparator />
                      <TextAlignButton align="left" />
                      <TextAlignButton align="center" />
                      <TextAlignButton align="right" />
                      <TextAlignButton align="justify" />
                      <ToolbarSeparator />
                      <SEOButton onClick={() => setIsSEOModalOpen(true)} />
                    </ToolbarGroup>
                    <Spacer />
                    <ColorHighlightPopover />
                  </Toolbar>
                </EditorContext.Provider>
                <div className="flex-1 overflow-y-auto">
                  <EditorContent editor={editor} className="h-full" />
                </div>
              </div>
            </div>
          </AnimatePresence>
        </div>

        <EditorStatusBar onCheckSEO={handleCheckSEO} />
      </motion.div>

      {/* Right panel */}
      <AnimatePresence mode="wait">
        {rightPanelOpen && (
          <RightPanel
            documentId={documentId}
            title={title}
            content={editor?.getText() || ''}
            metaDescription={metaDescription}
            targetKeyword={targetKeyword}
            keywords={keywords}
            editor={editor}
          />
        )}
      </AnimatePresence>

      <SEOModal
        isOpen={isSEOModalOpen}
        onClose={() => setIsSEOModalOpen(false)}
        targetKeyword={targetKeyword}
        keywords={keywords}
        metaDescription={metaDescription}
        onTargetKeywordChange={onTargetKeywordChange}
        onKeywordsChange={onKeywordsChange}
        onMetaDescriptionChange={onMetaChange}
      />

      <PublishingDialog
        documentId={documentId}
        isOpen={isPublishingDialogOpen}
        onClose={() => setIsPublishingDialogOpen(false)}
      />
    </div>
  );
} 