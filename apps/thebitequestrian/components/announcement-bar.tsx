import type { Dictionary } from '@/lib/i18n/dictionaries';

export function AnnouncementBar({ dict }: { dict: Dictionary }) {
  const items = [
    dict.announcement.tagline,
    dict.announcement.house,
    dict.announcement.instagram,
  ];

  return (
    <div className="bg-surface text-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-7 gap-y-1 px-6 py-2 font-label text-[11px] uppercase tracking-widest">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-7">
            {i > 0 && (
              <span aria-hidden className="text-accent-bright">
                ·
              </span>
            )}
            <span>{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
