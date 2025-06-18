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
import { Link } from '@/components/tiptap-extension/link-extension';
import { Selection } from '@/components/tiptap-extension/selection-extension';
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension';
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension';
import { MAX_FILE_SIZE, handleImageUpload } from '@/lib/tiptap-utils';
import { EnhancedGrammarDecoration } from '@/components/editor/extensions/EnhancedGrammarDecoration';
import { generateJSON } from '@tiptap/html';
import { UnifiedSuggestion } from '@/types/suggestions';
import { JSONContent } from '@tiptap/core';

const handleSuggestionClick = (suggestion: UnifiedSuggestion) => {
  const suggestionElement = document.getElementById(`suggestion-${suggestion.id}`);
  if (suggestionElement) {
    suggestionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    suggestionElement.classList.add('ring-2', 'ring-primary');
    setTimeout(() => {
      suggestionElement.classList.remove('ring-2', 'ring-primary');
    }, 2000);
  }
};

const TIPTAP_EXTENSIONS = [
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
    onError: (error: Error) => console.error('Upload failed:', error),
  }),
  TrailingNode,
  Link.configure({ openOnClick: false }),
  EnhancedGrammarDecoration.configure({
    onSuggestionClick: handleSuggestionClick,
  }),
];

export const editorExtensions = TIPTAP_EXTENSIONS;

export function getJsonFromHtml(html: string): JSONContent {
  return generateJSON(html, TIPTAP_EXTENSIONS);
} 