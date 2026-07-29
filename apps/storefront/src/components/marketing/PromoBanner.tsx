"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PromoBannerProps {
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  dismissible?: boolean;
  bgColor?: string;
}

export function PromoBanner({
  message,
  ctaLabel,
  ctaHref,
  dismissible = true,
  bgColor = "bg-[hsl(var(--brand-accent))]",
}: PromoBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className={cn("relative w-full py-3 px-4", bgColor)}>
      <div className="mx-auto max-w-screen-xl flex items-center justify-center gap-4">
        <p className="text-sm md:text-base text-white font-medium text-center">
          {message}
        </p>
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="text-sm font-semibold text-white underline underline-offset-4 hover:no-underline"
          >
            {ctaLabel}
          </Link>
        )}
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
