module.exports = {
  content: ['./public/**/*.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['cairo', 'sans-serif', 'AmpleSoftMedium']
    },
    extend: {
      colors: {
        disco: {
          cyan: '#6096BA',
          blue: '#274C78'
        }
      }
    }
  },
  plugins: []
}
