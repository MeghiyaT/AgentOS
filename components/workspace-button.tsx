"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function WorkspaceButton() {
  const router = useRouter();

  return (
    <Button
      size="lg"
      className="h-10 bg-sky-300 px-4 text-slate-950 hover:bg-sky-200"
      onClick={() => router.push("/workspace")}
    >
      Open workspace
      <ArrowRight className="size-4" aria-hidden="true" />
    </Button>
  );
}
