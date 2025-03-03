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
        // example: <div class="bg-disco-cyan dark:bg-disco-dark-cyan">...</div>
        disco: {
          cyan: "#6096BA",
          blue: "#274C78",
          orange: "#FB923C",
          // dark refers to the dark mode not how dark is the color
          dark: {
            cyan: "#1F3A4F",
            blue: "#12263A",
          },
          light: {
            cyan: "#8AB9D3",
            blue: "#4A7CA1",
          }
        },
        // ex: <p class="text-body-light dark:text-body-dark">...</p>
        body: {
          light: "#475569", // text-slate-600
          dark: "#e2e8f0", // text-slate-200
          secondary: {
            light: "#64748b", // text-slate-500
            dark: "#cbd5e1", // text-slate-300
          }
        },
        heading: {
          light: "#334155", // text-slate-700
          dark: "#fff", // text-white
        }
      },
      spacing: {
        128: "32rem",
      },
    },
  },
  plugins: [],
};

export default config;
