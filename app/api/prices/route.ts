import { NextResponse } from 'next/server';
import { getAllPrices, getPrice, TRACKED_TOKENS } from '@/lib/bitflow-price';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  try {
    if (token && TRACKED_TOKENS[token]) {
      const price = await getPrice(token);
      return NextResponse.json({ price });
    }

    const prices = await getAllPrices();
    return NextResponse.json({ prices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
