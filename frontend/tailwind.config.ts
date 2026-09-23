import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 8/16-color VGA palette from the reference design system
        teal: '#008080',
        navy: '#000080',
        silver: '#c0c0c0',
        paper: '#ffffff',
        shadow: '#000000',
        alertyellow: '#ffff00',
        terminalgreen: '#00ff00',
        alertred: '#ff0000',
        bevelDark: '#808080',
        bevelDarker: '#404040',
      },
      fontFamily: {
        console: ['VT323', 'ui-monospace', 'Courier New', 'monospace'],
        display: ['"Pixelify Sans"', 'Silkscreen', 'VT323', 'sans-serif'],
        pixel: ['Silkscreen', '"Pixelify Sans"', 'VT323', 'sans-serif'],
      },
      boxShadow: {
        'bevel-out': 'inset -2px -2px 0 0 #404040, inset 2px 2px 0 0 #ffffff, inset -3px -3px 0 0 #808080, inset 3px 3px 0 0 #dfdfdf',
        'bevel-in': 'inset 2px 2px 0 0 #404040, inset -2px -2px 0 0 #ffffff, inset 3px 3px 0 0 #808080, inset -3px -3px 0 0 #dfdfdf',
        'bevel-out-sm': 'inset -1px -1px 0 0 #404040, inset 1px 1px 0 0 #ffffff',
        'bevel-in-sm': 'inset 1px 1px 0 0 #404040, inset -1px -1px 0 0 #ffffff',
      },
      borderRadius: {
        none: '0px',
      },
    },
  },
  plugins: [],
} satisfies Config;
