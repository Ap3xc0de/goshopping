import Link from 'next/link';
import { Package } from 'lucide-react';
import { StockIndicator } from './StockIndicator';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const mainImage = product.images?.[0];

  return (
    <Link href={`/dashboard/products/${product.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-brand-300 hover:shadow-md transition-all">
        <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
          ) : (
            <Package className="h-12 w-12 text-gray-300" />
          )}
        </div>
        <div className="p-4">
          <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
          {product.sku && <p className="text-xs text-gray-400 mt-0.5">{product.sku}</p>}
          <div className="flex items-center justify-between mt-2">
            <span className="text-base font-bold text-brand-700">{formatCurrency(product.price)}</span>
            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
              product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {product.status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="mt-2">
            <StockIndicator stock={product.stock} minStock={product.min_stock} />
          </div>
        </div>
      </div>
    </Link>
  );
}
