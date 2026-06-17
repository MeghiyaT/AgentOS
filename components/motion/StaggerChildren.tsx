"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { ANIMATION_CONFIGS } from "@/lib/utils/animations";
import { cn } from "@/lib/utils";

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
}

export function StaggerChildren({ children, className }: StaggerChildrenProps) {
  return (
    <motion.div
      className={cn("will-change-transform", className)}
      variants={ANIMATION_CONFIGS.staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: StaggerChildrenProps) {
  return (
    <motion.div
      className={cn("will-change-transform", className)}
      variants={ANIMATION_CONFIGS.staggerItem}
    >
      {children}
    </motion.div>
  );
}
