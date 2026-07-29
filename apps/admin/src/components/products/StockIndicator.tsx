interface StockIndicatorProps {
  stock: number;
  minStock: number;
  showLabel?: boolean;
}

export function StockIndicator({ stock, minStock, showLabel = true }: StockIndicatorProps) {
  let color: string;
  let label: string;
  let barColor: string;

  if (stock === 0) {
    color = 'text-red-600';
    barColor = 'bg-red-500';
    label = 'Sin stock';
  } else if (stock <= minStock) {
    color = 'text-orange-600';
    barColor = 'bg-orange-400';
    label = 'Stock bajo';
  } else {
    color = 'text-green-700';
    barColor = 'bg-green-500';
    label = 'En stock';
  }

  const pct = minStock > 0 ? Math.min(100, (stock / (minStock * 3)) * 100) : 100;

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${color}`}>
          {label} <span className="text-gray-400">({stock})</span>
        </span>
      )}
    </div>
  );
}
