import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FooterCTA() {
  return (
    <section className="relative z-10 px-5 pb-16 pt-12 sm:px-8 lg:px-12">
      <GlassPanel className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 p-8 md:flex-row md:items-center lg:p-10">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-violet-200">
            <Sparkles className="size-4" aria-hidden="true" />
            Demo moment
          </div>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-50 md:text-5xl">
            Enter the control center and run the agent system.
          </h2>
        </div>
        <MagneticButton>
          <Link
            href="/workspace"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 rounded-full border border-cyan-300/20 bg-cyan-300 px-6 font-semibold text-slate-950 shadow-[0_0_42px_rgba(6,182,212,0.28)] hover:bg-cyan-200",
            )}
          >
            Launch Workspace
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </MagneticButton>
      </GlassPanel>
    </section>
  );
}
