import Link from 'next/link';

export function SectionHeading({
  eyebrow,
  title,
  viewAllHref,
  viewAllLabel,
}: {
  eyebrow: string;
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-label text-[10px] uppercase tracking-[0.3em] text-accent-bright">
          {eyebrow}
        </span>
        <h2 className="font-display text-3xl tracking-tight md:text-4xl">{title}</h2>
      </div>
      {viewAllHref && viewAllLabel && (
        <Link
          href={viewAllHref}
          className="whitespace-nowrap border-b border-transparent pb-1 font-label text-xs uppercase tracking-widest transition-colors hover:border-accent-bright hover:text-accent-bright"
        >
          {viewAllLabel}
        </Link>
      )}
    </div>
  );
}
