import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        spotter: {
          primary: "var(--spotter-primary)",
          secondary: "var(--spotter-secondary)",
          other: "var(--spotter-other)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
