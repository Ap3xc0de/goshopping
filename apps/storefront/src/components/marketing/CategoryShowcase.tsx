import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Category {
  name: string;
  image: string;
  href: string;
  productCount?: number;
}

interface CategoryShowcaseProps {
  categories: Category[];
  columns?: 2 | 3 | 4 | 6;
}

export function CategoryShowcase({
  categories,
  columns = 3,
}: CategoryShowcaseProps) {
  const gridColsClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <section className="w-full py-12 md:py-16">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Explora por categoría
        </h2>

        <div className={cn("grid gap-4 md:gap-6", gridColsClass[columns])}>
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group relative overflow-hidden rounded-lg aspect-square"
            >
              {/* Background Image */}
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/50" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                <h3 className="text-xl md:text-2xl font-bold text-center mb-2">
                  {category.name}
                </h3>
                {category.productCount !== undefined && (
                  <p className="text-sm text-white/90">
                    {category.productCount} productos
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
