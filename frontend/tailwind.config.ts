import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Matches cleanpro-admin.html exactly
        admin: {
          bg:       '#0f0f0f',
          surface:  '#181818',
          surface2: '#202020',
          surface3: '#282828',
          border:   '#2a2a2a',
          border2:  '#333333',
          text:     '#f0f0f0',
          text2:    '#a0a0a0',
          text3:    '#666666',
        },
        green: {
          admin:  '#22c55e',
          dim:    '#16a34a',
          bg:     'rgba(34,197,94,0.10)',
          border: 'rgba(34,197,94,0.20)',
        },
      },
      fontFamily: {
        sans:    ['Geist', 'Inter', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
      },
      borderRadius: { admin: '10px' },
    },
  },
  plugins: [],
}

export default config
