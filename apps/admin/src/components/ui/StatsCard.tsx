interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  alert?: boolean;
  icon?: React.ReactNode;
}

export function StatsCard({ title, value, subtitle, alert, icon }: StatsCardProps) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        alert ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <p className={`text-sm font-medium ${alert ? 'text-orange-700' : 'text-gray-500'}`}>
          {title}
        </p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-bold ${alert ? 'text-orange-900' : 'text-gray-900'}`}>
        {value}
      </p>
      {subtitle && (
        <p className={`mt-1 text-xs ${alert ? 'text-orange-600' : 'text-gray-400'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
