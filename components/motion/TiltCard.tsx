"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  type SpringOptions,
} from "framer-motion";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

const tiltSpring: SpringOptions = {
  stiffness: 160,
  damping: 18,
  mass: 0.65,
};

export function TiltCard({ children, className, intensity = 8 }: TiltCardProps) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const smoothRotateX = useSpring(rotateX, tiltSpring);
  const smoothRotateY = useSpring(rotateY, tiltSpring);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = (event.clientX - rect.left) / rect.width - 0.5;
    const yPercent = (event.clientY - rect.top) / rect.height - 0.5;

    rotateX.set(-yPercent * intensity);
    rotateY.set(xPercent * intensity);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div className="h-full [perspective:1100px]">
      <motion.div
        className={cn("h-full will-change-transform", className)}
        style={{
          rotateX: smoothRotateX,
          rotateY: smoothRotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </motion.div>
    </div>
  );
}
