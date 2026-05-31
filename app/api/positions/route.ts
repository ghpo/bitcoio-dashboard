import { NextRequest, NextResponse } from 'next/server';
import { getOpenPositions, getAllPositions } from '@/lib/db';

export async function GET() {
  try {
    const positions = getOpenPositions();
    const all = getAllPositions();
    return NextResponse.json({ positions, all, count: positions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
