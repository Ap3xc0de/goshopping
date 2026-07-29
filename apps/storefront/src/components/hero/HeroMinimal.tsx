"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroMinimalProps {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
  backgroundColor?: string;
  textColor?: string;
}

export function HeroMinimal({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  backgroundColor = "bg-[hsl(var(--brand-primary))]",
  textColor = "text-white",
}: HeroMinimalProps) {
  return (
    <section
      className={cn(
        "w-full py-16 md:py-24 lg:py-32",
        backgroundColor
      )}
    >
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <h1
            className={cn(
              "text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6",
              textColor
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className={cn("text-lg md:text-xl mb-8 max-w-3xl mx-auto", textColor, "opacity-90")}>
              {subtitle}
            </p>
          )}
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="text-lg px-8 py-6"
          >
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
