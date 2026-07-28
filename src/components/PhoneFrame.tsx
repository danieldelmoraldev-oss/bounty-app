import type { ReactNode } from "react";
import { ActiveTimers } from "@/components/ActiveTimers";

/**
 * Centered mobile-first frame. On mobile it fills the viewport, on desktop
 * it renders as a phone-shaped viewport centered on the page with ambient glow.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh w-full">
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.35_0.22_295_/_0.35),transparent_60%)] blur-3xl" />
      </div>
      <div className="relative mx-auto min-h-dvh w-full max-w-[440px] overflow-hidden md:my-8 md:min-h-[900px] md:rounded-[48px] md:border md:border-white/10 md:shadow-[0_40px_120px_-30px_oklch(0_0_0_/_0.8)]">
        
        {/* AQUI LO PONEMOS */}
        <ActiveTimers />
        
        {children}
      </div>
    </div>
  );
}
