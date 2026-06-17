"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface AuroraBackgroundProps {
  className?: string;
}

export function AuroraBackground({ className }: AuroraBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const context = gsap.context(() => {
      gsap.to(".aurora-orb", {
        xPercent: 16,
        yPercent: -10,
        scale: 1.16,
        duration: 16,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: {
          each: 2.8,
          repeat: -1,
          yoyo: true,
        },
      });
    }, rootRef);

    return () => context.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <span className="aurora-orb absolute -left-24 top-16 size-[34rem] rounded-full bg-violet-500/20 blur-3xl" />
      <span className="aurora-orb absolute right-[-10rem] top-1/4 size-[30rem] rounded-full bg-cyan-400/16 blur-3xl" />
      <span className="aurora-orb absolute bottom-[-12rem] left-1/3 size-[28rem] rounded-full bg-emerald-400/10 blur-3xl" />
    </div>
  );
}
