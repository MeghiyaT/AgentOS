"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, CircuitBoard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AuroraBackground } from "@/components/effects/AuroraBackground";
import { GradientMesh } from "@/components/effects/GradientMesh";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { buttonVariants } from "@/components/ui/button";
import { landingRoutes } from "@/lib/landing/routes";
import { cn } from "@/lib/utils";

interface LandingChromeProps {
  children: ReactNode;
}

function isActiveRoute(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function LandingChrome({ children }: LandingChromeProps) {
  const pathname = usePathname();

  return (
    <main className="agentos-page relative min-h-screen overflow-hidden">
      <GradientMesh className="fixed inset-0 opacity-70" />
      <AuroraBackground className="fixed inset-0" />
      <div className="agentos-grid pointer-events-none fixed inset-0 opacity-35" />
      <div className="agentos-noise" />

      <motion.header
        className="fixed left-1/2 top-4 z-40 w-[min(calc(100%-2rem),1180px)] -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <nav className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full px-2 text-sm font-semibold text-slate-50"
          >
            <span className="flex size-9 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10">
              <CircuitBoard className="size-4 text-cyan-200" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">AgentOS</span>
          </Link>

          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1 lg:flex">
            {landingRoutes.map((route) => {
              const active = isActiveRoute(pathname, route.href);

              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-semibold text-slate-400 transition hover:text-slate-100",
                    active &&
                      "bg-white/10 text-cyan-100 shadow-[0_0_22px_rgba(6,182,212,0.14)]",
                  )}
                >
                  <span className="mr-1 text-[10px] text-slate-600">
                    {route.eyebrow}
                  </span>
                  {route.label}
                </Link>
              );
            })}
          </div>

          <MagneticButton>
            <Link
              href="/workspace"
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-9 rounded-full border border-cyan-300/20 bg-cyan-300 px-4 font-semibold text-slate-950 hover:bg-cyan-200",
              )}
            >
              Workspace
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </MagneticButton>
        </nav>
      </motion.header>

      <div className="relative z-10">{children}</div>
    </main>
  );
}
