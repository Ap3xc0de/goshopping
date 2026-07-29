"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroCenteredProps {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryHref?: string;
  backgroundImage?: string;
  overlayOpacity?: number;
  minHeight?: string;
}

export function HeroCentered({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  ctaSecondaryLabel,
  ctaSecondaryHref,
  backgroundImage,
  overlayOpacity = 0.5,
  minHeight = "100vh",
}: HeroCenteredProps) {
  return (
    <section
      className="relative flex items-center justify-center w-full overflow-hidden"
      style={{ minHeight }}
    >
      {/* Background Image */}
      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div
            className="absolute inset-0 z-0 bg-black"
            style={{ opacity: overlayOpacity }}
          />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1
            className={cn(
              "font-bold tracking-tight mb-6",
              "text-5xl md:text-7xl",
              backgroundImage ? "text-white" : "text-foreground"
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "text-xl md:text-2xl mb-8 max-w-3xl mx-auto",
                backgroundImage ? "text-white/90" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white text-lg px-8 py-6"
            >
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
            {ctaSecondaryLabel && ctaSecondaryHref && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className={cn(
                  "text-lg px-8 py-6",
                  backgroundImage
                    ? "border-white text-white hover:bg-white hover:text-foreground"
                    : ""
                )}
              >
                <Link href={ctaSecondaryHref}>{ctaSecondaryLabel}</Link>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
