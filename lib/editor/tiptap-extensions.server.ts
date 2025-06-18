/**
 * @file lib/editor/tiptap-extensions.server.ts
 * @purpose This file defines the list of Tiptap extensions that are safe to use in a
 * server-side context (e.g., in API routes for analysis). It excludes any extensions
 * that depend on the React framework or other client-side browser APIs.
 */
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
import { LinkServer } from '@/components/tiptap-extension/link-extension.server';
import { ImageUploadNodeServer } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension.server';

const TIPTAP_EXTENSIONS_SERVER = [
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
  ImageUploadNodeServer.configure(),
  LinkServer.configure({ openOnClick: false }),
];

export const serverEditorExtensions = TIPTAP_EXTENSIONS_SERVER; 