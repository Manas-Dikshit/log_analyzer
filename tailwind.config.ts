import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#12111A",
        paper: "#FBFAF7",
        lav: "#E7E1FB",
        mint: "#D6F3E1",
        butter: "#FBF3C7",
        blush: "#FBE3E8",
        line: "#12111A",
        severity: {
          critical: "#D6274C",
          criticalBg: "#FBE1E6",
          high: "#DD6A1B",
          highBg: "#FCEBDD",
          medium: "#B58900",
          mediumBg: "#FAF1D2",
          info: "#0F8F7E",
          infoBg: "#DCF3EE",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        hard: "4px 4px 0 0 #12111A",
        "hard-sm": "2px 2px 0 0 #12111A",
        "hard-lg": "8px 8px 0 0 #12111A",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(115deg, #E7E1FB 0%, #EAF0FD 24%, #D6F3E1 52%, #F3F6D5 74%, #FBF3C7 100%)",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "count-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.08)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        scanline: "scanline 3.2s linear infinite",
        blink: "blink 1s step-start infinite",
        "count-pulse": "count-pulse 2.4s ease-in-out infinite",
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
