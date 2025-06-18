/**
 * @file components/tiptap-node/image-upload-node/image-upload-node-extension.server.ts
 * @purpose This is the server-side-only version of the ImageUploadNode extension. It contains
 * only the schema definition (name, group, attributes, etc.) and omits all client-side
 * interactive features like the React Node View, commands, and keyboard shortcuts. This allows
 * the server to parse and understand documents containing this node without depending on
 * client-side libraries like React.
 */
import { mergeAttributes, Node } from '@tiptap/core';

// This is a stripped-down version of the options, as server doesn't need upload logic.
export interface ImageUploadNodeOptions {
  accept?: string;
  limit?: number;
  maxSize?: number;
}

/**
 * A TipTap node extension for the server. It only contains the schema.
 */
export const ImageUploadNodeServer = Node.create<ImageUploadNodeOptions>({
  name: 'imageUpload',

  group: 'block',

  draggable: true,

  selectable: true,

  atom: true,

  addOptions() {
    return {
      accept: 'image/*',
      limit: 1,
      maxSize: 0,
    };
  },

  addAttributes() {
    return {
      accept: {
        default: this.options.accept,
      },
      limit: {
        default: this.options.limit,
      },
      maxSize: {
        default: this.options.maxSize,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-upload"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'image-upload' }, HTMLAttributes),
    ];
  },
}); 