/** PCPP design tokens — single source of truth for Tailwind classes.
 *  Mirror of the CSS vars in src/index.css and the JS tokens in src/utils/designTokens.js.
 *  No component should hardcode a hex — always reference a token (e.g. bg-pcpp-pine, text-pcpp-emerald).
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pcpp: {
          pine: { DEFAULT: '#0E3A2F', 700: '#14503F' }, // sidebar/header/dark surfaces, primary headings
          emerald: { DEFAULT: '#1D9E75', 600: '#178363' }, // primary buttons, active nav, links
          mist: '#F4F6F3', // page background
          water: '#2E86C1', // WEF: Water
          energy: '#1D9E75', // WEF: Energy (== emerald, intentional)
          food: '#E9A23B', // WEF: Food
          harvest: '#E9A23B', // funding-gap / attention accent (alias of food amber)
          border: 'rgba(14,58,47,0.10)', // pine @ 10%
          card: '#FFFFFF',
        },
        status: {
          ongoing: '#1D9E75', // under_implementation
          pipeline: '#E9A23B', // approved/under_review/etc.
          completed: '#6B8F84', // muted pine-grey
          review: '#2E86C1', // under_review workflow badge
          rejected: '#A32D2D',
        },
        ink: {
          DEFAULT: '#1A2520', // text primary
          secondary: '#5B6B64',
          tertiary: '#8A968F',
        },
      },
      fontFamily: {
        // Inter is loaded in Part B; this keeps the fallback chain consistent now.
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
    },
  },
  plugins: [],
};
