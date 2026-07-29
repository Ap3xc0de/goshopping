"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroVideoProps {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
  videoSrc: string;
  fallbackImage?: string;
  overlayOpacity?: number;
}

export function HeroVideo({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  videoSrc,
  fallbackImage,
  overlayOpacity = 0.6,
}: HeroVideoProps) {
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        setVideoError(true);
      });
    }
  }, []);

  return (
    <section className="relative w-full h-[80vh] md:h-[90vh] overflow-hidden">
      {/* Video or Fallback */}
      {!videoError ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover z-0"
          muted
          autoPlay
          loop
          playsInline
          onError={() => setVideoError(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : fallbackImage ? (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${fallbackImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}

      {/* Overlay */}
      <div
        className="absolute inset-0 z-0 bg-black"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-bold tracking-tight text-white mb-6 text-4xl md:text-6xl lg:text-7xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
                {subtitle}
              </p>
            )}
            <Button
              asChild
              size="lg"
              className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white text-lg px-8 py-6"
            >
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
