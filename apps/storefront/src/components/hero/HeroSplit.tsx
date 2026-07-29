"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroSplitProps {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryHref?: string;
  image: string;
  imageAlt?: string;
  imagePosition?: "left" | "right";
}

export function HeroSplit({
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaSecondaryLabel,
  ctaSecondaryHref,
  image,
  imageAlt = "",
  imagePosition = "right",
}: HeroSplitProps) {
  const textContent = (
    <motion.div
      initial={{ opacity: 0, x: imagePosition === "right" ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="flex flex-col justify-center"
    >
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
        {title}
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
        {description}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          asChild
          size="lg"
          className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white text-lg px-8"
        >
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
        {ctaSecondaryLabel && ctaSecondaryHref && (
          <Button asChild size="lg" variant="outline" className="text-lg px-8">
            <Link href={ctaSecondaryHref}>{ctaSecondaryLabel}</Link>
          </Button>
        )}
      </div>
    </motion.div>
  );

  const imageContent = (
    <motion.div
      initial={{ opacity: 0, x: imagePosition === "right" ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className="relative aspect-square md:aspect-auto md:h-full"
    >
      <Image
        src={image}
        alt={imageAlt}
        fill
        className="object-cover rounded-lg"
        priority
      />
    </motion.div>
  );

  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "grid gap-8 lg:gap-12 items-center",
            "grid-cols-1 md:grid-cols-2"
          )}
        >
          {imagePosition === "left" ? (
            <>
              {imageContent}
              {textContent}
            </>
          ) : (
            <>
              {textContent}
              {imageContent}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
