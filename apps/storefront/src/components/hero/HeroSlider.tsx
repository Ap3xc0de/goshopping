"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import Autoplay from "embla-carousel-autoplay";

interface Slide {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
  backgroundImage: string;
  overlayOpacity?: number;
}

interface HeroSliderProps {
  slides: Slide[];
  autoPlayInterval?: number;
}

export function HeroSlider({
  slides,
  autoPlayInterval = 5000,
}: HeroSliderProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <section className="relative w-full">
      <Carousel
        setApi={setApi}
        plugins={[
          Autoplay({
            delay: autoPlayInterval,
          }),
        ]}
        opts={{
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="relative h-[70vh] md:h-[80vh] lg:h-[90vh] w-full">
                {/* Background Image */}
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundImage: `url(${slide.backgroundImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div
                  className="absolute inset-0 z-0 bg-black"
                  style={{ opacity: slide.overlayOpacity ?? 0.5 }}
                />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-center h-full">
                  <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="font-bold tracking-tight text-white mb-6 text-4xl md:text-6xl lg:text-7xl">
                      {slide.title}
                    </h1>
                    {slide.subtitle && (
                      <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
                        {slide.subtitle}
                      </p>
                    )}
                    <Button
                      asChild
                      size="lg"
                      className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white text-lg px-8 py-6"
                    >
                      <Link href={slide.ctaHref}>{slide.ctaLabel}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Dot Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                current === index
                  ? "w-8 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </Carousel>
    </section>
  );
}
