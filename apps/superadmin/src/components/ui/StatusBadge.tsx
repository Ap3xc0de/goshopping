import { classNames } from '@/lib/utils';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-800',
  blue:   'bg-blue-100 text-blue-800',
  gray:   'bg-gray-100 text-gray-700',
};

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        variantClasses[variant],
      )}
    >
      {label}
    </span>
  );
}
