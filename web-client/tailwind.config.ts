import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
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
