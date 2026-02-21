import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        emerald: {
          600: "#059669",
        },
        confidence: {
          high: "#059669",
          medium: "#d97706",
          low: "#dc2626",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Sora", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      width: {
        sidebar: "360px",
      },
      minWidth: {
        sidebar: "300px",
      },
      maxWidth: {
        sidebar: "400px",
      },
    },
  },
  plugins: [],
};

export default config;
