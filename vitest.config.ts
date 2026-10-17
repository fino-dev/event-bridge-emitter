import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      components: path.resolve(process.cwd(), 'src/components'),
      'moment-timezone': path.resolve(process.cwd(), 'vitest-shims/moment-timezone.ts'),
      'react-inlinesvg': path.resolve(process.cwd(), '.config/jest/mocks/react-inlinesvg.tsx'),
      xss: path.resolve(process.cwd(), 'vitest-shims/xss.ts'),
    },
  },
  test: {
    css: true,
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
    include: ['src/**/*.{spec,test}.{js,jsx,ts,tsx}'],
    server: {
      deps: {
        fallbackCJS: true,
        inline: true,
      },
    },
  },
});
