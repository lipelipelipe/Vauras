// tailwind.config.ts
import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: '#111827', // slate-900
            a: {
              color: '#2563eb', // blue-600
              textDecoration: 'none',
              fontWeight: '600',
              '&:hover': { textDecoration: 'underline', color: '#1d4ed8' }, // blue-700
            },
            h2: {
              fontWeight: '700',
              letterSpacing: '-0.01em',
              marginTop: '1.75em',
              marginBottom: '0.8em',
            },
            h3: {
              fontWeight: '700',
              letterSpacing: '-0.01em',
              marginTop: '1.5em',
              marginBottom: '0.6em',
            },
            blockquote: {
              fontStyle: 'italic',
              color: '#374151', // gray-700
              borderLeftWidth: '4px',
              borderLeftColor: '#e5e7eb', // gray-200
              paddingLeft: '1rem',
            },
            strong: { color: '#111827', fontWeight: '700' },
            em: { color: '#111827' },
            img: {
              borderRadius: '0.75rem', // rounded-xl
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
            },
            code: {
              backgroundColor: '#f3f4f6', // gray-100
              padding: '0.15rem 0.35rem',
              borderRadius: '0.375rem',
              fontWeight: '600',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
            },
            hr: { borderColor: '#e5e7eb' },
          },
        },
        invert: {
          css: {
            color: '#e5e7eb', // gray-200
            a: { color: '#60a5fa', '&:hover': { color: '#93c5fd' } },
            blockquote: { color: '#9ca3af', borderLeftColor: '#374151' },
            strong: { color: '#f3f4f6' },
            em: { color: '#f3f4f6' },
            hr: { borderColor: '#374151' },
            code: { backgroundColor: '#111827' },
            img: { boxShadow: '0 1px 2px rgba(0,0,0,0.5)' },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;