import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: 'class', // Enable dark mode based on a CSS class
  theme: {
    fontFamily: {
      sans: ["cairo", "sans-serif"],
      disco: ["AmpleSoftMedium"],
    },
    extend: {
      colors: {
        disco: {
          cyan: "#6096BA",
          blue: "#274C78",
          'dark-cyan': "#1F3A4F",
          'dark-blue': "#12263A", // you just have to do dark: and then put the class you want to have in dark mode
          'light-cyan': "#8AB9D3",
          'light-blue': "#4A7CA1",
        },
      },
      spacing: {
        128: "32rem",
      },
    },
  },
  plugins: [],
};

export default config;
