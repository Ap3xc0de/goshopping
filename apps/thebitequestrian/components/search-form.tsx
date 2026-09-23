'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Locale } from '@/lib/i18n/dictionaries';

export function SearchForm({
  locale,
  placeholder,
}: {
  locale: Locale;
  placeholder: string;
}) {
  const [q, setQ] = useState('');
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/${locale}/catalog?search=${encodeURIComponent(query)}` : `/${locale}/catalog`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden min-w-0 max-w-[230px] flex-1 items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 sm:flex"
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent font-body text-[13px] text-foreground outline-none placeholder:text-muted"
      />
    </form>
  );
}
