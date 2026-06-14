"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface ParticleOrbProps {
  className?: string;
  particleCount?: number;
}

const particleSeeds = Array.from({ length: 34 }, (_, index) => ({
  id: `particle-${index}`,
  left: `${(index * 29) % 100}%`,
  top: `${(index * 47) % 100}%`,
  delay: (index % 8) * 0.22,
  travel: 12 + (index % 6) * 5,
}));

export function ParticleOrb({
  className,
  particleCount = 28,
}: ParticleOrbProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10 bg-cyan-300/[0.03] blur-[0.5px]" />
      {particleSeeds.slice(0, particleCount).map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute size-1 rounded-full bg-cyan-200/70 shadow-[0_0_18px_rgba(6,182,212,0.75)]"
          style={{ left: particle.left, top: particle.top }}
          animate={{
            opacity: [0.08, 0.72, 0.08],
            scale: [0.8, 1.4, 0.8],
            y: [0, -particle.travel, 0],
          }}
          transition={{
            duration: 4.8 + particle.delay,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
