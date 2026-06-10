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
          pine: { DEFAULT: '#0B3D33', 700: '#14503F', 800: '#082F28' }, // sidebar/header/dark surfaces, primary headings
          emerald: { DEFAULT: '#1D9E75', 600: '#178363', 700: '#0D6B57' }, // primary buttons, active nav, links
          mist: '#F4F6F3', // page background
          water: { DEFAULT: '#1F7A9B', 600: '#17637E', soft: '#DFF4F8' }, // WEF: Water
          energy: '#1D9E75', // WEF: Energy (== emerald, intentional)
          food: { DEFAULT: '#A56516', 600: '#8A4F10', soft: '#FFF0D2' }, // WEF: Food
          harvest: '#A56516', // funding-gap / attention accent (alias of food)
          climate: '#3F7E44',
          infrastructure: '#6D5BD0',
          industry: '#9C4E97',
          social: '#B52E5E',
          neutral: '#6B8F84',
          border: 'rgba(11,61,51,0.10)', // pine @ 10%
          card: '#FFFFFF',
        },
        status: {
          ongoing: '#178363', // under_implementation
          pipeline: '#A56516', // approved/under_review/etc.
          completed: '#6B8F84', // muted pine-grey
          review: '#1F7A9B', // under_review workflow badge
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
