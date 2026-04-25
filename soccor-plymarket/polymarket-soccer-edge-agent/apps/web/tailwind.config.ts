import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#07120f",
        panel: "#0c1a17",
        line: "#1e3933",
        mint: "#43f5b5",
        amber: "#f6c453",
        coral: "#ff6f61"
      },
      boxShadow: {
        glow: "0 0 28px rgba(67,245,181,0.12)"
      }
    }
  },
  plugins: []
};

export default config;

