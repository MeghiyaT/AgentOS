import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { landingRoutes, type LandingRouteHref } from "@/lib/landing/routes";

interface StoryNavigationProps {
  currentHref: LandingRouteHref;
}

export function StoryNavigation({ currentHref }: StoryNavigationProps) {
  const currentIndex = landingRoutes.findIndex((route) => route.href === currentHref);
  const previousRoute = landingRoutes[currentIndex - 1];
  const nextRoute = landingRoutes[currentIndex + 1] ?? {
    href: "/workspace",
    label: "Workspace",
    eyebrow: "Live",
  };

  return (
    <section className="px-5 pb-16 pt-2 sm:px-8 lg:px-12">
      <GlassPanel className="mx-auto grid max-w-7xl gap-3 p-4 md:grid-cols-2">
        {previousRoute ? (
          <Link
            href={previousRoute.href}
            className="group rounded-3xl border border-white/10 bg-slate-950/45 p-5 transition hover:border-violet-300/30 hover:bg-violet-300/10"
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              <ArrowLeft
                className="size-4 transition group-hover:-translate-x-1"
                aria-hidden="true"
              />
              Previous
            </p>
            <p className="mt-3 text-xl font-semibold text-slate-50">
              {previousRoute.label}
            </p>
          </Link>
        ) : (
          <div />
        )}

        <Link
          href={nextRoute.href}
          className="group rounded-3xl border border-white/10 bg-slate-950/45 p-5 text-right transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
        >
          <p className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Next
            <ArrowRight
              className="size-4 transition group-hover:translate-x-1"
              aria-hidden="true"
            />
          </p>
          <p className="mt-3 text-xl font-semibold text-slate-50">
            {nextRoute.label}
          </p>
        </Link>
      </GlassPanel>
    </section>
  );
}
