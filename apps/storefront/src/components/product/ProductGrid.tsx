import { ProductCard, ProductCardProps } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  products: ProductCardProps[];
  columns?: 2 | 3 | 4;
  loading?: boolean;
  skeletonCount?: number;
}

function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-lg overflow-hidden border">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3 mt-2" />
      </div>
    </div>
  );
}

export function ProductGrid({
  products,
  columns = 3,
  loading = false,
  skeletonCount = 6,
}: ProductGridProps) {
  const gridColsClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  if (loading) {
    return (
      <div className={cn("grid gap-6", gridColsClass[columns])}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", gridColsClass[columns])}>
      {products.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
}
