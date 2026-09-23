'use client';

import { useState, type FormEvent } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';

type Status = 'idle' | 'pending' | 'success' | 'error';

export function NewsletterForm({ dict }: { dict: Dictionary }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('pending');
    setMessage(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 201) {
        setStatus('success');
        setMessage(dict.footer.subscribeSuccess);
        setEmail('');
        return;
      }
      if (res.status === 409) {
        setStatus('error');
        setMessage(dict.footer.subscribeErrorDuplicate);
        return;
      }
      if (res.status === 400) {
        setStatus('error');
        setMessage(dict.footer.subscribeErrorInvalid);
        return;
      }
      setStatus('error');
      setMessage(dict.footer.subscribeErrorGeneric);
    } catch {
      setStatus('error');
      setMessage(dict.footer.subscribeErrorGeneric);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={dict.footer.emailPlaceholder}
          aria-label={dict.footer.emailPlaceholder}
          required
          className="w-full rounded-sm rounded-r-none border border-border bg-background px-3 py-2.5 font-body text-[13px] text-foreground outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={status === 'pending'}
          className="whitespace-nowrap rounded-sm rounded-l-none bg-foreground px-4 py-2.5 font-label text-xs uppercase tracking-widest text-background transition-colors hover:bg-accent-bright hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'pending' ? dict.footer.subscribing : dict.footer.subscribe}
        </button>
      </div>
      {message && (
        <span
          className={`font-body text-[12px] ${status === 'success' ? 'text-accent-bright' : 'text-red-400'}`}
        >
          {message}
        </span>
      )}
    </form>
  );
}
