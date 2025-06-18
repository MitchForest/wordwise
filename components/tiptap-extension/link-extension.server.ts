/**
 * @file components/tiptap-extension/link-extension.server.ts
 * @purpose This is the server-side-only version of the Link extension. It contains
 * only the schema definition and omits all client-side ProseMirror plugins that
 * handle interactivity like clicks and keyboard shortcuts.
 */
import TiptapLink from "@tiptap/extension-link"

export const LinkServer = TiptapLink.extend({
  inclusive: false,

  parseHTML() {
    return [
      {
        tag: 'a[href]:not([data-type="button"]):not([href *= "javascript:" i])',
      },
    ]
  },
}) 