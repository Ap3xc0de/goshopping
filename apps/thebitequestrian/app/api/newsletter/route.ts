import { NextResponse } from 'next/server';
import {
  subscribeNewsletter,
  ConflictError,
  ValidationError,
  RateLimitError,
} from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body.email !== 'string' || body.email.trim() === '') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  try {
    const result = await subscribeNewsletter(body.email.trim());
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
