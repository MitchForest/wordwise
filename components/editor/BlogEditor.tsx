/**
 * @file components/editor/BlogEditor.tsx
 * @purpose This is the main editor component. It orchestrates all the Tiptap extensions,
 * the toolbar UI, the header, SEO settings, and the analysis hooks. It is the central
 * hub for the entire writing and editing experience.
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSession } from '@/lib/auth/client';
import { useDocumentTitleUpdate, useDocumentUpdates } from '@/components/layout/AppLayout';
import { RightPanel } from '@/components/panels/RightPanel';
import { DocumentHeader } from './DocumentHeader';
import { SEOModal } from './SEOModal';
import type { JSONContent } from '@tiptap/react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { EnhancedGrammarDecoration } from './extensions/EnhancedGrammarDecoration';
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
  const [wordCount, setWordCount] = useState(0);

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
          const position = suggestionManager.current.getPosition(suggestionId);
          if (!position) {
            console.error('[Apply Fix] No position found for suggestion:', suggestionId);
            return;
          }
          editor.chain().focus().setTextSelection({ from: position.from, to: position.to }).insertContent(value).run();
        },
        getDocumentText: () => editor.state.doc.textContent,
      });
    }
  }, [editor, registerEditorActions]);

  const { saveState, lastSaved, handleContentChange, handleTitleChange, handleMetaChange } = useAutoSave(editor, documentId);

  // Define the callback for when analysis provides new suggestions
  const handleSuggestionsChange = useCallback((newSuggestions: UnifiedSuggestion[]) => {
    if (editor) {
      suggestionManager.current.addSuggestions(newSuggestions, editor.state.doc);
      editor.view.dispatch(editor.state.tr.setSelection(editor.state.selection).scrollIntoView());
    }
  }, [editor]);

  // Call our unified analysis hook
  const { runSEOAnalysis } = useUnifiedAnalysis(
    editor?.state.doc || null,
    editor?.isEditable || false,
    handleSuggestionsChange,
    { title, metaDescription, targetKeyword, keywords },
    documentId,
    enableSEOChecks
  );

  useEffect(() => {
    if (editor && onDocumentTitleChange) {
      if (initialDocument?.title) {
        setTitle(initialDocument.title);
      }
      onDocumentTitleChange(documentId, title);
    }
  }, [editor, onDocumentTitleChange, title, initialDocument?.title, documentId]);
  
  const onTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    handleTitleChange(newTitle);
  };
  
  const onMetaChange = (newMeta: string) => {
    setMetaDescription(newMeta);
    handleMetaChange(newMeta);
  };

  const onAuthorChange = (newAuthor: string) => setAuthor(newAuthor);
  const onTargetKeywordChange = (newKeyword: string) => setTargetKeyword(newKeyword);
  const onKeywordsChange = (newKeywords: string[]) => setKeywords(newKeywords);
  const handlePreview = () => console.log('Preview clicked');
  const handlePublish = () => setIsPublishingDialogOpen(true);
  const handleCheckSEO = () => {
    setEnableSEOChecks(true);
    runSEOAnalysis();
    toast.info('Running SEO analysis...');
  };

  const handleUpdate = useCallback(() => {
    if (editor) {
      handleContentChange(editor.getJSON(), editor.getText());
      const stats = editor.storage.characterCount;
      if (stats) {
        setWordCount(stats.words());
      }
    }
  }, [editor, handleContentChange]);

  useEffect(() => {
    if (editor) {
      editor.on('update', handleUpdate);
      return () => {
        editor.off('update', handleUpdate);
      };
    }
  }, [editor, handleUpdate]);

  useEffect(() => {
    const update = documentUpdates[documentId];
    if (update?.title) setTitle(update.title);
  }, [documentId, documentUpdates]);

  if (!editor) return <div>Loading editor...</div>;

  return (
    <div className="flex h-full bg-gray-50">
      <motion.div 
        className="flex-1 flex flex-col relative"
        animate={{ marginRight: rightPanelOpen ? '384px' : '0px' }}
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
                      <UndoRedoButton editor={editor} action="undo" />
                      <UndoRedoButton editor={editor} action="redo" />
                      <ToolbarSeparator />
                      <HeadingDropdownMenu editor={editor} />
                      <ToolbarSeparator />
                      <MarkButton editor={editor} type="bold" tooltip="Bold" />
                      <MarkButton editor={editor} type="italic" tooltip="Italic" />
                      <MarkButton editor={editor} type="underline" tooltip="Underline" />
                      <ToolbarSeparator />
                      <LinkPopover editor={editor} />
                      <BlockQuoteButton editor={editor} />
                      <CodeBlockButton editor={editor} />
                      <ImageUploadButton editor={editor} />
                      <ToolbarSeparator />
                      <ListDropdownMenu editor={editor} />
                      <ToolbarSeparator />
                      <TextAlignButton editor={editor} align="left" />
                      <TextAlignButton editor={editor} align="center" />
                      <TextAlignButton editor={editor} align="right" />
                      <TextAlignButton editor={editor} align="justify" />
                      <ToolbarSeparator />
                      <SEOButton onClick={() => setIsSEOModalOpen(true)} />
                    </ToolbarGroup>
                    <Spacer />
                    <ColorHighlightPopover editor={editor} />
                  </Toolbar>
                </EditorContext.Provider>
                <div className="flex-1 overflow-y-auto">
                  <EditorContent editor={editor} className="h-full" />
                </div>
              </div>
            </div>
          </AnimatePresence>
        </div>
        <EditorStatusBar onCheckSEO={handleCheckSEO} wordCount={wordCount} />
      </motion.div>
      <AnimatePresence mode="wait">
        {rightPanelOpen && (
          <RightPanel
            documentId={documentId}
            editor={editor}
            title={title}
            content={editor.getText()}
            metaDescription={metaDescription}
            targetKeyword={targetKeyword}
            keywords={keywords}
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