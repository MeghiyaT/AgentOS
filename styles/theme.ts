export const THEME = {
  colors: {
    bg: {
      primary: "#050816",
      secondary: "#0A0F26",
      accent: "#0D132F",
    },
    primary: "#7C3AED",
    secondary: "#06B6D4",
    accent: "#22C55E",
    danger: "#EF4444",
    warning: "#F59E0B",
    neutral: {
      100: "#1E2340",
      200: "#2A3155",
      300: "#3D456F",
    },
    glow: {
      primary: "rgba(124, 58, 237, 0.4)",
      secondary: "rgba(6, 182, 212, 0.4)",
      green: "rgba(34, 197, 94, 0.4)",
      red: "rgba(239, 68, 68, 0.4)",
    },
  },
  gradients: {
    auroraPrimary:
      "linear-gradient(180deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.1) 100%)",
    auroraSecondary:
      "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(236,72,153,0.05) 100%)",
    button: "linear-gradient(90deg, #7C3AED, #C084FC)",
    card: "linear-gradient(180deg, rgba(30,35,64,0.8) 0%, rgba(42,49,85,0.6) 100%)",
  },
  easing: {
    standard: "cubic-bezier(0.16, 1, 0.3, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    slide: "cubic-bezier(0.65, 0, 0.35, 1)",
    easeOutBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

export type Theme = typeof THEME;
