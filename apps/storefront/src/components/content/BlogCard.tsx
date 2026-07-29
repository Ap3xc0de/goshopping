import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Calendar, Clock } from "lucide-react";

interface BlogCardProps {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  author: {
    name: string;
    avatar?: string;
  };
  href: string;
  readTime?: string;
}

export function BlogCard({
  title,
  excerpt,
  image,
  category,
  date,
  author,
  href,
  readTime,
}: BlogCardProps) {
  return (
    <Link
      href={href}
      className="group block bg-card rounded-lg overflow-hidden border hover:shadow-lg transition-all"
    >
      {/* Image */}
      <AspectRatio ratio={16 / 9}>
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </AspectRatio>

      {/* Content */}
      <div className="p-6">
        {/* Category Badge */}
        <Badge
          variant="secondary"
          className="mb-3 bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/20"
        >
          {category}
        </Badge>

        {/* Title */}
        <h3 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-[hsl(var(--brand-primary))] transition-colors">
          {title}
        </h3>

        {/* Excerpt */}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {excerpt}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {author.avatar && (
                <AvatarImage src={author.avatar} alt={author.name} />
              )}
              <AvatarFallback>
                {author.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{author.name}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{date}</span>
            </div>
            {readTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{readTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
