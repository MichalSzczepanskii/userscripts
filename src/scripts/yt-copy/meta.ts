import type { MonkeyUserScript } from 'vite-plugin-monkey';

export default {
  name: 'YT Copy',
  namespace: 'userscripts',
  version: '1.0.0',
  description: 'Alt+C copies the video link and transcript as Markdown, Alt+Shift+C adds timestamps',
  match: ['https://www.youtube.com/*'],
  grant: ['GM_setClipboard', 'GM_registerMenuCommand', 'unsafeWindow'],
} satisfies MonkeyUserScript;
