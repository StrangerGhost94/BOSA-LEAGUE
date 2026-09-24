import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: { DEFAULT: "#060913", 900: "#060913", 800: "#0A0F1E", 700: "#0F1629", 600: "#161E36", 500: "#1B2033" },
        crimson: { DEFAULT: "#CC2654", 400: "#E04A74", 600: "#A91C44", 800: "#6E1230" },
        gold: { DEFAULT: "#D6B676", 300: "#EEDDB4", 400: "#E3C98F", 600: "#B8955A", 700: "#8C6E3E" },
        ivory: { DEFAULT: "#F6F1E7", 200: "#EFE7D8", 300: "#E4D9C4", 400: "#CFC2A8" },
        emerald: { DEFAULT: "#1E8C6B", 400: "#2DB38A", 700: "#135C47" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { widest2: "0.32em" },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        drift: { "0%,100%": { transform: "translate3d(0,0,0) scale(1)" }, "50%": { transform: "translate3d(4%,-3%,0) scale(1.08)" } },
        gradient: { "0%,100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        beam: { "0%,100%": { opacity: "0.35" }, "50%": { opacity: "0.7" } },
        pulseDot: { "0%,100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: ".4", transform: "scale(.8)" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        drift: "drift 18s ease-in-out infinite",
        gradient: "gradient 12s ease infinite",
        beam: "beam 6s ease-in-out infinite",
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
