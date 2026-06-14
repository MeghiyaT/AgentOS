"use client";

import gsap from "gsap";
import Lenis from "lenis";
import { type ReactNode, useEffect } from "react";

interface AppMotionProviderProps {
  children: ReactNode;
}

export function AppMotionProvider({ children }: AppMotionProviderProps) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.12,
      easing: (time: number) => 1 - Math.pow(1 - time, 3),
      smoothWheel: true,
      wheelMultiplier: 0.88,
    });

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return children;
}
