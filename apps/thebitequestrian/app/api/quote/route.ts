import { NextResponse } from 'next/server';
import type { QuoteRequest } from '@/lib/api/types';
import { quote, NotFoundError } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: QuoteRequest;
  try {
    body = (await request.json()) as QuoteRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items is required' }, { status: 400 });
  }

  try {
    const result = await quote(body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Quote failed' }, { status: 500 });
  }
}
