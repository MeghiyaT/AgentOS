"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { ANIMATION_CONFIGS } from "@/lib/utils/animations";
import { cn } from "@/lib/utils";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function RevealOnScroll({
  children,
  className,
  delay = 0,
}: RevealOnScrollProps) {
  return (
    <motion.div
      className={cn("will-change-transform", className)}
      initial={ANIMATION_CONFIGS.scrollReveal.initial}
      whileInView={ANIMATION_CONFIGS.scrollReveal.whileInView}
      viewport={ANIMATION_CONFIGS.scrollReveal.viewport}
      transition={{
        ...ANIMATION_CONFIGS.scrollReveal.transition,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
