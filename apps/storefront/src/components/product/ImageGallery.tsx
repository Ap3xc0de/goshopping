"use client";

import { useState } from "react";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

interface ImageGalleryImage {
  src: string;
  alt?: string;
}

interface ImageGalleryProps {
  images: ImageGalleryImage[];
  aspectRatio?: "square" | "portrait" | "landscape";
}

const aspectRatios = {
  square: 1 / 1,
  portrait: 3 / 4,
  landscape: 16 / 9,
};

export function ImageGallery({
  images,
  aspectRatio = "portrait",
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative overflow-hidden rounded-lg group">
        <AspectRatio ratio={aspectRatios[aspectRatio]}>
          <Image
            src={images[selectedIndex].src}
            alt={images[selectedIndex].alt || `Image ${selectedIndex + 1}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority
          />
        </AspectRatio>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                selectedIndex === index
                  ? "border-[hsl(var(--brand-primary))] ring-2 ring-[hsl(var(--brand-primary))]/20"
                  : "border-transparent hover:border-gray-300"
              )}
            >
              <Image
                src={image.src}
                alt={image.alt || `Thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
