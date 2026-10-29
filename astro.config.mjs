import { defineConfig } from 'astro/config';
import editor from './src/editor/integration.ts';

export default defineConfig({
  site: 'https://evan2chen.github.io',
  integrations: [editor()],
  devToolbar: { enabled: false },
});
