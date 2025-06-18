/**
 * @file components/editor/BlogEditor.tsx
 * @purpose This is the main editor component. It orchestrates all the Tiptap extensions,
 * the toolbar UI, the header, SEO settings, and the analysis hooks. It is the central
 * hub for the entire writing and editing experience.
 */
'use client';

import { useState, useEffect } from 'react';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSession } from '@/lib/auth/client';
import { useDocumentTitleUpdate, useDocumentUpdates } from '@/components/layout/AppLayout';
import { RightPanel } from '@/components/panels/RightPanel';
import { DocumentHeader } from './DocumentHeader';
import { SEOSettings } from './SEOSettings';
import type { JSONContent } from '@tiptap/react';
import { AnimatePresence } from 'framer-motion';

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

// --- Custom Extensions ---
import { Link } from '@/components/tiptap-extension/link-extension';
import { Selection } from '@/components/tiptap-extension/selection-extension';
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension';
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension';
import { EnhancedGrammarDecoration } from './extensions/EnhancedGrammarDecoration';
import { EditorStatusBar } from './EditorStatusBar';
import { useUnifiedAnalysis } from '@/hooks/useUnifiedAnalysis';
import {
  updateSuggestions,
} from './extensions/EnhancedGrammarDecoration';
import { useSuggestions } from '@/contexts/SuggestionContext';

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

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from '@/lib/tiptap-utils';

// --- Styles ---
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import '@/components/tiptap-templates/simple/simple-editor.scss';

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
  const { suggestions, registerEditorActions, setHoveredSuggestionId, hoveredSuggestionId } = useSuggestions();
  const [title, setTitle] = useState(initialDocument?.title || 'Untitled Document');
  const [metaDescription, setMetaDescription] = useState(initialDocument?.metaDescription || '');
  const [author, setAuthor] = useState(initialDocument?.author || session?.user?.name || 'Anonymous');
  const [targetKeyword, setTargetKeyword] = useState(initialDocument?.targetKeyword || '');
  const [keywords, setKeywords] = useState<string[]>(initialDocument?.keywords || []);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-8',
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
        onSuggestionClick: (suggestion) => {
          const suggestionElement = document.getElementById(`suggestion-${suggestion.id}`);
          if (suggestionElement) {
            suggestionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            suggestionElement.classList.add('ring-2', 'ring-primary');
            setTimeout(() => {
              suggestionElement.classList.remove('ring-2', 'ring-primary');
            }, 2000);
          }
        },
        onHover: (id) => setHoveredSuggestionId(id),
        onLeave: () => setHoveredSuggestionId(null),
      }),
    ],
    content: initialDocument?.content || '',
  });

  // Register the editor's "apply" action with the context
  useEffect(() => {
    if (editor && registerEditorActions) {
      registerEditorActions({
        apply: (suggestionId, value) => {
          const suggestion = suggestions.find(s => s.id === suggestionId);
          if (suggestion?.position) {
            const { start, end } = suggestion.position;
            editor.chain().focus().insertContentAt({ from: start, to: end }, value).run();
          }
        },
      });
    }
  }, [editor, registerEditorActions, suggestions]);

  const { saveState, lastSaved, handleContentChange, handleTitleChange, handleMetaChange } = useAutoSave(editor, documentId);

  // Call our new analysis hook
  const { runRealtimeSpellCheck, debouncedFastAnalysis } = useUnifiedAnalysis(editor?.state.doc || null, editor?.isEditable || false, {
    title,
    metaDescription,
    targetKeyword,
    keywords,
  });

  useEffect(() => {
    if (editor) {
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
    console.log('Preview functionality coming soon');
    // TODO: Implement preview
  };

  const handlePublish = () => {
    console.log('Publishing document...');
    // TODO: Implement publish functionality
  };

  return (
    <div className="h-full flex bg-gray-50">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col relative"> {/* Make this container relative for status bar */}
        {/* Document Header */}
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

        {/* SEO Settings */}
        <SEOSettings
          targetKeyword={targetKeyword}
          keywords={keywords}
          metaDescription={metaDescription}
          onTargetKeywordChange={onTargetKeywordChange}
          onKeywordsChange={onKeywordsChange}
          onMetaDescriptionChange={onMetaChange}
        />

        {/* Editor Section */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Tiptap Toolbar */}
          <EditorContext.Provider value={{ editor }}>
            <Toolbar className="border-b border-gray-200 bg-white px-4">
              <Spacer />

              <ToolbarGroup>
                <UndoRedoButton action="undo" />
                <UndoRedoButton action="redo" />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
                <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} />
                <BlockQuoteButton />
                <CodeBlockButton />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <MarkButton type="bold" />
                <MarkButton type="italic" />
                <MarkButton type="strike" />
                <MarkButton type="code" />
                <MarkButton type="underline" />
                <ColorHighlightPopover />
                <LinkPopover />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <MarkButton type="superscript" />
                <MarkButton type="subscript" />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <TextAlignButton align="left" />
                <TextAlignButton align="center" />
                <TextAlignButton align="right" />
                <TextAlignButton align="justify" />
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <ImageUploadButton text="" />
              </ToolbarGroup>

              <Spacer />
            </Toolbar>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto">
              <EditorContent
                editor={editor}
                className="simple-editor-content"
              />
            </div>
          </EditorContext.Provider>
        </div>
        
        {/* Fixed Status Bar - Only for editor area */}
        <EditorStatusBar />
      </div>

      {/* Right Panel */}
      <AnimatePresence>
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
      
    </div>
  );
} 