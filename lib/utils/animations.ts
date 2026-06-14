import type { Variants } from "framer-motion";

import { createMotionSpring } from "@/lib/utils/spring";

const standardEase = [0.16, 1, 0.3, 1] as const;
const slideEase = [0.65, 0, 0.35, 1] as const;

export const ANIMATION_CONFIGS = {
  scrollReveal: {
    initial: { opacity: 0, y: 60, filter: "blur(14px)" },
    whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.8, ease: standardEase },
  },
  staggerContainer: {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.08,
      },
    },
  } satisfies Variants,
  staggerItem: {
    hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.6, ease: standardEase },
    },
  } satisfies Variants,
  magneticButton: {
    dragConstraints: { left: -20, right: 20, top: -20, bottom: 20 },
    transition: createMotionSpring(150, 15),
  },
  agentPulse: {
    animate: {
      scale: [1, 1.08, 1],
      opacity: [0.62, 0.94, 0.62],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  glowEffect: {
    animate: {
      boxShadow: [
        "0 0 4px var(--glow-color)",
        "0 0 18px var(--glow-color)",
        "0 0 4px var(--glow-color)",
      ],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  countUp: {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1.5, ease: slideEase },
  },
} as const;

export type AnimationConfigs = typeof ANIMATION_CONFIGS;
