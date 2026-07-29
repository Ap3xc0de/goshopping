"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, StarHalf, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  imageAlt?: string;
  badge?: string;
  rating?: number;
  reviewCount?: number;
  variant?: "compact" | "expanded";
  onAddToCart?: (id: string) => void;
  href?: string;
}

export function ProductCard({
  id,
  name,
  price,
  originalPrice,
  image,
  imageAlt = "",
  badge,
  rating,
  reviewCount,
  variant = "expanded",
  onAddToCart,
  href,
}: ProductCardProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          className="w-4 h-4 fill-yellow-400 text-yellow-400"
        />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <StarHalf key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      );
    }
    return stars;
  };

  const CardContent = (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group h-full flex flex-col bg-card rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
    >
      {/* Image */}
      <div className="relative">
        <AspectRatio ratio={3 / 4}>
          <Image
            src={image}
            alt={imageAlt || name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </AspectRatio>
        {badge && (
          <Badge className="absolute top-2 left-2 bg-[hsl(var(--brand-accent))] text-white">
            {badge}
          </Badge>
        )}
        {/* Add to Cart Button - Desktop hover, Mobile always visible */}
        <div className="absolute bottom-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            aria-label="Agregar al carrito"
            className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(id);
            }}
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        <h3 className="font-semibold text-sm md:text-base mb-2 line-clamp-2">
          {name}
        </h3>

        {variant === "expanded" && rating !== undefined && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">{renderStars(rating)}</div>
            {reviewCount !== undefined && (
              <span className="text-xs text-muted-foreground ml-1">
                ({reviewCount})
              </span>
            )}
          </div>
        )}

        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="text-lg md:text-xl font-bold">
              {formatPrice(price)}
            </span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{CardContent}</Link>;
  }

  return CardContent;
}
