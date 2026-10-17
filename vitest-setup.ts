import '@testing-library/jest-dom/vitest';
import 'intersection-observer';
import { TextDecoder, TextEncoder } from 'node:util';
import { MessageChannel, MessagePort } from 'node:worker_threads';
import { vi } from 'vitest';

// React 19's scheduler relies on MessageChannel, which jsdom does not implement.
Object.assign(globalThis, { TextDecoder, TextEncoder, MessageChannel, MessagePort });

Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});
