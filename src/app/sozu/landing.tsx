"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { stagePath } from "@/games/sozu/copy";
import { lastOpenStage, loadProgress } from "@/games/sozu/progress";

export default function SozuLanding() {
  const router = useRouter();
  useEffect(() => {
    const p = loadProgress();
    router.replace(stagePath(Math.min(p.current, lastOpenStage(p.maxCleared))));
  }, [router]);
  return <div className="min-h-full bg-[#efe6d2]" />;
}
