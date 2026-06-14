import type { ReactNode } from "react";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  meta?: ReactNode;
}

export function PageHero({ eyebrow, title, description, meta }: PageHeroProps) {
  return (
    <section className="px-5 pb-8 pt-36 sm:px-8 lg:px-12">
      <RevealOnScroll className="mx-auto max-w-7xl">
        <GlassPanel className="p-7 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.55fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">
                {eyebrow}
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-slate-50 md:text-6xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
                {description}
              </p>
            </div>
            {meta ? (
              <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 text-sm leading-6 text-slate-400">
                {meta}
              </div>
            ) : null}
          </div>
        </GlassPanel>
      </RevealOnScroll>
    </section>
  );
}
