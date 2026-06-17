export const landingRoutes = [
  { href: "/", label: "Overview", eyebrow: "00" },
  { href: "/problem", label: "Problem", eyebrow: "01" },
  { href: "/agent-graph", label: "Graph", eyebrow: "02" },
  { href: "/multimodal", label: "Inputs", eyebrow: "03" },
  { href: "/explainability", label: "XAI", eyebrow: "04" },
  { href: "/security", label: "Security", eyebrow: "05" },
  { href: "/evaluation", label: "Evaluation", eyebrow: "06" },
] as const;

export type LandingRouteHref = (typeof landingRoutes)[number]["href"];
